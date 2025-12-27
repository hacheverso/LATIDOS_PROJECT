'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: { phone?: string, address?: string }) {
    const session = await auth();
    if (!session?.user?.email) throw new Error("No autorizado");

    await prisma.user.update({
        where: { email: session.user.email },
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

    return await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            imageUrl: true,
            status: true
        }
    });
}
