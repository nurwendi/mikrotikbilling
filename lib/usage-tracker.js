import fs from 'fs';
import path from 'path';
import { getMikrotikClient } from './mikrotik';

const USAGE_FILE = path.join(process.cwd(), 'data', 'user-usage.json');

// Helper to read usage data
function getUsageData() {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            const data = fs.readFileSync(USAGE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading usage file:', error);
    }
    return {};
}

// Helper to save usage data
function saveUsageData(data) {
    try {
        // Ensure directory exists
        const dir = path.dirname(USAGE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving usage file:', error);
    }
}

export async function syncUsage() {
    console.log('Syncing data usage...');
    let client;
    try {
        client = await getMikrotikClient();

        // Fetch active connections and interfaces
        const [activeConnections, interfaces] = await Promise.all([
            client.write('/ppp/active/print'),
            client.write('/interface/print')
        ]);

        const usageData = getUsageData();
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Process each active connection
        for (const conn of activeConnections) {
            const username = conn.name;

            // Find interface stats
            const interfaceName = `<pppoe-${username}>`;
            const userInterface = interfaces.find(i => i.name === interfaceName) || interfaces.find(i => i.name === username);

            if (!userInterface) continue;

            const currentRx = parseInt(userInterface['rx-byte'] || 0);
            const currentTx = parseInt(userInterface['tx-byte'] || 0);
            const sessionId = conn['.id']; // Use Mikrotik internal ID as session ID

            // Initialize user data if not exists
            if (!usageData[username]) {
                usageData[username] = {
                    month: currentMonth,
                    accumulated_rx: 0,
                    accumulated_tx: 0,
                    last_session_id: sessionId,
                    last_session_rx: currentRx,
                    last_session_tx: currentTx
                };
            }

            const userData = usageData[username];

            // Check for month change
            if (userData.month !== currentMonth) {
                userData.month = currentMonth;
                userData.accumulated_rx = 0;
                userData.accumulated_tx = 0;
                userData.last_session_id = sessionId;
                userData.last_session_rx = currentRx;
                userData.last_session_tx = currentTx;
            }

            // Check for session change
            if (userData.last_session_id !== sessionId) {
                // Previous session ended. Add its last known usage to accumulated.
                // Note: We assume 'last_session_rx' holds the final value of the previous session
                // captured during the last sync.
                userData.accumulated_rx += userData.last_session_rx;
                userData.accumulated_tx += userData.last_session_tx;

                // Start tracking new session
                userData.last_session_id = sessionId;
                userData.last_session_rx = currentRx;
                userData.last_session_tx = currentTx;
            } else {
                // Same session, update last known usage
                // Handle counter reset/overflow (unlikely but possible if rebooted)
                if (currentRx < userData.last_session_rx) {
                    // Counter reset detected, add previous value to accumulated
                    userData.accumulated_rx += userData.last_session_rx;
                    userData.accumulated_tx += userData.last_session_tx;
                }

                userData.last_session_rx = currentRx;
                userData.last_session_tx = currentTx;
            }
        }

        saveUsageData(usageData);
        // console.log('Usage sync complete.');

    } catch (error) {
        console.error('Error syncing usage:', error);
    }
}

export async function getMonthlyUsage(username) {
    const usageData = getUsageData();
    const userData = usageData[username];

    if (!userData) return { rx: 0, tx: 0 };

    // Check if month matches current month (if not, it's old data)
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (userData.month !== currentMonth) return { rx: 0, tx: 0 };

    // Total = Accumulated + Current Session (Last Known)
    return {
        rx: userData.accumulated_rx + userData.last_session_rx,
        tx: userData.accumulated_tx + userData.last_session_tx
    };
}
