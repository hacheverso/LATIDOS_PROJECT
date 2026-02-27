import { prisma } from "@/lib/prisma";
import ProvidersManager from "./ProvidersManager";
import { Truck } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
    const providers = await prisma.supplier.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { purchases: true }
            }
        }
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 transition-colors">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <Truck className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">
                        Directorio de Proveedores
                    </h1>
                    <p className="text-muted text-sm font-medium">
                        Gestión de aliados estratégicos y cadena de suministro
                    </p>
                </div>
            </div>

            <ProvidersManager initialProviders={providers} />
        </div>
    );
}
