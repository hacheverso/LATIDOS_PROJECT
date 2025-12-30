import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authConfig } from "./auth.config";

async function getUser(email: string) {
    try {
        // Timeout after 5s to prevent Vercel Function timeouts
        const user = await Promise.race([
            prisma.user.findUnique({ where: { email } }),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('DATABASE_TIMEOUT')), 5000))
        ]);
        return user;
    } catch (error) {
        throw new Error("Failed to fetch user.");
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    trustHost: true,
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user || !user.password) return null;

                    const passwordsMatch = await compare(password, user.password);
                    if (passwordsMatch) return user;
                }

                return null;
            }
        })
    ],
    pages: {
        signIn: '/login', // Custom login page
    },
    callbacks: {
        async session({ session, token }) {
            // @ts-ignore
            session.user.id = token.id;
            // @ts-ignore
            session.user.role = token.role;
            // @ts-ignore
            session.user.permissions = token.permissions;
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // @ts-ignore
                token.role = user.role;
                // @ts-ignore
                token.permissions = user.permissions;
            }
            return token;
        }
    }
});
