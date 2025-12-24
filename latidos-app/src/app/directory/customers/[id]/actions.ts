"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateCustomer(id: string, data: {
    name: string;
    taxId: string;
    phone?: string;
    email?: string;
    address?: string;
}) {
    try {
        // Validation: Check if taxId is taken by another customer
        const existing = await prisma.customer.findFirst({
            where: {
                taxId: data.taxId,
                id: { not: id } // Exclude current customer
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
