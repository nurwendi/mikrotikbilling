import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { promises as fs } from 'fs';
import path from 'path';

const paymentsFile = path.join(process.cwd(), 'billing-payments.json');

async function getPayments() {
    try {
        const data = await fs.readFile(paymentsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function savePayments(payments) {
    await fs.writeFile(paymentsFile, JSON.stringify(payments, null, 2));
}

const customerDataPath = path.join(process.cwd(), 'customer-data.json');

async function getCustomerData() {
    try {
        const data = await fs.readFile(customerDataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { month, year } = body;

        // Use provided month/year or default to current
        const now = new Date();
        const targetMonth = month !== undefined ? month : now.getMonth();
        const targetYear = year !== undefined ? year : now.getFullYear();

        const client = await getMikrotikClient();
        const users = await client.write('/ppp/secret/print');
        const profiles = await client.write('/ppp/profile/print');

        const payments = await getPayments();
        const customers = await getCustomerData();

        let generatedCount = 0;
        let skippedCount = 0;

        // Calculate sequence start based on total payments count
        let sequenceCounter = payments.length + 1;

        for (const user of users) {
            // Check if invoice already exists for this user in this month
            const existingInvoice = payments.find(p => {
                const pDate = new Date(p.date);
                return p.username === user.name &&
                    pDate.getMonth() === targetMonth &&
                    pDate.getFullYear() === targetYear;
            });

            if (existingInvoice) {
                skippedCount++;
                continue;
            }

            // Find user's profile to get price
            const userProfile = profiles.find(p => p.name === user.profile);

            // Parse price from comment field (format: "price:150000")
            let amount = 0;
            if (userProfile?.comment && userProfile.comment.includes('price:')) {
                const match = userProfile.comment.match(/price:(\d+)/);
                if (match) {
                    amount = parseInt(match[1]);
                }
            }

            if (amount > 0) {
                // Create invoice for the specified month (in UTC to avoid timezone issues)
                const invoiceDate = new Date(Date.UTC(targetYear, targetMonth, 1));

                // Calculate arrears from past unpaid/postponed invoices
                // Filter for invoices BEFORE the target invoice date
                const pastInvoices = payments.filter(p =>
                    p.username === user.name &&
                    (p.status === 'pending' || p.status === 'postponed') &&
                    new Date(p.date) < invoiceDate
                );

                let arrearsAmount = 0;
                if (pastInvoices.length > 0) {
                    arrearsAmount = pastInvoices.reduce((sum, p) => sum + parseFloat(p.amount), 0);

                    // Mark past invoices as merged
                    pastInvoices.forEach(p => {
                        const idx = payments.findIndex(pay => pay.id === p.id);
                        if (idx !== -1) {
                            payments[idx].status = 'merged';
                            payments[idx].notes = (payments[idx].notes || '') + ` (Merged into new invoice)`;
                        }
                    });
                }

                // Format Invoice Number: INV/[yy]/[mm]/[cust number]/[no invoice]
                const yy = String(targetYear).slice(-2);
                const mm = String(targetMonth + 1).padStart(2, '0');
                const custNumber = customers[user.name]?.customerNumber || '0000';
                const seq = String(sequenceCounter).padStart(4, '0');

                const invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;
                sequenceCounter++;

                const monthName = invoiceDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                let notes = `Invoice for ${monthName}`;
                if (arrearsAmount > 0) {
                    notes += ` (Termasuk tunggakan: ${arrearsAmount})`;
                }

                const newPayment = {
                    id: Date.now() + Math.random(), // Ensure unique ID
                    invoiceNumber: invoiceNumber,
                    username: user.name,
                    amount: amount + arrearsAmount,
                    method: 'pending',
                    status: 'pending',
                    date: invoiceDate.toISOString(),
                    notes: notes
                };

                payments.push(newPayment);
                generatedCount++;
            }
        }

        await savePayments(payments);

        const monthName = new Date(targetYear, targetMonth, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        return NextResponse.json({
            message: `Generated ${generatedCount} invoices for ${monthName}. Skipped ${skippedCount} existing invoices.`,
            generated: generatedCount,
            skipped: skippedCount,
            month: targetMonth,
            year: targetYear
        });

    } catch (error) {
        console.error('Invoice generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
