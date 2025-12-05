import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { signToken } from '@/lib/security';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        const user = await verifyPassword(username, password);

        if (user) {
            const payload = {
                username: user.username,
                role: user.role,
                id: user.id
            };

            const token = await signToken(payload);

            const response = NextResponse.json({ success: true, user, token });

            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: false, // Set to false for HTTP servers, true if using HTTPS
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
