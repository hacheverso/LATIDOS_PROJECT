"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { sendInvitationEmail } from "@/lib/email";

export async function getUsers() {
    return await prisma.user.findMany({
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
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error("El email ya está registrado.");

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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { permissions: true } });
    if (!user) throw new Error("Usuario no encontrado.");

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
    const pinHash = await hash(newPin, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { securityPin: pinHash }
    });
    revalidatePath("/directory/team");
    return { success: true };
}

export async function deleteUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email === 'admin@latidos.com') {
        throw new Error("No puedes eliminar al Administrador Principal.");
    }

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/directory/team");
    return { success: true };
}
