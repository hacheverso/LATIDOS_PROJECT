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

export async function updateCustomer(id: string, data: {
    name: string;
    taxId: string;
    phone?: string;
    email?: string;
    address?: string;
    sector?: string;
}) {
    const orgId = await getOrgId();
    try {
        // Verify Customer belongs to Org
        const customerCheck = await prisma.customer.findFirst({ where: { id, organizationId: orgId } });
        if (!customerCheck) throw new Error("Cliente no encontrado o no autorizado.");

        // Sync Sector Logic (Scoped by Org)
        if (data.sector) {
            const sectorName = data.sector.trim();
            if (sectorName) {
                let existingZone = await prisma.logisticZone.findFirst({ where: { name: sectorName, organizationId: orgId } });
                if (!existingZone) {
                    await prisma.logisticZone.create({ data: { name: sectorName, organizationId: orgId } });
                }
            }
        }

        // Validation: Check if taxId is taken by another customer (in this org)
        const existing = await prisma.customer.findFirst({
            where: {
                taxId: data.taxId,
                organizationId: orgId,
                id: { not: id }
            }
        });

        if (existing) {
            return { success: false, error: "El Documento/NIT ya está registrado por otro cliente." };
        }

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name: data.name.toUpperCase(),
                taxId: data.taxId,
                phone: data.phone,
                email: data.email,
                address: data.address,
                sector: data.sector
            }
        });

        revalidatePath(`/directory/customers/${id}`);
        revalidatePath("/directory/customers");
        return { success: true, data: customer };
    } catch (error) {
        console.error("Error updating customer:", error);
        return { success: false, error: "Error al actualizar cliente." };
    }
}
