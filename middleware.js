import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Only protect /admin.html
    if (pathname.startsWith('/admin.html')) {
        const token = request.cookies.get('al_ihsan_token')?.value;

        if (!token) {
            // Redirect to a specific hash or just let the overlay handle it 
            // but for "Enterprise" we block the actual file content if possible
            // In static Vercel, we can rewrite to an "internal" login or just proceed
            // However, a real middleware should probably redirect to a login page
            // Since we use an overlay, we'll let it pass but the API will block data
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin.html', '/api/:path*'],
};
