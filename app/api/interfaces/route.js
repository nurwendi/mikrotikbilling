import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function GET() {
    try {
        const client = await getMikrotikClient();
        const interfaces = await client.write('/interface/print');

        // Return only necessary fields
        const simplifiedInterfaces = interfaces.map(iface => ({
            name: iface.name,
            type: iface.type,
            running: iface.running === 'true',
            disabled: iface.disabled === 'true'
        }));

        return NextResponse.json(simplifiedInterfaces);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
