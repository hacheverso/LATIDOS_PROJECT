import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/inventory/ProductDetailView";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) {
        notFound();
    }

    const product = await prisma.product.findFirst({
        where: { id: params.id, organizationId: orgId },
        include: {
            instances: {
                orderBy: { createdAt: 'desc' },
                include: {
                    purchase: {
                        include: { supplier: true }
                    },
                    sale: {
                        include: { customer: true }
                    },
                    adjustment: {
                        include: { user: true }
                    }
                }
            }
        }
    });

    if (!product) {
        notFound();
    }

    // Calculations
    const stockCount = product.instances.filter(i => i.status === "IN_STOCK").length;

    // Serialize Decimal
    const safeProduct = {
        ...product,
        // instances: product.instances // We don't need to pass all instances to client if not used, or serialize them if we do
    };

    return <ProductDetailView product={safeProduct} stockCount={stockCount} />;
}
