import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getUserFromRequest } from '@/lib/api-auth';

const PAYMENTS_FILE = path.join(process.cwd(), 'billing-payments.json');
const CUSTOMERS_FILE = path.join(process.cwd(), 'customer-data.json');
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        // Load data
        const [paymentsData, customersData, usersDataRaw] = await Promise.all([
            fs.readFile(PAYMENTS_FILE, 'utf8').then(JSON.parse).catch(() => []),
            fs.readFile(CUSTOMERS_FILE, 'utf8').then(JSON.parse).catch(() => ({})),
            fs.readFile(USERS_FILE, 'utf8').then(JSON.parse).catch(() => ({ users: [] }))
        ]);

        // Handle users data format (could be { users: [...] } or direct [...])
        const usersData = Array.isArray(usersDataRaw) ? usersDataRaw : (usersDataRaw.users || []);

        // Get current user using proper auth helper
        const currentUser = await getUserFromRequest(request);

        console.log('Agent Stats - Current User:', currentUser);

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Filter payments by date if provided (using Asia/Jakarta timezone)
        let filteredPayments = paymentsData;
        if (month && year) {
            filteredPayments = paymentsData.filter(p => {
                const paymentDate = new Date(p.date);
                const jakartaDate = new Date(paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                return jakartaDate.getMonth() === parseInt(month) && jakartaDate.getFullYear() === parseInt(year);
            });
        }

        // Helper to get customer data
        const getCustomer = (username) => customersData[username];
        // Helper to get user data
        const getUser = (userId) => usersData.find(u => u.id === userId);

        // Debug logging
        console.log('=== Agent Stats Debug ===');
        console.log('Filtered Payments Count:', filteredPayments.length);
        console.log('Customers Count:', Object.keys(customersData).length);
        console.log('Users Count:', usersData.length);

        // Calculate Stats
        if (currentUser.role === 'admin') {
            // Admin View: All Partners (combined agent + technician)
            const partnerStats = {};
            let grandTotalRevenue = 0;
            let grandTotalCommission = 0;

            filteredPayments.forEach(p => {
                const customer = getCustomer(p.username);
                if (customer) {
                    const amount = parseFloat(p.amount) || 0;
                    let countedRevenue = false;

                    // Check Agent
                    if (customer.agentId) {
                        const agent = getUser(customer.agentId);
                        if (agent) {
                            if (!partnerStats[agent.id]) {
                                // Calculate combined rate if same person is agent and technician
                                let combinedRate = agent.agentRate || 0;
                                if (agent.technicianRate) {
                                    combinedRate += agent.technicianRate;
                                }

                                partnerStats[agent.id] = {
                                    id: agent.id,
                                    name: agent.fullName || agent.username,
                                    role: 'partner',
                                    agentRate: agent.agentRate || 0,
                                    technicianRate: agent.technicianRate || 0,
                                    rate: combinedRate,
                                    paidCount: 0,
                                    unpaidCount: 0,
                                    totalRevenue: 0,
                                    commission: 0
                                };
                            }

                            if (p.status === 'completed') {
                                const comm = (amount * (agent.agentRate || 0)) / 100;
                                partnerStats[agent.id].commission += comm;
                                partnerStats[agent.id].totalRevenue += amount;
                                grandTotalCommission += comm;
                                countedRevenue = true;
                            }
                        }
                    }

                    // Check Technician
                    if (customer.technicianId) {
                        const tech = getUser(customer.technicianId);
                        if (tech) {
                            if (!partnerStats[tech.id]) {
                                // Calculate combined rate if same person is agent and technician
                                let combinedRate = tech.technicianRate || 0;
                                if (tech.agentRate) {
                                    combinedRate += tech.agentRate;
                                }

                                partnerStats[tech.id] = {
                                    id: tech.id,
                                    name: tech.fullName || tech.username,
                                    role: 'partner',
                                    agentRate: tech.agentRate || 0,
                                    technicianRate: tech.technicianRate || 0,
                                    rate: combinedRate,
                                    paidCount: 0,
                                    unpaidCount: 0,
                                    totalRevenue: 0,
                                    commission: 0
                                };
                            }

                            if (p.status === 'completed') {
                                const comm = (amount * (tech.technicianRate || 0)) / 100;
                                partnerStats[tech.id].commission += comm;
                                // Only add to revenue if not already counted (when same person is agent and tech)
                                if (!countedRevenue || customer.agentId !== customer.technicianId) {
                                    if (!countedRevenue) {
                                        partnerStats[tech.id].totalRevenue += amount;
                                    }
                                }
                                grandTotalCommission += comm;
                            }
                        }
                    }

                    if (p.status === 'completed') {
                        grandTotalRevenue += amount;
                    }
                } else {
                    if (p.status === 'completed') {
                        grandTotalRevenue += parseFloat(p.amount) || 0;
                    }
                }
            });

            // Calculate Paid/Unpaid counts
            filteredPayments.forEach(p => {
                const customer = getCustomer(p.username);
                if (customer) {
                    // Count for partner (could be agent, technician, or both)
                    const partnerId = customer.agentId || customer.technicianId;
                    if (partnerId && partnerStats[partnerId]) {
                        if (p.status === 'completed') {
                            partnerStats[partnerId].paidCount += 1;
                        } else {
                            partnerStats[partnerId].unpaidCount += 1;
                        }
                    }
                }
            });

            return NextResponse.json({
                role: 'admin',
                agents: Object.values(partnerStats),
                grandTotal: {
                    revenue: grandTotalRevenue,
                    commission: grandTotalCommission,
                    netRevenue: grandTotalRevenue - grandTotalCommission
                },
                _debug: {
                    filteredPaymentsCount: filteredPayments.length,
                    customersCount: Object.keys(customersData).length,
                    usersCount: usersData.length,
                    customers: customersData,
                    users: usersData.map(u => ({ id: u.id, username: u.username, role: u.role, agentRate: u.agentRate })),
                    payments: filteredPayments.slice(0, 10).map(p => ({ username: p.username, amount: p.amount, status: p.status }))
                }
            });

        } else if (currentUser.role === 'partner' || currentUser.role === 'agent' || currentUser.role === 'technician') {
            // Partner View
            const fullUser = getUser(currentUser.id) || currentUser;

            // Determine capabilities based on role or flags
            const isAgent = fullUser.isAgent || fullUser.role === 'agent' || fullUser.role === 'partner';
            const isTechnician = fullUser.isTechnician || fullUser.role === 'technician';

            const myStats = {
                totalRevenue: 0,
                commission: 0,
                paidCount: 0,
                unpaidCount: 0
            };

            filteredPayments.forEach(p => {
                const customer = getCustomer(p.username);
                if (customer) {
                    const amount = parseFloat(p.amount) || 0;
                    let countedRevenue = false;

                    // Check Agent Commission
                    if (isAgent && customer.agentId === currentUser.id) {
                        if (p.status === 'completed') {
                            myStats.commission += (amount * (fullUser.agentRate || 0)) / 100;
                            myStats.totalRevenue += amount;
                            countedRevenue = true;
                            myStats.paidCount += 1;
                        } else {
                            myStats.unpaidCount += 1;
                        }
                    }

                    // Check Technician Commission
                    if (isTechnician && customer.technicianId === currentUser.id) {
                        if (p.status === 'completed') {
                            myStats.commission += (amount * (fullUser.technicianRate || 0)) / 100;
                            // Avoid double counting revenue if same person is agent & tech
                            if (!countedRevenue || customer.agentId !== customer.technicianId) {
                                if (!countedRevenue) {
                                    myStats.totalRevenue += amount;
                                    myStats.paidCount += 1;
                                }
                            }
                        } else {
                            // Only count unpaid if not already counted as agent
                            if (!isAgent || customer.agentId !== customer.technicianId) {
                                myStats.unpaidCount += 1;
                            }
                        }
                    }
                }
            });

            return NextResponse.json({
                role: 'partner',
                stats: myStats
            });
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
