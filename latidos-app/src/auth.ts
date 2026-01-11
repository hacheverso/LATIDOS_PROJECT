import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";

import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authConfig } from "./auth.config";

async function getUser(email: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user;
    } catch (error) {
        throw new Error("Failed to fetch user.");
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    // @ts-ignore - Adapter type mismatch in beta versions
    adapter: PrismaAdapter(prisma),
    trustHost: true,
    session: { strategy: "jwt" }, // We use JWT but Adapter handles User persistence
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true, // Allow linking if email matches
        }),
        // Apple({
        //     clientId: process.env.APPLE_ID,
        //     clientSecret: process.env.APPLE_SECRET, // Generated JWT or specific Apple config
        // }),
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
        signIn: '/login',
    },
    events: {
        async createUser({ user }) {
            // Automatically create an Organization for new Social Login users
            try {
                if (!user.email) return;

                // Check if already in an org (unlikely if just created, but safety check)
                // @ts-ignore
                if (user.organizationId) return;

                const orgName = `Organización de ${user.name || 'Usuario'}`;
                const slug = (user.name || 'org').toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 10000);

                await prisma.$transaction(async (tx: any) => {
                    const org = await tx.organization.create({
                        data: {
                            name: orgName,
                            slug: slug
                        }
                    });

                    await tx.organizationProfile.create({
                        data: {
                            organizationId: org.id,
                            name: orgName
                        }
                    });

                    await tx.user.update({
                        where: { id: user.id },
                        data: {
                            organizationId: org.id,
                            role: 'ADMIN', // Owner
                            status: 'ACTIVE'
                        }
                    });
                });
                console.log(`Organization created for user ${user.id}`);
            } catch (error) {
                console.error("Error creating organization for new user:", error);
            }
        }
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub; // Ensure ID is consistent
            }

            // @ts-ignore
            session.user.role = token.role;
            // @ts-ignore
            session.user.permissions = token.permissions;
            // @ts-ignore
            session.user.organizationId = token.organizationId;
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                // @ts-ignore
                token.role = user.role;
                // @ts-ignore
                token.permissions = user.permissions;
                // @ts-ignore
                token.organizationId = user.organizationId;
            }

            // Refetch user data if organizationId is missing in token (e.g. just created / trigger update)
            // @ts-ignore
            if (!token.organizationId && token.email) {
                const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
                if (dbUser) {
                    // @ts-ignore
                    token.organizationId = dbUser.organizationId;
                    // @ts-ignore
                    token.role = dbUser.role;
                }
            }

            return token;
        }
    }
});
