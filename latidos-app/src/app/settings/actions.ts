"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Utility to generate a key
function generateKey() {
    return 'lk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function getSettings() {
    let profile = await prisma.organizationProfile.findFirst();

    // Auto-generate key if missing (Migration might have left it null)
    if (profile && !profile.backupApiKey) {
        const newKey = generateKey();
        profile = await prisma.organizationProfile.update({
            where: { id: profile.id },
            data: { backupApiKey: newKey }
        });
    }

    return profile;
}

export async function regenerateApiKey() {
    const existing = await prisma.organizationProfile.findFirst();
    if (existing) {
        const newKey = generateKey();
        await prisma.organizationProfile.update({
            where: { id: existing.id },
            data: { backupApiKey: newKey }
        });
        revalidatePath("/settings");
        return newKey;
    }
    return null;
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
