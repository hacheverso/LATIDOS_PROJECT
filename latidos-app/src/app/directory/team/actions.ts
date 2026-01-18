"use server";

import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { sendInvitationEmail } from "@/lib/email";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

export async function getCurrentUserRole() {
    const session = await auth();
    // @ts-ignore
    return session?.user?.role as string | null;
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
    // Check duplication (Scoped to Organization now)
    const existing = await prisma.user.findFirst({
        where: {
            email: data.email,
            organizationId: orgId
        }
    });
    if (existing) throw new Error("El email ya está registrado en esta organización.");

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
                canManageInventory: data.role !== 'LOGISTICA'
            }
        }
    });

    // Construct Link (Manual Copy)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/invite/accept?token=${token}`;

    // Send Email (Async, don't await strictly if you want speed, but good to await to catch errors if critical)
    await sendInvitationEmail(data.email, token, data.name);

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

// --- OPERATOR ACTIONS (Dual Identity) ---

export async function getOperators() {
    const orgId = await getOrgId();
    return await prisma.operator.findMany({
        where: { organizationId: orgId, isActive: true },
        orderBy: { name: 'asc' }
    });
}

export async function createOperator(name: string, pin: string) {
    const orgId = await getOrgId();
    if (!pin || pin.length < 4) throw new Error("PIN inválido (min 4 dígitos).");

    // Check duplication (Name + Org)
    const existing = await prisma.operator.findFirst({ where: { name, organizationId: orgId } });
    if (existing) throw new Error("Ya existe un operador con este nombre.");

    const securityPin = await hash(pin, 10);
    await prisma.operator.create({
        data: {
            name,
            securityPin,
            organizationId: orgId,
            isActive: true
        }
    });
    revalidatePath("/directory/team");
    return { success: true };
}

export async function deleteOperator(operatorId: string) {
    const orgId = await getOrgId();
    // Soft delete usually better, but for MVP delete is fine if no relations. 
    // If relations exist, Prisma might complain unless we cascade or just set isActive=false.
    // Let's use isActive = false for safety.
    await prisma.operator.update({
        where: { id: operatorId, organizationId: orgId },
        data: { isActive: false }
    });
    revalidatePath("/directory/team");
    return { success: true };
}

export async function verifyOperatorPin(operatorId: string, pin: string) {
    // 1. Fetch Operator (Active only)
    const operator = await prisma.operator.findUnique({
        where: { id: operatorId }
    });
    if (!operator) return { success: false, error: "Operador no encontrado." };
    if (!operator.isActive) return { success: false, error: "Operador inactivo." };

    // 2. Compare PIN
    const isValid = await compare(pin, operator.securityPin);
    if (!isValid) return { success: false, error: "PIN Incorrecto." };

    return { success: true, operatorId: operator.id, name: operator.name };
}

export async function identifyOperatorByPin(pin: string) {
    const orgId = await getOrgId();
    if (!pin) return { success: false, error: "PIN vacío." };

    // Fetch all active operators
    const operators = await prisma.operator.findMany({
        where: { organizationId: orgId, isActive: true }
    });

    // Iterate and compare (Not efficient for millions, but fine for < 50 staff)
    // We cannot search by hash directly.
    for (const op of operators) {
        const isMatch = await compare(pin, op.securityPin);
        if (isMatch) {
            return { success: true, operator: { id: op.id, name: op.name } };
        }
    }

    return { success: false, error: "PIN no reconocido." };
}
