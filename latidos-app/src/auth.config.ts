import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            // Console log for Vercel debugging
            // console.log(`[Middleware] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}`);

            // Protect root and main modules
            // Protect root and main modules (Root is now public landing)
            const isOnDashboard =
                nextUrl.pathname.startsWith('/dashboard') ||
                nextUrl.pathname.startsWith('/inventory') ||
                nextUrl.pathname.startsWith('/sales') ||
                nextUrl.pathname.startsWith('/directory') ||
                nextUrl.pathname.startsWith('/finance') ||
                nextUrl.pathname.startsWith('/logistics') ||
                nextUrl.pathname.startsWith('/settings');

            const isOnLogin = nextUrl.pathname.startsWith('/login');
            const isOnRegister = nextUrl.pathname.startsWith('/register');
            const isOnSetup = nextUrl.pathname.startsWith('/setup');
            const isRoot = nextUrl.pathname === '/';

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn && (isOnLogin || isOnRegister || isOnSetup || isRoot)) {
                // If logged in and visiting auth/landing pages, send to dashboard
                // NOTE: Role-based redirect logic (e.g. domiciliary) is handled in the Dashboard Page or separate logic
                // For middleware, we just want to get them OUT of public pages.
                // We'll redirect to / which is now public, BUT if they are logged in, 
                // we should redirect them to /dashboard or let the PAGE handle the redirect.
                // Actually, if isRoot is true and isLoggedIn, we want to redirect to /dashboard.
                return Response.redirect(new URL('/dashboard', nextUrl));
            }

            // Role-based Security Gates
            if (isLoggedIn) {
                // @ts-ignore
                const role = auth.user.role;

                // LOGISTICA: Strict Jail -> Only /logistics allowed
                if (role === 'LOGISTICA') {
                    if (!nextUrl.pathname.startsWith('/logistics') &&
                        !nextUrl.pathname.startsWith('/_next') &&
                        !nextUrl.pathname.startsWith('/api')) { // Allow assets/api
                        return Response.redirect(new URL('/logistics', nextUrl));
                    }
                }
            }

            // Allow public access to all other routes (invite, register, etc.)
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
    session: { strategy: 'jwt' },
} satisfies NextAuthConfig;
