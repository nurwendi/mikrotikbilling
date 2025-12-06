
import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';

const settingsFile = path.join(process.cwd(), 'billing-settings.json');

async function getSettings() {
    try {
        const data = await fs.readFile(settingsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Default settings
        return {
            companyName: 'Mikrotik Manager',
            companyAddress: 'Jalan Raya Internet No. 1',
            companyContact: '081234567890',
            invoiceFooter: 'Terima kasih atas kepercayaan Anda.',
            logoUrl: '',
            autoDropDate: 10 // Day of month to auto-drop unpaid users
        };
    }
}

export async function GET() {
    const settings = await getSettings();
    const config = getConfig();

    // Mask password
    const emailConfig = config.email ? { ...config.email, password: config.email.password ? '******' : '' } : {};

    return NextResponse.json({
        ...settings,
        email: emailConfig
    });
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Separate email config from billing settings
        const { email, ...billingSettings } = body;

        // 1. Save Billing Settings
        await fs.writeFile(settingsFile, JSON.stringify(billingSettings, null, 2));

        // 2. Save Email Settings if present
        if (email) {
            const oldConfig = getConfig();
            let newEmailConfig = email;

            // Handle Password Masking
            if (newEmailConfig.password === '******') {
                newEmailConfig.password = oldConfig.email?.password || '';
            }

            const newConfig = {
                ...oldConfig,
                email: newEmailConfig
            };
            saveConfig(newConfig);
        }

        return NextResponse.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Save billing settings error:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
