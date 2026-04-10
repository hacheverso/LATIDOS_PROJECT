'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

export async function updateProfile(data: { phone?: string, address?: string }) {
    const orgId = await getOrgId();
    const session = await auth();
    if (!session?.user?.email) throw new Error("No autorizado");

    // Strictly update user in this org
    const user = await prisma.user.findFirst({ where: { email: session.user.email, organizationId: orgId } });
    if (!user) throw new Error("Usuario no encontrado.");

    await prisma.user.update({
        where: { id: user.id },
        data: {
            phone: data.phone,
            address: data.address
        }
    });

    revalidatePath("/profile");
    return { success: true };
}

import { hash } from "bcryptjs";

// ... existing imports ...

export async function setUserPassword(password: string) {
    const orgId = await getOrgId();
    const session = await auth();
    if (!session?.user?.email) throw new Error("No autorizado");

    // Strictly update user in this org
    const user = await prisma.user.findFirst({ where: { email: session.user.email, organizationId: orgId } });
    if (!user) throw new Error("Usuario no encontrado.");

    const hashedPassword = await hash(password, 12);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    revalidatePath("/profile");
    return { success: true };
}

export async function getUserProfile() {
    const session = await auth();
    if (!session?.user?.email) return null;

    // @ts-ignore
    const userId = session.user.id;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId as string },
        select: {
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            imageUrl: true,
            status: true,
            password: true, // Select password to check existence
            organizationId: true // Good for debug
        }
    });

    if (!user) return null;

    // Return user without the actual password hash, just boolean
    return {
        ...user,
        hasPassword: !!user.password,
        password: null // Don't leak hash
    };
}
