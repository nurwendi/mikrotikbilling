import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

export async function GET(request, { params }) {
    try {
        const { username } = await params;
        const customers = readCustomerData();

        if (!customers[username]) {
            return NextResponse.json({
                name: '',
                address: '',
                phone: ''
            });
        }

        return NextResponse.json(customers[username]);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        const { username } = await params;
        const body = await request.json();
        const { name, address, phone } = body;

        const customers = readCustomerData();
        customers[username] = {
            name: name || '',
            address: address || '',
            phone: phone || ''
        };

        writeCustomerData(customers);
        return NextResponse.json({ success: true, customer: customers[username] });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { username } = await params;
        const customers = readCustomerData();

        delete customers[username];
        writeCustomerData(customers);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
