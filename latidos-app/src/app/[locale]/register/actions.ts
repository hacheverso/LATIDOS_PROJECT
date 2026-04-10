"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { signIn } from "@/auth";

export async function registerOrganization(data: {
    orgName: string;
    userName: string;
    email: string;
    password: string;
}) {
    const { orgName, userName, email, password } = data;

    // 1. Validate uniqueness
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
        throw new Error("El correo electrónico ya está registrado.");
    }

    // 2. Hash Password
    const hashedPassword = await hash(password, 10);

    // 3. Create Org + User + Profile in Transaction
    try {
        const result = await prisma.$transaction(async (tx) => {
            // A. Create Organization
            const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);

            // @ts-ignore
            const org = await tx.organization.create({
                data: {
                    name: orgName,
                    slug: slug
                }
            });

            // B. Create Organization Profile
            // @ts-ignore
            await tx.organizationProfile.create({
                data: {
                    organizationId: org.id,
                    name: orgName
                }
            });

            // C. Create Admin User
            // @ts-ignore
            const user = await tx.user.create({
                data: {
                    name: userName,
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    organizationId: org.id,
                    permissions: { canEditSales: true, canViewCosts: true, canManageInventory: true }
                }
            });

            return user;
        });

        return { success: true };

    } catch (error: any) {
        console.error("Registration Error:", error);
        throw new Error("Error al crear la organización. Inténtalo de nuevo.");
    }
}
