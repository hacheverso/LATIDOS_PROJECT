"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { auth } from "@/auth";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

export async function getUsers() {
    const orgId = await getOrgId();
    return await prisma.user.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            invitationToken: true,
            permissions: true,
            createdAt: true
        }
    });
}

export async function createUser(data: { name: string, email: string, role: string }) {
    const orgId = await getOrgId();
    // Check duplication in Org? Ideally email is unique system-wide for login...
    // Schema: User.email is @unique globally.
    // So we check globally.
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("El email ya está registrado en el sistema.");

    // Generate Token
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 48); // 48h expiry

    await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            // Password and PIN are null until accepted.
            status: 'PENDING',
            invitationToken: token,
            invitationExpires: expires,
            // @ts-ignore
            role: data.role,
            organizationId: orgId, // Crucial
            permissions: {
                canEditSales: data.role === 'ADMIN',
                canViewCosts: data.role === 'ADMIN',
                canManageInventory: data.role !== 'DOMICILIARIO'
            }
        }
    });

    // Construct Link (Manual Copy)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/invite/accept?token=${token}`;

    revalidatePath("/directory/team");
    return { success: true, invitationLink };
}

export async function togglePermission(userId: string, permission: string, currentValue: boolean) {
    const orgId = await getOrgId();
    // Verify user in Org
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId }, select: { permissions: true } });
    if (!user) throw new Error("Usuario no encontrado o no autorizado.");

    const currentPermissions = (user.permissions as any) || {};

    await prisma.user.update({
        where: { id: userId },
        data: {
            permissions: {
                ...currentPermissions,
                [permission]: !currentValue
            }
        }
    });

    revalidatePath("/directory/team");
    return { success: true };
}

export async function resetUserPin(userId: string, newPin: string) {
    const orgId = await getOrgId();
    // Verify user
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
    if (!user) throw new Error("Usuario no encontrado.");

    const pinHash = await hash(newPin, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { securityPin: pinHash }
    });
    revalidatePath("/directory/team");
    return { success: true };
}

export async function deleteUser(userId: string) {
    const orgId = await getOrgId();
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });

    if (!user) throw new Error("Usuario no encontrado.");

    // Prevent deleting self? Or at least prevent deleting the last Admin? 
    // Usually 'admin@latidos.com' was hardcoded, now we just protect admins slightly or rely on common sense.
    // If user tries to delete themselves?
    const session = await auth();
    if (session?.user?.id === userId) throw new Error("No puedes eliminarte a ti mismo.");

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/directory/team");
    return { success: true };
}
