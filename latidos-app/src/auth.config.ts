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
            // Normalize pathname by removing locale prefixes if they exist
            let normalizedPath = nextUrl.pathname;
            if (normalizedPath.startsWith('/en/')) {
                normalizedPath = normalizedPath.replace('/en', '');
            } else if (normalizedPath === '/en') {
                normalizedPath = '/';
            } else if (normalizedPath.startsWith('/es/')) {
                normalizedPath = normalizedPath.replace('/es', '');
            } else if (normalizedPath === '/es') {
                normalizedPath = '/';
            }

            const isOnDashboard =
                normalizedPath.startsWith('/dashboard') ||
                normalizedPath.startsWith('/inventory') ||
                normalizedPath.startsWith('/sales') ||
                normalizedPath.startsWith('/directory') ||
                normalizedPath.startsWith('/finance') ||
                normalizedPath.startsWith('/logistics') ||
                normalizedPath.startsWith('/settings');

            const isOnLogin = normalizedPath.startsWith('/login');
            const isOnRegister = normalizedPath.startsWith('/register');
            const isOnSetup = normalizedPath.startsWith('/setup');
            const isRoot = normalizedPath === '/';

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
                // @ts-ignore
                const permissions = typeof auth.user.permissions === 'string'
                    ? JSON.parse(auth.user.permissions)
                    : (auth.user.permissions || {});

                // LOGISTICA: Strict Jail by default, but allow access if specific permissions are given
                if (role === 'LOGISTICA') {
                    const isAllowedLogistics = normalizedPath.startsWith('/logistics');
                    const isAllowedSales = permissions.canEditSales && (normalizedPath.startsWith('/sales') || normalizedPath.startsWith('/directory')); // they might need directory for customers
                    const isAllowedInventory = permissions.canManageInventory && normalizedPath.startsWith('/inventory');
                    const isAllowedFinance = permissions.canViewFinance && normalizedPath.startsWith('/finance');
                    const isAllowedDashboard = normalizedPath.startsWith('/dashboard') && (permissions.canViewFinance || permissions.canManageInventory || permissions.canEditSales);

                    const isAllowedAssets = normalizedPath.startsWith('/_next') || normalizedPath.startsWith('/api') || normalizedPath === '/';

                    if (!isAllowedLogistics && !isAllowedSales && !isAllowedInventory && !isAllowedFinance && !isAllowedDashboard && !isAllowedAssets) {
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
