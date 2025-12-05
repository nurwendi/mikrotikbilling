import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function PUT(request, { params }) {
    try {
        const client = await getMikrotikClient();
        const { id } = await params;
        const body = await request.json();
        const { name, password, profile, service, comment } = body;

        if (!id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const updateParams = [`=.id=${id}`];
        if (name) updateParams.push(`=name=${name}`);
        if (password) updateParams.push(`=password=${password}`);
        if (profile) updateParams.push(`=profile=${profile}`);
        if (service) updateParams.push(`=service=${service}`);
        if (comment) updateParams.push(`=comment=${comment}`);

        console.log(`PUT /api/pppoe/users/${id} - Updating user`);

        // Perform the update
        await client.write('/ppp/secret/set', updateParams);
        console.log('User update completed successfully');

        // For online users, disconnect to apply changes immediately
        // This is optional - if it fails, the update was still successful
        if (name) {
            try {
                const activeConnections = await client.write('/ppp/active/print', [`?name=${name}`]);
                if (activeConnections && Array.isArray(activeConnections) && activeConnections.length > 0) {
                    for (const conn of activeConnections) {
                        if (conn['.id']) {
                            await client.write('/ppp/active/remove', [`=.id=${conn['.id']}`]);
                        }
                    }
                    console.log(`Disconnected active session for ${name} to apply changes`);
                } else {
                    console.log(`User ${name} is offline, no session to disconnect`);
                }
            } catch (disconnectError) {
                // User is offline or disconnect failed - this is fine, update already succeeded
                console.log(`Disconnect skipped for ${name}: ${disconnectError.message}`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const client = await getMikrotikClient();
        const { id } = await params;

        console.log(`Attempting to delete user with ID: ${id}`);

        await client.write('/ppp/secret/remove', [
            `=.id=${id}`,
        ]);

        console.log(`Successfully deleted user with ID: ${id}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error deleting user with ID ${params.id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
