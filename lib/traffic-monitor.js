import fs from 'fs';
import path from 'path';
import { getMikrotikClient } from './mikrotik';
import { getConfig } from './config';

const TRAFFIC_FILE = path.join(process.cwd(), 'data', 'traffic-history.json');
const MAX_HISTORY_DAYS = 7;

// Helper to read traffic data
function getTrafficData() {
    try {
        if (fs.existsSync(TRAFFIC_FILE)) {
            const data = fs.readFileSync(TRAFFIC_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading traffic file:', error);
    }
    return [];
}

// Helper to save traffic data
function saveTrafficData(data) {
    try {
        // Ensure directory exists
        const dir = path.dirname(TRAFFIC_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(TRAFFIC_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving traffic file:', error);
    }
}

export async function collectTrafficData() {
    // console.log('Collecting traffic data...');
    try {
        const config = getConfig();
        const wanInterface = config.wanInterface;

        if (!wanInterface) {
            // console.log('WAN Interface not configured, skipping traffic collection.');
            return;
        }

        const client = await getMikrotikClient();

        // Fetch interface stats
        // We can use /interface/monitor-traffic for realtime, but it's a streaming command usually.
        // For snapshot, we can use /interface/print where name=wanInterface.
        // Or /interface/monitor-traffic with once=true (if supported by node-routeros/API).
        // Let's try /interface/print first as it's safer.
        // Actually, /interface/print gives cumulative bytes (rx-byte, tx-byte).
        // To get "current speed", we need to calculate delta or use monitor-traffic.
        // monitor-traffic is better for "current usage".
        // node-routeros `write` can handle commands.

        // Let's try to get cumulative bytes first, and calculate speed if we have previous data?
        // Or just store cumulative and let frontend calculate?
        // Frontend calculating from 5-min intervals might be inaccurate for "speed".
        // But "Usage" usually means volume (GB).
        // User asked for "penggunaan traffik" (traffic usage) and "grafik" (graph).
        // Usually graphs show "Speed" (Mbps) over time, OR "Volume" (GB) per day.
        // "disimpan selama 1 minggu" implies history.
        // If I store cumulative bytes every 5 mins, I can calculate volume per interval.
        // If I want speed, I can calculate (Current - Previous) / TimeDelta.

        // Let's stick to storing cumulative bytes (rx-byte, tx-byte) and the timestamp.
        // This allows flexibility.

        const interfaces = await client.write('/interface/print', [`?name=${wanInterface}`]);

        if (!interfaces || interfaces.length === 0) {
            console.error(`Interface ${wanInterface} not found.`);
            return;
        }

        const iface = interfaces[0];
        const timestamp = Date.now();
        const rx = parseInt(iface['rx-byte']);
        const tx = parseInt(iface['tx-byte']);

        const history = getTrafficData();

        // Append new data
        history.push({
            timestamp,
            rx,
            tx
        });

        // Prune old data
        const cutoff = Date.now() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
        const filteredHistory = history.filter(entry => entry.timestamp > cutoff);

        saveTrafficData(filteredHistory);
        // console.log('Traffic data collected.');

    } catch (error) {
        console.error('Error collecting traffic data:', error);
    }
}

export function getTrafficHistory() {
    return getTrafficData();
}
