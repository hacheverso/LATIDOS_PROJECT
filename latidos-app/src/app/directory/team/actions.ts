"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

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

export async function createUser(data: { name: string, email: string, role: string, pin?: string }) {
    const orgId = await getOrgId();
    // Check duplication
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("El email ya está registrado en el sistema.");

    // PIN Logic
    let plainPin = data.pin;
    if (!plainPin || plainPin.trim() === "") {
        plainPin = Math.floor(1000 + Math.random() * 9000).toString(); // Generate 4 digit
    }
    const hashedPin = await hash(plainPin, 10);

    // Generate Token
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 48); // 48h expiry

    await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            status: 'PENDING', // Still pending acceptance of invite, but PIN is pre-set for immediate POS use if needed? 
            // Actually, if we give them a PIN, maybe they can just log in via POS immediately? 
            // For now, keep status PENDING until they claim account via email, OR set ACTIVE if we want immediate use.
            // User requested "Al crear un usuario... generar PIN". If it's for "Ventas", they might just start selling.
            // Let's keep PENDING to force email verification, BUT saving the PIN allows them to auth actions if we let them.
            // But usually auth requires existing user.
            invitationToken: token,
            invitationExpires: expires,
            role: data.role as Role,
            staffPin: hashedPin,
            securityPin: hashedPin, // Sync for compatibility
            organizationId: orgId,
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
    return { success: true, invitationLink, pin: plainPin };
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
