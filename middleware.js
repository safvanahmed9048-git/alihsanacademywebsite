export default function middleware(request) {
    const { pathname } = new URL(request.url);

    // Protect only the administrative API routes
    // (Add any other sensitive paths here that aren't the login page itself)
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/protected')) {
        const cookieHeader = request.headers.get('cookie') || '';
        const hasToken = cookieHeader.includes('al_ihsan_token');

        if (!hasToken) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    return new Response(null, {
        headers: { 'x-middleware-next': '1' }
    });
}

export const config = {
    matcher: ['/admin.html', '/api/:path*'],
};
