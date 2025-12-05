import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, password, profile, service, comment } = body;

        console.log(`PUT /api/pppoe/users/${id} - Starting update`);

        if (!id) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        let client;
        try {
            client = await getMikrotikClient();
        } catch (connError) {
            console.error('Connection error:', connError);
            // Handle timeout or connection errors
            if (connError.errno === 'SOCKTMOUT' || connError.message?.includes('Timed out')) {
                return NextResponse.json({ error: "Connection to router timed out. Please try again." }, { status: 503 });
            }
            return NextResponse.json({ error: "Failed to connect to router: " + connError.message }, { status: 503 });
        }

        const updateParams = [`=.id=${id}`];
        if (name) updateParams.push(`=name=${name}`);
        if (password) updateParams.push(`=password=${password}`);
        if (profile) updateParams.push(`=profile=${profile}`);
        // Only add service if it's a specific value (not empty or 'any')
        if (service && service !== 'any') updateParams.push(`=service=${service}`);
        if (comment !== undefined) updateParams.push(`=comment=${comment || ''}`);

        console.log('Update params:', updateParams);

        // Perform the update with error handling for empty replies and timeouts
        try {
            await client.write('/ppp/secret/set', updateParams);
            console.log('User update completed successfully');
        } catch (updateError) {
            // Handle !empty reply - this is normal for set operations
            if (updateError.errno === 'UNKNOWNREPLY' || updateError.message?.includes('!empty')) {
                console.log('User update completed (empty reply is normal)');
            } else if (updateError.errno === 'SOCKTMOUT' || updateError.message?.includes('Timed out')) {
                return NextResponse.json({ error: "Router connection timed out during update. Please try again." }, { status: 503 });
            } else {
                throw updateError;
            }
        }

        // For online users, disconnect to apply changes immediately
        // This is optional - if it fails, the update was still successful
        if (name) {
            try {
                const activeConnections = await client.write('/ppp/active/print', [`?name=${name}`]);
                if (activeConnections && Array.isArray(activeConnections) && activeConnections.length > 0) {
                    for (const conn of activeConnections) {
                        if (conn['.id']) {
                            try {
                                await client.write('/ppp/active/remove', [`=.id=${conn['.id']}`]);
                            } catch (removeError) {
                                // Ignore empty reply and timeout errors
                                if (removeError.errno !== 'UNKNOWNREPLY' && removeError.errno !== 'SOCKTMOUT') {
                                    console.log(`Remove session warning: ${removeError.message}`);
                                }
                            }
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

        try {
            await client.write('/ppp/secret/remove', [
                `=.id=${id}`,
            ]);
        } catch (deleteError) {
            // Handle !empty reply - this is normal for remove operations
            if (deleteError.errno === 'UNKNOWNREPLY' || deleteError.message?.includes('!empty')) {
                console.log('Delete completed (empty reply is normal)');
            } else {
                throw deleteError;
            }
        }

        console.log(`Successfully deleted user with ID: ${id}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error deleting user with ID ${(await params).id}:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
