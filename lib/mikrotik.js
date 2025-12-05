import { RouterOSAPI } from "node-routeros";
import { getConfig } from "./config";

// Map to store active clients: connectionId -> { client: RouterOSAPI, connectPromise: Promise }
const clients = new Map();

export const getMikrotikClient = async (connectionId = null) => {
    // Always check for fresh config to handle updates
    const config = getConfig();

    // Determine which connection to use
    const targetId = connectionId || config.activeConnectionId;
    const activeConnection = config.connections?.find(c => c.id === targetId);

    // Fallback to env vars if no active connection (or for initial setup)
    const host = activeConnection?.host || process.env.MIKROTIK_HOST;
    const user = activeConnection?.user || process.env.MIKROTIK_USER;
    const password = activeConnection?.password || process.env.MIKROTIK_PASSWORD;
    const port = activeConnection?.port || process.env.MIKROTIK_PORT || 8728;

    if (!host || !user || !password) {
        throw new Error("Mikrotik credentials not configured");
    }

    // Check if we already have a client for this connection
    let clientEntry = clients.get(targetId || 'default');

    // If client exists but config changed, close and recreate
    if (clientEntry) {
        const { client } = clientEntry;
        if (
            client.host !== host ||
            client.port !== parseInt(port) ||
            client.user !== user
        ) {
            try {
                if (client.connected) await client.close();
            } catch (e) {
                console.error("Error closing old connection:", e);
            }
            clients.delete(targetId || 'default');
            clientEntry = null;
        }
    }

    if (!clientEntry) {
        const client = new RouterOSAPI({
            host,
            user,
            password,
            port: parseInt(port),
            keepalive: true,
        });
        clientEntry = { client, connectPromise: null };
        clients.set(targetId || 'default', clientEntry);
    }

    const { client } = clientEntry;

    if (!client.connected) {
        // If already connecting, wait for that promise
        if (clientEntry.connectPromise) {
            await clientEntry.connectPromise;
        } else {
            // Start connecting
            clientEntry.connectPromise = (async () => {
                try {
                    await client.connect();
                } catch (error) {
                    console.error(`Failed to connect to Mikrotik (${host}):`, error);
                    // If connection failed, ensure we don't leave a broken client or promise
                    throw error;
                } finally {
                    clientEntry.connectPromise = null;
                }
            })();

            await clientEntry.connectPromise;
        }
    }

    return client;
};
