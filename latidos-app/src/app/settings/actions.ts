"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

// --- Helper: Get Org ID ---
async function getOrgId() {
    const session = await auth();
    // @ts-ignore
    if (!session?.user?.organizationId) throw new Error("Acceso denegado: Organización no identificada.");
    // @ts-ignore
    return session.user.organizationId;
}

// Utility to generate a key
function generateKey() {
    return 'lk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function getSettings() {
    const orgId = await getOrgId();

    // Find Profile for THIS Org
    let profile = await prisma.organizationProfile.findUnique({
        where: { organizationId: orgId }
    });

    if (!profile) {
        // Create default profile if none exists for this org
        profile = await prisma.organizationProfile.create({
            data: {
                name: "Mi Negocio",
                backupApiKey: generateKey(),
                organizationId: orgId
            }
        });
    } else if (!profile.backupApiKey) {
        // Auto-generate key if missing on existing profile
        const newKey = generateKey();
        profile = await prisma.organizationProfile.update({
            where: { id: profile.id }, // ID is safe here (unique)
            data: { backupApiKey: newKey }
        });
    }

    return profile;
}

export async function regenerateApiKey() {
    const orgId = await getOrgId();
    try {
        const existing = await prisma.organizationProfile.findUnique({ where: { organizationId: orgId } });
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
    defaultDueDays?: number;
}) {
    const orgId = await getOrgId();

    // Check if a profile exists
    const existing = await prisma.organizationProfile.findUnique({ where: { organizationId: orgId } });

    if (existing) {
        await prisma.organizationProfile.update({
            where: { id: existing.id },
            data
        });
    } else {
        await prisma.organizationProfile.create({
            data: {
                ...data,
                organizationId: orgId
            }
        });
    }

    revalidatePath("/settings");
    revalidatePath("/notifications");
}

export async function bulkUpdateDueDates(newDays: number) {
    const orgId = await getOrgId();
    // 1. Find all sales (efficient selection)
    const allSales = await prisma.sale.findMany({
        where: { organizationId: orgId },
        select: {
            id: true,
            date: true,
            total: true,
            amountPaid: true
        }
    });

    // 2. Filter for PENDING (Balance > 0)
    const pendingSales = allSales.filter(sale => {
        const total = Number(sale.total);
        const paid = Number(sale.amountPaid || 0);
        return (total - paid) > 0; // Strictly positive debt
    });

    // 3. Update each sale's dueDate
    if (pendingSales.length === 0) {
        return { success: true, count: 0 };
    }

    await prisma.$transaction(
        pendingSales.map(sale => {
            const newDueDate = new Date(sale.date);
            newDueDate.setDate(newDueDate.getDate() + newDays);

            return prisma.sale.update({
                where: { id: sale.id },
                data: { dueDate: newDueDate }
            });
        })
    );

    revalidatePath("/sales");
    return { success: true, count: pendingSales.length };
}
