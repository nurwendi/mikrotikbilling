import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

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

        // Get current user from cookie (mocking auth check for now, ideally use a helper)
        const authToken = request.cookies.get('auth_token');
        let currentUser = null;
        if (authToken) {
            try {
                currentUser = JSON.parse(authToken.value);
            } catch (e) { }
        }

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Filter payments by date if provided (using Asia/Jakarta timezone)
        let filteredPayments = paymentsData;
        if (month && year) {
            filteredPayments = paymentsData.filter(p => {
                // Convert payment date to Jakarta timezone
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
        console.log('Customers Data:', JSON.stringify(customersData, null, 2));
        console.log('Users Data:', JSON.stringify(usersData, null, 2));

        // Check payments with customer data
        filteredPayments.forEach(p => {
            const customer = getCustomer(p.username);
            console.log(`Payment ${p.username}: customer=${JSON.stringify(customer)}, agentId=${customer?.agentId}, technicianId=${customer?.technicianId}`);
        });

        // Calculate Stats
        if (currentUser.role === 'admin') {
            // Admin View: All Agents/Partners
            const agentStats = {};
            let grandTotalRevenue = 0;
            let grandTotalCommission = 0;

            filteredPayments.forEach(p => {
                const customer = getCustomer(p.username);
                if (customer) {
                    const amount = parseFloat(p.amount) || 0;
                    let hasPartner = false;

                    // Check Agent
                    if (customer.agentId) {
                        const agent = getUser(customer.agentId);
                        if (agent) {
                            if (!agentStats[agent.id]) {
                                agentStats[agent.id] = {
                                    id: agent.id,
                                    name: agent.username,
                                    role: agent.role, // Include role
                                    rate: agent.agentRate || 0, // Display agent rate primarily
                                    paidCount: 0,
                                    unpaidCount: 0,
                                    totalRevenue: 0,
                                    commission: 0
                                };
                            }

                            // Commission for Agent role
                            if (p.status === 'completed') {
                                const comm = (amount * (agent.agentRate || 0)) / 100;
                                agentStats[agent.id].commission += comm;
                                agentStats[agent.id].totalRevenue += amount;
                                grandTotalCommission += comm;
                            }
                            hasPartner = true;
                        }
                    }

                    // Check Technician (could be same person)
                    if (customer.technicianId) {
                        const tech = getUser(customer.technicianId);
                        if (tech) {
                            if (!agentStats[tech.id]) {
                                agentStats[tech.id] = {
                                    id: tech.id,
                                    name: tech.username,
                                    role: tech.role, // Include role
                                    rate: tech.technicianRate || 0,
                                    paidCount: 0,
                                    unpaidCount: 0,
                                    totalRevenue: 0,
                                    commission: 0
                                };
                            }

                            // Commission for Technician role
                            if (p.status === 'completed') {
                                const comm = (amount * (tech.technicianRate || 0)) / 100;
                                agentStats[tech.id].commission += comm;
                                // Avoid double counting revenue if same person is agent and tech
                                if (customer.agentId !== customer.technicianId) {
                                    agentStats[tech.id].totalRevenue += amount;
                                }
                                grandTotalCommission += comm;
                            }
                            hasPartner = true;
                        }
                    }

                    if (hasPartner && p.status === 'completed') {
                        // Only add to grand total revenue once per payment
                        grandTotalRevenue += amount;
                    } else if (!hasPartner && p.status === 'completed') {
                        grandTotalRevenue += amount;
                    }
                } else {
                    // Direct sales (no agent)
                    if (p.status === 'completed') {
                        grandTotalRevenue += parseFloat(p.amount) || 0;
                    }
                }
            });

            // Calculate Paid/Unpaid counts
            filteredPayments.forEach(p => {
                const customer = getCustomer(p.username);
                if (customer) {
                    // Check Agent
                    if (customer.agentId && agentStats[customer.agentId]) {
                        if (p.status === 'completed') {
                            agentStats[customer.agentId].paidCount += 1;
                        } else {
                            agentStats[customer.agentId].unpaidCount += 1;
                        }
                    }
                    // Check Technician
                    if (customer.technicianId && agentStats[customer.technicianId]) {
                        // Avoid double counting if agent and technician are the same person for the same payment
                        if (customer.agentId !== customer.technicianId || !customer.agentId) {
                            if (p.status === 'completed') {
                                agentStats[customer.technicianId].paidCount += 1;
                            } else {
                                agentStats[customer.technicianId].unpaidCount += 1;
                            }
                        }
                    }
                }
            });


            return NextResponse.json({
                role: 'admin',
                agents: Object.values(agentStats),
                grandTotal: {
                    revenue: grandTotalRevenue,
                    commission: grandTotalCommission,
                    netRevenue: grandTotalRevenue - grandTotalCommission
                }
            });

        } else if (currentUser.role === 'partner' || currentUser.isAgent || currentUser.isTechnician) {
            // Partner View: Specific Partner
            const myStats = {
                totalRevenue: 0,
                commission: 0,
                paidCount: 0,
                unpaidCount: 0
            };

            const myCustomers = new Set();

            filteredPayments.forEach(p => {
                const customer = getCustomer(p.username);
                if (customer) {
                    const amount = parseFloat(p.amount) || 0;
                    let isMySale = false;

                    // Agent Commission
                    if (customer.agentId === currentUser.id && currentUser.isAgent) {
                        if (p.status === 'completed') {
                            myStats.commission += (amount * (currentUser.agentRate || 0)) / 100;
                            myStats.totalRevenue += amount;
                        }
                        isMySale = true;
                    }

                    // Technician Commission
                    if (customer.technicianId === currentUser.id && currentUser.isTechnician) {
                        if (p.status === 'completed') {
                            myStats.commission += (amount * (currentUser.technicianRate || 0)) / 100;
                            // Avoid double counting revenue if I am both
                            if (customer.agentId !== currentUser.id) {
                                myStats.totalRevenue += amount;
                            }
                        }
                        isMySale = true;
                    }

                    if (isMySale) {
                        myCustomers.add(p.username);
                    }
                }
            });

            // Count customers
            let paidCount = 0;
            let unpaidCount = 0;

            Object.values(customersData).forEach(c => {
                if (c.agentId === currentUser.id || c.technicianId === currentUser.id) {
                    // Check if they paid in this month
                    const hasPaid = filteredPayments.some(p => p.username === c.username && p.status === 'completed');
                    if (hasPaid) paidCount++;
                    else unpaidCount++;
                }
            });

            myStats.paidCount = paidCount;
            myStats.unpaidCount = unpaidCount;

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
