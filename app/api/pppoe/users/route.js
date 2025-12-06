import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import fs from 'fs/promises';
import path from 'path';
import { getUserFromRequest } from '@/lib/api-auth';

const CUSTOMER_DATA_PATH = path.join(process.cwd(), 'customer-data.json');

export async function GET(request) {
    try {
        const client = await getMikrotikClient();
        let users = await client.write('/ppp/secret/print');

        // Filter based on role
        const user = await getUserFromRequest(request);
        if (user && user.role !== 'admin') {
            try {
                // If role is agent, technician, or partner - filter the list
                if (user.role === 'agent' || user.role === 'technician' || user.role === 'partner') {
                    // Load customers to check assignment
                    const data = await fs.readFile(CUSTOMER_DATA_PATH, 'utf8');
                    const customers = JSON.parse(data);

                    const allowedUsernames = new Set();
                    for (const [key, val] of Object.entries(customers)) {
                        // Check Agent/Partner assignment
                        if ((user.role === 'agent' || user.role === 'partner') && val.agentId === user.id) {
                            allowedUsernames.add(key);
                        }
                        // Check Technician assignment
                        if (user.role === 'technician' && val.technicianId === user.id) {
                            allowedUsernames.add(key);
                        }
                    }

                    users = users.filter(u => allowedUsernames.has(u.name));
                }
            } catch (e) {
                console.error('Error filtering users:', e);
            }
        }

        // Attach monthly usage data
        const { getMonthlyUsage } = await import('@/lib/usage-tracker');
        const usersWithUsage = await Promise.all(users.map(async (u) => {
            const usage = await getMonthlyUsage(u.name);
            return { ...u, usage };
        }));

        return NextResponse.json(usersWithUsage);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export async function POST(request) {
    try {
        const body = await request.json();
        const { name, password, profile, service = "pppoe", routerIds, comment } = body;

        if (!name || !password) {
            return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
        }

        // Check user role
        const user = await getUserFromRequest(request);
        let userRole = 'admin'; // Default to admin if no token (shouldn't happen in prod)
        let userId = '';

        let prefix = '';

        if (user) {
            userRole = user.role;
            userId = user.id;
            prefix = user.prefix || '';
        }

        // Apply prefix if user is partner and prefix exists
        let finalUsername = name;
        if (userRole === 'partner' && prefix) {
            finalUsername = `${prefix}${name}`;
        }

        // If partner, save as pending registration
        if (userRole === 'partner') {
            let customers = {};
            try {
                const data = await fs.readFile(CUSTOMER_DATA_PATH, 'utf8');
                customers = JSON.parse(data);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist, start with empty object
                    customers = {};
                    await fs.writeFile(CUSTOMER_DATA_PATH, '{}', 'utf-8');
                } else {
                    throw error;
                }
            }

            if (customers[finalUsername]) {
                return NextResponse.json({ error: "User already exists or is pending" }, { status: 400 });
            }

            // Auto-generate customer number if needed
            let maxId = 10000;
            for (const key in customers) {
                const cust = customers[key];
                if (cust.customerNumber) {
                    const numPart = parseInt(cust.customerNumber);
                    if (!isNaN(numPart) && numPart > maxId) {
                        maxId = numPart;
                    }
                }
            }
            const customerNumber = String(maxId + 1);

            customers[finalUsername] = {
                name: body.customerName || '',
                address: body.customerAddress || '',
                phone: body.customerPhone || '',
                customerNumber: customerNumber,
                agentId: userId, // Partner is the agent
                technicianId: '',
                status: 'pending',
                registrationData: {
                    name: finalUsername, // Use prefixed username
                    password,
                    profile,
                    service,
                    routerIds,
                    comment
                }
            };

            await fs.writeFile(CUSTOMER_DATA_PATH, JSON.stringify(customers, null, 2), 'utf-8');

            return NextResponse.json({
                success: true,
                message: "Registration submitted for approval. Please wait for admin confirmation."
            });
        }

        // If admin/technician, proceed with Mikrotik creation
        // If routerIds provided, add to each. Otherwise use default/active.
        const targetRouterIds = (routerIds && Array.isArray(routerIds) && routerIds.length > 0)
            ? routerIds
            : [null]; // null triggers default active connection

        const results = [];
        const errors = [];

        for (const routerId of targetRouterIds) {
            try {
                const client = await getMikrotikClient(routerId);

                // Check if user exists first to avoid error or update instead?
                // For now, let's try to add. If it exists, it might error.
                // Or we could try to remove then add, or update.
                // Simple add for now.

                const command = [
                    `=name=${name}`,
                    `=password=${password}`,
                ];

                if (profile) {
                    command.push(`=profile=${profile}`);
                }

                // Only add service if it's specified and not empty
                if (service && service !== 'any') {
                    command.push(`=service=${service}`);
                }

                if (comment) {
                    command.push(`=comment=${comment}`);
                }

                try {
                    await client.write('/ppp/secret/add', command);
                    results.push({ routerId, success: true });
                } catch (addError) {
                    // Handle !empty reply - this can be normal for add operations
                    if (addError.errno === 'UNKNOWNREPLY' || addError.message?.includes('!empty')) {
                        console.log('User add completed (empty reply is normal)');
                        results.push({ routerId, success: true });
                    } else {
                        throw addError;
                    }
                }
            } catch (err) {
                console.error(`Failed to add user to router ${routerId}:`, err);
                errors.push({ routerId, error: err.message });
            }
        }

        if (errors.length > 0 && results.length === 0) {
            // All failed
            return NextResponse.json({ error: "Failed to add user to any router", details: errors }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
