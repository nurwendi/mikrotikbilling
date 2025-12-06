import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

const CUSTOMER_DATA_PATH = path.join(process.cwd(), 'customer-data.json');

// Ensure file exists
function ensureCustomerDataFile() {
    if (!fs.existsSync(CUSTOMER_DATA_PATH)) {
        fs.writeFileSync(CUSTOMER_DATA_PATH, '{}', 'utf-8');
    }
}

// Read customer data
function readCustomerData() {
    ensureCustomerDataFile();
    const data = fs.readFileSync(CUSTOMER_DATA_PATH, 'utf-8');
    return JSON.parse(data);
}

// Write customer data
function writeCustomerData(data) {
    fs.writeFileSync(CUSTOMER_DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET(request) {
    try {
        const customers = readCustomerData();

        // Filter based on role
        const user = getUserFromRequest(request);
        if (user) {
            try {
                if (user.role === 'agent') {
                    const filtered = {};
                    for (const [key, val] of Object.entries(customers)) {
                        if (val.agentId === user.id) filtered[key] = val;
                    }
                    return NextResponse.json(filtered);
                } else if (user.role === 'technician') {
                    const filtered = {};
                    for (const [key, val] of Object.entries(customers)) {
                        if (val.technicianId === user.id) filtered[key] = val;
                    }
                    return NextResponse.json(filtered);
                }
            } catch (e) {
                // Ignore token parse error
            }
        }

        return NextResponse.json(customers);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, name, address, phone, customerNumber } = body;

        console.log(`[API] Updating customer data for username: ${username}`, body);

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        const customers = readCustomerData();

        let agentId = body.agentId;
        let technicianId = body.technicianId;

        // Auto-assign if creator is restricted and IDs are not provided
        const user = getUserFromRequest(request);
        if (user) {
            try {
                if (user.isAgent && !agentId) agentId = user.id;
                if (user.isTechnician && !technicianId) technicianId = user.id;
            } catch (e) {
                // Ignore
            }
        }

        const existingData = customers[username] || {};
        let finalCustomerNumber = customerNumber;

        // Preserve existing customer number if not provided in update
        if (!finalCustomerNumber && existingData.customerNumber) {
            finalCustomerNumber = existingData.customerNumber;
        }

        if (!finalCustomerNumber) {
            // Auto-generate customer number (Simple Integer starting from 10001)
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
            finalCustomerNumber = String(maxId + 1);
        }

        // MERGE DATA: Keep existing fields unless overwritten, handle empty strings correctly
        customers[username] = {
            ...existingData,
            name: name !== undefined ? name : (existingData.name || ''),
            address: address !== undefined ? address : (existingData.address || ''),
            phone: phone !== undefined ? phone : (existingData.phone || ''),
            customerNumber: finalCustomerNumber,
            agentId: agentId !== undefined ? agentId : (existingData.agentId || ''),
            technicianId: technicianId !== undefined ? technicianId : (existingData.technicianId || ''),
            updatedAt: new Date().toISOString()
        };

        writeCustomerData(customers);
        console.log(`[API] Customer data saved for ${username}`);

        return NextResponse.json({ success: true, customer: customers[username] });
    } catch (error) {
        console.error('[API] Error saving customer data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
