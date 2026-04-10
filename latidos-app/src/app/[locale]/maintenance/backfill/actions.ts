"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function runBackfill() {
    try {
        // 1. Ensure Default Org
        let defaultOrg = await prisma.organization.findFirst({
            where: { name: "Organización Principal" }
        });

        if (!defaultOrg) {
            // Check if ANY org exists
            const anyOrg = await prisma.organization.findFirst();
            if (anyOrg) {
                defaultOrg = anyOrg;
            } else {
                // Create one
                defaultOrg = await prisma.organization.create({
                    data: {
                        name: "Organización Principal",
                        slug: "main-" + Math.floor(Math.random() * 1000)
                    }
                });

                // Create Profile
                await prisma.organizationProfile.create({
                    data: {
                        organizationId: defaultOrg.id,
                        name: "Organización Principal"
                    }
                });
            }
        }

        const orgId = defaultOrg.id;
        const results: Record<string, number> = {};

        // 2. Backfill Models
        // Users
        const users = await prisma.user.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['users'] = users.count;

        // Customers
        const customers = await prisma.customer.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['customers'] = customers.count;

        // Products
        const products = await prisma.product.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['products'] = products.count;

        // Categories
        const categories = await prisma.category.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['categories'] = categories.count;

        // Suppliers
        const suppliers = await prisma.supplier.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['suppliers'] = suppliers.count;

        // Purchases
        const purchases = await prisma.purchase.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['purchases'] = purchases.count;

        // Sales
        const sales = await prisma.sale.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['sales'] = sales.count;

        // Payments
        const payments = await prisma.payment.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['payments'] = payments.count;

        // PaymentAccounts
        const accounts = await prisma.paymentAccount.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['accounts'] = accounts.count;

        // Transactions
        const transactions = await prisma.transaction.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['transactions'] = transactions.count;

        // LogisticZones
        const zones = await prisma.logisticZone.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['zones'] = zones.count;

        // LogisticsTasks
        const tasks = await prisma.logisticsTask.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['tasks'] = tasks.count;

        // StockAdjustments
        const adjustments = await prisma.stockAdjustment.updateMany({
            where: { organizationId: null },
            data: { organizationId: orgId }
        });
        results['adjustments'] = adjustments.count;


        revalidatePath("/");
        return { success: true, results, orgName: defaultOrg.name };

    } catch (error: any) {
        console.error("Backfill Error:", error);
        return { success: false, error: error.message };
    }
}
