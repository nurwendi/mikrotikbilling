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

export async function GET() {
    const payments = await getPayments();

    const totalRevenue = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const todaysRevenue = payments
        .filter(p => p.status === 'completed' && p.date.startsWith(today))
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const thisMonthRevenue = payments
        .filter(p => p.status === 'completed' && p.date.startsWith(currentMonth))
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingCount = payments.filter(p => p.status === 'pending').length;

    const totalUnpaid = payments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
        totalRevenue,
        thisMonthRevenue,
        todaysRevenue,
        pendingCount,
        totalUnpaid,
        totalTransactions: payments.length
    });
}
