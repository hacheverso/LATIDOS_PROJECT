"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Utility to generate a key
function generateKey() {
    return 'lk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function getSettings() {
    let profile = await prisma.organizationProfile.findFirst();

    if (!profile) {
        // Create default profile if none exists
        profile = await prisma.organizationProfile.create({
            data: {
                name: "Mi Negocio",
                backupApiKey: generateKey()
            }
        });
    } else if (!profile.backupApiKey) {
        // Auto-generate key if missing on existing profile
        const newKey = generateKey();
        profile = await prisma.organizationProfile.update({
            where: { id: profile.id },
            data: { backupApiKey: newKey }
        });
    }

    return profile;
}

export async function regenerateApiKey() {
    try {
        const existing = await prisma.organizationProfile.findFirst();
        if (existing) {
            const newKey = generateKey();
            await prisma.organizationProfile.update({
                where: { id: existing.id },
                data: { backupApiKey: newKey }
            });
            revalidatePath("/settings");
            return { success: true, key: newKey };
        }
        return { success: false, error: "No se encontró el perfil de la organización." };
    } catch (error: any) {
        console.error("Error regenerating API key:", error);
        return { success: false, error: error.message || "Error al actualizar la base de datos." };
    }
}

export async function updateSettings(data: {
    name: string;
    nit: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    footerMsg?: string;
}) {
    // Check if a profile exists
    const existing = await prisma.organizationProfile.findFirst();

    if (existing) {
        await prisma.organizationProfile.update({
            where: { id: existing.id },
            data
        });
    } else {
        await prisma.organizationProfile.create({
            data
        });
    }

    revalidatePath("/settings");
    revalidatePath("/sales"); // Invoices need this info
}
