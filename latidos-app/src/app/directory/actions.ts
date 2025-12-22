"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProviders(query?: string) {
    try {
        const where = query
            ? {
                OR: [
                    { name: { contains: query } },
                    { nit: { contains: query } },
                    { email: { contains: query } },
                ],
            }
            : {};

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
    try {
        // Validate NIT uniqueness
        const existing = await prisma.supplier.findUnique({ where: { nit: data.nit } });
        if (existing) return { success: false, error: "El NIT/Tax ID ya está registrado." };

        const provider = await prisma.supplier.create({
            data: {
                name: data.name.toUpperCase(),
                nit: data.nit,
                phone: data.phone,
                email: data.email,
                address: data.address,
                contactName: data.contactName?.toUpperCase(),
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
    try {
        await prisma.supplier.delete({ where: { id } });
        revalidatePath("/directory/providers");
        return { success: true };
    } catch (error) {
        return { success: false, error: "No se puede eliminar el proveedor (posiblemente tiene compras asociadas)." };
    }
}
