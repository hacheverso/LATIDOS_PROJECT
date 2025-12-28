import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/inventory/ProductDetailView";

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const product = await prisma.product.findUnique({
        where: { id: params.id },
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
