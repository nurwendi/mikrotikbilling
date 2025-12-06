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
                                    role: agent.role,
                                    rate: agent.agentRate || 0,
                                    paidCount: 0,
                                    unpaidCount: 0,
                                    totalRevenue: 0,
                                    commission: 0
                                };
                            }

                            if (p.status === 'completed') {
                                const comm = (amount * (agent.agentRate || 0)) / 100;
                                agentStats[agent.id].commission += comm;
                                agentStats[agent.id].totalRevenue += amount;
                                grandTotalCommission += comm;
                            }
                            hasPartner = true;
                        }
                    }

                    // Check Technician
                    if (customer.technicianId) {
                        const tech = getUser(customer.technicianId);
                        if (tech) {
                            if (!agentStats[tech.id]) {
                                agentStats[tech.id] = {
                                    id: tech.id,
                                    name: tech.username,
                                    role: tech.role,
                                    rate: tech.technicianRate || 0,
                                    paidCount: 0,
                                    unpaidCount: 0,
                                    totalRevenue: 0,
                                    commission: 0
                                };
                            }

                            if (p.status === 'completed') {
                                const comm = (amount * (tech.technicianRate || 0)) / 100;
                                agentStats[tech.id].commission += comm;
                                if (customer.agentId !== customer.technicianId) {
                                    agentStats[tech.id].totalRevenue += amount;
                                }
                                grandTotalCommission += comm;
                            }
                            hasPartner = true;
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
                    if (customer.agentId && agentStats[customer.agentId]) {
                        if (p.status === 'completed') {
                            agentStats[customer.agentId].paidCount += 1;
                        } else {
                            agentStats[customer.agentId].unpaidCount += 1;
                        }
                    }
                    if (customer.technicianId && agentStats[customer.technicianId]) {
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

        } else if (currentUser.role === 'partner' || currentUser.isAgent || currentUser.isTechnician) {
            // Partner View
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

                    if (customer.agentId === currentUser.id && currentUser.isAgent) {
                        if (p.status === 'completed') {
                            myStats.commission += (amount * (currentUser.agentRate || 0)) / 100;
                            myStats.totalRevenue += amount;
                        }
                    }

                    if (customer.technicianId === currentUser.id && currentUser.isTechnician) {
                        if (p.status === 'completed') {
                            myStats.commission += (amount * (currentUser.technicianRate || 0)) / 100;
                            if (customer.agentId !== currentUser.id) {
                                myStats.totalRevenue += amount;
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
