import { prisma } from "@/lib/prisma";
import PurchasesClient from "./PurchasesClient";

export const dynamic = 'force-dynamic';

import { auth } from "@/auth";

export default async function PurchasesPage() {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    const purchases = await prisma.purchase.findMany({
        where: {
            organizationId: orgId
        },
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
