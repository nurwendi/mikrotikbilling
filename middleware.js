import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/security';

export async function middleware(request) {
    const authToken = request.cookies.get('auth_token');
    const { pathname } = request.nextUrl;

    // Allow access to login page, invoice page, and static assets
    if (pathname.startsWith('/login') || pathname.startsWith('/invoice') || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Check if user is authenticated
    let token = authToken?.value;

    // Also check for Bearer token in Authorization header (for mobile app)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    if (!token) {
        // For API routes, return 401 instead of redirect
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const user = await verifyToken(token);

    if (!user) {
        // Invalid token
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check for restricted roles
    // If user is NOT admin context, prevent access to admin pages
    if (user.role !== 'admin') {
        // Allow /app-settings for all users (for logout/language)
        const restrictedPaths = ['/settings', '/system-users'];
        if (restrictedPaths.some(path => pathname.startsWith(path))) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
};
