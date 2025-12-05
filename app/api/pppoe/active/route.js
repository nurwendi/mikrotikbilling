import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function GET() {
    try {
        const client = await getMikrotikClient();

        // Fetch active PPPoE connections
        const [activeConnections, interfaces] = await Promise.all([
            client.write('/ppp/active/print'),
            client.write('/interface/print')
        ]);

        // Map interface stats to connections
        const connectionsWithStats = activeConnections.map(conn => {
            // Find corresponding interface (usually <pppoe-username>)
            const interfaceName = `<pppoe-${conn.name}>`;
            const userInterface = interfaces.find(i => i.name === interfaceName) || interfaces.find(i => i.name === conn.name);

            if (userInterface) {
                return {
                    ...conn,
                    'rx-byte': userInterface['rx-byte'],
                    'tx-byte': userInterface['tx-byte']
                };
            }
            return conn;
        });

        return NextResponse.json(connectionsWithStats);
    } catch (error) {
        console.error('Error fetching active connections:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
