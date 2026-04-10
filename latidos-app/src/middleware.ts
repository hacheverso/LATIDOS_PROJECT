import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import createIntlMiddleware from 'next-intl/middleware';

const intlMiddleware = createIntlMiddleware({
    locales: ['en', 'es'],
    defaultLocale: 'en'
});

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    // Skip intl for API routes
    if (req.nextUrl.pathname.startsWith('/api')) {
        return;
    }
    return intlMiddleware(req);
});

export const config = {
    // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
    matcher: ['/((?!api|_next/static|_next/image|_vercel|.*\\.png$).*)'],
};
