import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;

            // Console log for Vercel debugging
            console.log(`[Middleware] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}`);

            // Protect root and main modules
            const isOnDashboard = nextUrl.pathname === '/' ||
                nextUrl.pathname.startsWith('/dashboard') ||
                nextUrl.pathname.startsWith('/inventory') ||
                nextUrl.pathname.startsWith('/sales') ||
                nextUrl.pathname.startsWith('/directory');

            const isOnLogin = nextUrl.pathname.startsWith('/login');

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn && isOnLogin) {
                // If on login page but logged in, send to root (Executive Dashboard)
                return Response.redirect(new URL('/', nextUrl));
            }
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
