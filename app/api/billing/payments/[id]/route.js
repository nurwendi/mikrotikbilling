import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const paymentsFile = path.join(process.cwd(), 'billing-payments.json');

async function getPayments() {
    try {
        const data = await fs.readFile(paymentsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, amount, notes } = body;

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        let payments = await getPayments();
        // Convert both to string for comparison
        const paymentIndex = payments.findIndex(p => String(p.id) === String(id));

        if (paymentIndex === -1) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        payments[paymentIndex] = {
            ...payments[paymentIndex],
            status: status,
            date: status === 'completed' ? new Date().toISOString() : payments[paymentIndex].date, // Update date if completed
            amount: amount || payments[paymentIndex].amount,
            notes: notes !== undefined ? notes : payments[paymentIndex].notes
        };

        await fs.writeFile(paymentsFile, JSON.stringify(payments, null, 2));

        return NextResponse.json({ success: true, payment: payments[paymentIndex] });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }
}
