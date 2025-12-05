import { NextResponse } from 'next/server';
import { getTrafficHistory } from '@/lib/traffic-monitor';

export async function GET() {
    try {
        const history = getTrafficHistory();
        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
