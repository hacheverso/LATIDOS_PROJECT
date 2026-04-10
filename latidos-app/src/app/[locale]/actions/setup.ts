"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { signIn } from "@/auth";

/**
 * Checks if the system has zero users (First Run).
 */
export async function isFirstUsage() {
    try {
        const count = await prisma.user.count();
        return count === 0;
    } catch (error) {
        console.error("Error checking first usage:", error);
        return false; // Fail safe
    }
}

/**
 * Creates the initial Organization and Admin User.
 * Seeds a default 'CASH' PaymentAccount.
 * Creates a linked Operator for POS operations.
 */
export async function createAdminOrganization(formData: FormData) {
    const orgName = formData.get("orgName") as string;
    const nit = formData.get("nit") as string;
    const adminName = formData.get("adminName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const pin = formData.get("pin") as string;

    if (!orgName || !nit || !adminName || !email || !password) {
        return { error: "Todos los campos son obligatorios." };
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return { error: "El PIN debe ser de exactamente 4 dígitos numéricos." };
    }

    // 1. Double check security
    const isFirst = await isFirstUsage();
    if (!isFirst) {
        return { error: "El sistema ya está inicializado. No se puede crear otro admin principal." };
    }

    try {
        const hashedPassword = await hash(password, 10);
        const hashedPin = await hash(pin, 10);

        // Transaction for atomic setup
        await prisma.$transaction(async (tx) => {
            // 2. Create Organization
            const org = await tx.organization.create({
                data: {
                    name: orgName,
                    slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000),
                }
            });

            // 3. Create Organization Profile with NIT
            await tx.organizationProfile.create({
                data: {
                    organizationId: org.id,
                    name: orgName,
                    nit: nit,
                    defaultDueDays: 30,
                }
            });

            // 4. Create Admin User
            const adminUser = await tx.user.create({
                data: {
                    name: adminName,
                    email,
                    password: hashedPassword,
                    role: "ADMIN",
                    status: "ACTIVE",
                    organizationId: org.id,
                    securityPin: hashedPin,
                    staffPin: hashedPin
                }
            });

            // 5. Create Operator linked to Admin (Dual Identity for POS)
            await tx.operator.create({
                data: {
                    name: adminName,
                    securityPin: hashedPin,
                    organizationId: org.id,
                    userId: adminUser.id,
                    isActive: true
                }
            });

            // 6. Seed Payment Account (Essential for Sales)
            await tx.paymentAccount.create({
                data: {
                    name: "Efectivo (Caja General)",
                    type: "CASH",
                    currency: "COP",
                    balance: 0,
                    organizationId: org.id
                }
            });

            // 7. Seed Default Supplier
            await tx.supplier.create({
                data: {
                    name: "Proveedor General",
                    nit: "222222222",
                    email: "contacto@proveedor.com",
                    organizationId: org.id
                }
            });

            // 8. Seed Default Logistic Zone
            await tx.logisticZone.create({
                data: {
                    name: "Zona Local (Default)",
                    organizationId: org.id
                }
            });
        });

    } catch (error) {
        console.error("Setup Error:", error);
        return { error: "Error al configurar el sistema: " + (error instanceof Error ? error.message : "Desconocido") };
    }

    // Attempt Login
    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        return { success: true };
    } catch (authError) {
        return { success: true };
    }
}
