import { prisma } from "@/lib/prisma";
import PurchasesClient from "./PurchasesClient";

export const dynamic = 'force-dynamic';

export default async function PurchasesPage() {
    const purchases = await prisma.purchase.findMany({
        include: {
            supplier: true,
            instances: {
                include: {
                    product: true // Include product for Excel Export (SKU, Name)
                }
            },
        },
        orderBy: {
            date: 'desc'
        }
    });

    return <PurchasesClient purchases={purchases} />;
}
