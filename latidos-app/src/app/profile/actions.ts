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

export async function getUserProfile() {
    const session = await auth();
    if (!session?.user?.email) return null;

    // We don't necessarily need to throw if org is missing for just VIEWING one's own profile, 
    // but consistent behavior requires org check to avoid cross-tenant leaks if emails were somehow shared (unlikely with unique constraint).
    // Safest is to findFirst with email.
    return await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            imageUrl: true,
            status: true,
            organizationId: true // Good for debug
        }
    });
}
