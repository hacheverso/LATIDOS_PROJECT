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

export async function getProviders(query?: string) {
    const orgId = await getOrgId();
    try {
        const where: any = { organizationId: orgId };

        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { nit: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
            ];
        }

        const providers = await prisma.supplier.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { purchases: true } } }
        });

        return { success: true, data: providers };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Error al obtener proveedores" };
    }
}

export async function createProvider(data: {
    name: string;
    nit: string;
    phone?: string;
    email?: string;
    address?: string;
    contactName?: string;
}) {
    const orgId = await getOrgId();
    try {
        // Validate NIT uniqueness in Org
        const existing = await prisma.supplier.findFirst({ where: { nit: data.nit, organizationId: orgId } });
        if (existing) return { success: false, error: "El NIT/Tax ID ya está registrado en esta organización." };

        const provider = await prisma.supplier.create({
            data: {
                name: data.name.toUpperCase(),
                nit: data.nit,
                phone: data.phone,
                email: data.email,
                address: data.address,
                contactName: data.contactName?.toUpperCase(),
                organizationId: orgId
            },
        });

        revalidatePath("/directory/providers");
        return { success: true, data: provider };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Error al crear proveedor" };
    }
}

export async function deleteProvider(id: string) {
    const orgId = await getOrgId();
    try {
        // Verify ownership
        const provider = await prisma.supplier.findFirst({ where: { id, organizationId: orgId } });
        if (!provider) return { success: false, error: "Proveedor no encontrado." };

        await prisma.supplier.delete({ where: { id } });
        revalidatePath("/directory/providers");
        return { success: true };
    } catch (_error) {
        return { success: false, error: "No se puede eliminar el proveedor (posiblemente tiene compras asociadas)." };
    }
}
