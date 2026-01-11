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
            const isOnDashboard = nextUrl.pathname === '/' ||
                nextUrl.pathname.startsWith('/dashboard') ||
                nextUrl.pathname.startsWith('/inventory') ||
                nextUrl.pathname.startsWith('/sales') ||
                nextUrl.pathname.startsWith('/directory') ||
                nextUrl.pathname.startsWith('/finance') ||
                nextUrl.pathname.startsWith('/logistics') ||
                nextUrl.pathname.startsWith('/settings');

            const isOnLogin = nextUrl.pathname.startsWith('/login');
            const isOnRegister = nextUrl.pathname.startsWith('/register');
            const isOnSetup = nextUrl.pathname.startsWith('/register-admin');

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn && (isOnLogin || isOnRegister || isOnSetup)) {
                // If on login/register/setup page but logged in, send to root
                return Response.redirect(new URL('/', nextUrl));
            }

            // Allow public access to all other routes (invite, register, etc.)
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
    session: { strategy: 'jwt' },
} satisfies NextAuthConfig;
