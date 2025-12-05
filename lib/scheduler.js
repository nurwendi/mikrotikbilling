import cron from 'node-cron';
import { createBackup } from './backup';

let isSchedulerRunning = false;

export function initScheduler() {
    if (isSchedulerRunning) {
        return;
    }

    console.log('Initializing Scheduler...');

    // Schedule Daily Backup at 00:00 (Midnight)
    cron.schedule('0 0 * * *', async () => {
        console.log('Running scheduled daily backup...');
        try {
            const backup = await createBackup();
            console.log(`Daily backup created: ${backup.filename}`);
        } catch (error) {
            console.error('Scheduled backup failed:', error);
        }
    });

    // Schedule Auto-Drop Check (Runs daily at 01:00 AM)
    cron.schedule('0 1 * * *', async () => {
        console.log('Running scheduled auto-drop check...');
        try {
            const { getAutoDropSettings, checkAndDropUsers } = await import('./auto-drop');
            const autoDropDate = await getAutoDropSettings();
            const today = new Date().getDate();

            if (today >= autoDropDate) {
                console.log(`Today (${today}) is on or after auto-drop date (${autoDropDate}). Checking for unpaid users...`);
                const result = await checkAndDropUsers();
                console.log('Auto-drop result:', result);
            } else {
                console.log(`Today (${today}) is before auto-drop date (${autoDropDate}). Skipping.`);
            }
        } catch (error) {
            console.error('Scheduled auto-drop failed:', error);
        }
    });

    // Schedule Data Usage Sync (Runs every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
        try {
            const { syncUsage } = await import('./usage-tracker');
            await syncUsage();
        } catch (error) {
            console.error('Scheduled usage sync failed:', error);
        }
    });

    // Schedule Traffic Monitoring (Runs every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
        try {
            const { collectTrafficData } = await import('./traffic-monitor');
            await collectTrafficData();
        } catch (error) {
            console.error('Scheduled traffic collection failed:', error);
        }
    });

    isSchedulerRunning = true;
    console.log('Scheduler initialized.');
}
