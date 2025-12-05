import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/api-auth';

const paymentsFile = path.join(process.cwd(), 'billing-payments.json');
const customerFile = path.join(process.cwd(), 'customer-data.json');

async function getPayments() {
    try {
        const data = await fs.readFile(paymentsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function getCustomer(username) {
    try {
        const data = await fs.readFile(customerFile, 'utf8');
        const customers = JSON.parse(data);
        return customers[username];
    } catch (error) {
        return null;
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    let payments = await getPayments();

    // Filter based on role
    const user = getUserFromRequest(request);
    if (user) {
        try {
            if (user.role === 'agent' || user.role === 'technician' || user.role === 'partner') {
                // Load customers to check assignment
                const data = await fs.readFile(customerFile, 'utf8');
                const customers = JSON.parse(data);

                const allowedUsernames = new Set();
                for (const [key, val] of Object.entries(customers)) {
                    if (user.isAgent && val.agentId === user.id) allowedUsernames.add(key);
                    if (user.isTechnician && val.technicianId === user.id) allowedUsernames.add(key);
                }

                payments = payments.filter(p => allowedUsernames.has(p.username));
            }
        } catch (e) {
            // Ignore token parse error
        }
    }

    if (username) {
        payments = payments.filter(p => p.username === username);
    }

    // Sort by date desc
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json(payments);
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Debug logging
        await fs.writeFile(path.join(process.cwd(), 'debug_payment.log'), JSON.stringify(body, null, 2));

        // Basic validation
        if (!body.username || !body.amount) {
            return NextResponse.json({ error: 'Username and amount are required' }, { status: 400 });
        }

        const payments = await getPayments();
        const users = await getUsers();
        const customer = await getCustomer(body.username);

        const commissions = [];
        const amount = Number(body.amount);

        if (customer) {
            // Calculate Agent Commission
            if (customer.agentId) {
                const agent = users.find(u => u.id === customer.agentId);
                if (agent && agent.isAgent && agent.agentRate > 0) {
                    const commissionAmount = (amount * agent.agentRate) / 100;
                    commissions.push({
                        userId: agent.id,
                        username: agent.username,
                        role: 'agent',
                        rate: agent.agentRate,
                        amount: commissionAmount
                    });
                }
            }

            // Calculate Technician Commission
            if (customer.technicianId) {
                const technician = users.find(u => u.id === customer.technicianId);
                if (technician && technician.isTechnician && technician.technicianRate > 0) {
                    const commissionAmount = (amount * technician.technicianRate) / 100;
                    commissions.push({
                        userId: technician.id,
                        username: technician.username,
                        role: 'technician',
                        rate: technician.technicianRate,
                        amount: commissionAmount
                    });
                }
            }
        }

        // Generate Invoice Number if not present
        let invoiceNumber = body.invoiceNumber;
        if (!invoiceNumber) {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const custNumber = customer?.customerNumber || '0000';
            const seq = String(payments.length + 1).padStart(4, '0');
            invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;
        }

        const newPayment = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            status: 'completed', // Default status
            invoiceNumber,
            commissions, // Store calculated commissions
            ...body
        };

        payments.push(newPayment);

        await fs.writeFile(paymentsFile, JSON.stringify(payments, null, 2));
        return NextResponse.json({ success: true, payment: newPayment });
    } catch (error) {
        console.error('Payment Error:', error);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        let payments = await getPayments();
        const initialLength = payments.length;

        // Filter out payments with matching IDs
        payments = payments.filter(p => !ids.includes(p.id));

        if (payments.length === initialLength) {
            return NextResponse.json({ message: 'No payments found to delete' }, { status: 404 });
        }

        await fs.writeFile(paymentsFile, JSON.stringify(payments, null, 2));

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${initialLength - payments.length} payments`
        });
    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete payments' }, { status: 500 });
    }
}
