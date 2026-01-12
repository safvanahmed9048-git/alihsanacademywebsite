import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Protect admin.html and all CMS/Admin APIs
    if (pathname.startsWith('/admin.html') || pathname.startsWith('/api/admin')) {
        const token = request.cookies.get('al_ihsan_token')?.value;

        if (!token) {
            // Unauthenticated access attempt
            const url = request.nextUrl.clone();
            url.pathname = '/'; // Redirect to home or a login page
            // For this specific setup where admin is an overlay on admin.html, 
            // the overlay handles the UI, but we block data via API.
            // However, enterprise-grade means we should ideally redirect or block.
            return NextResponse.redirect(new URL('/index.html', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin.html', '/api/:path*'],
};
