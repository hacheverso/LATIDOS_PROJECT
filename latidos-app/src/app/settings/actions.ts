"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSettings() {
    return await prisma.organizationProfile.findFirst();
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
