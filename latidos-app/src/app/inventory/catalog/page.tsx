import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, PackageCheck } from "lucide-react";
import InventoryTable from "../InventoryTable";
import InventoryHeaderActions from "../InventoryHeaderActions";
import { getCategories } from "../actions";
import { getCatalogProducts } from "./actions";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export default async function CatalogPage({
    searchParams
}: {
    searchParams: { page?: string, query?: string, stock?: string, sort?: string, direction?: string, category?: string, pageSize?: string }
}) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) return <div>No autorizado</div>;

    const pageSize = searchParams.pageSize === 'all' ? 10000 : (Number(searchParams.pageSize) || 50);
    const currentPage = Number(searchParams.page) || 1;
    const skip = (currentPage - 1) * pageSize;

    const { formattedProducts, totalCount, outOfStockCount, categories } = await getCatalogProducts({
        ...searchParams,
        page: currentPage
    });

    return (
        <div className="w-full space-y-4 md:space-y-8 pb-24 md:pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">
                        Catálogo
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Gestión Operativa de Productos</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/inventory/new"
                        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Producto
                    </Link>
                    <Link
                        href="/inventory/inbound"
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all"
                    >
                        <PackageCheck className="w-4 h-4" />
                        Recibir
                    </Link>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    <InventoryHeaderActions />
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none overflow-hidden transition-colors">
                <InventoryTable initialProducts={formattedProducts} allCategories={categories} totalCount={totalCount} outOfStockCount={outOfStockCount} />
            </div>
        </div>
    );
}
