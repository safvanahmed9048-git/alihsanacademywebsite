export default function middleware(request) {
    const { pathname } = new URL(request.url);

    // Protect admin.html and all CMS/Admin APIs
    if (pathname.startsWith('/admin.html') || pathname.startsWith('/api/admin')) {
        const cookieHeader = request.headers.get('cookie') || '';
        const hasToken = cookieHeader.includes('al_ihsan_token');

        if (!hasToken) {
            // Unauthenticated access attempt
            // Redirect to home or login page
            return Response.redirect(new URL('/index.html', request.url), 307);
        }
    }

    return new Response(null, {
        headers: { 'x-middleware-next': '1' }
    });
}

export const config = {
    matcher: ['/admin.html', '/api/:path*'],
};
