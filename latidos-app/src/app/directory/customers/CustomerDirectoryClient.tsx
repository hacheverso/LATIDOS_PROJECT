"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, MapPin, Phone, Mail, Building, UserPlus, Search, Star, DollarSign, Wallet, UploadCloud } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CreateCustomerModal from "../../sales/components/CreateCustomerModal";
import { CustomerDataTable, CustomerData } from "./CustomerDataTable";
import { BulkCustomerImportModal } from "./BulkCustomerImportModal";

// Helper to format currency
const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

interface CustomerWithMetrics {
    id: string;
    name: string;
    companyName: string | null;
    taxId: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    createdAt: string;
    totalDebt?: number;
    overdueDebt?: number;
    sector: string | null;
}

interface Metrics {
    totalRegistered: number;
    topClientName: string;
    topClientVal: number;
    averageTicket: number;
    coverageLabel?: string;
    coverageValue?: string;
}

interface CustomerDirectoryClientProps {
    initialCustomers: CustomerWithMetrics[];
    metrics: Metrics;
}

export default function CustomerDirectoryClient({ initialCustomers, metrics }: CustomerDirectoryClientProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const router = useRouter();

    // Transform data for DataTable
    const tableData: CustomerData[] = initialCustomers.map(c => {
        let status: 'up_to_date' | 'active_debt' | 'overdue_debt' = 'up_to_date';

        if ((c.overdueDebt || 0) > 0) {
            status = 'overdue_debt';
        } else if ((c.totalDebt || 0) > 0) {
            status = 'active_debt';
        }

        return {
            id: c.id,
            name: c.name,
            companyName: c.companyName,
            taxId: c.taxId,
            address: c.address,
            sector: c.sector,
            phone: c.phone,
            email: c.email,
            debtStatus: status,
            totalDebt: c.totalDebt || 0
        };
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500 min-h-screen bg-slate-50/50 dark:bg-transparent p-4 md:p-8 transition-colors">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Directorio de Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gestiona tu base de datos de clientes y su estado financiero.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-sm font-medium py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <UploadCloud className="w-4 h-4" />
                        Importar Clientes
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/10 dark:shadow-none"
                    >
                        <UserPlus className="w-4 h-4" />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Clientes</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalRegistered}</div>
                </div>

                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Star className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente Top</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={metrics.topClientName}>{metrics.topClientName || 'N/A'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{formatMoney(metrics.topClientVal)}</div>
                </div>

                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ticket Promedio</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatMoney(metrics.averageTicket)}</div>
                </div>

                <div className="bg-white dark:bg-card p-4 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Building className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cobertura</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.coverageValue || "100%"}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{metrics.coverageLabel || "Global"}</div>
                </div>
            </div>

            <CustomerDataTable data={tableData} />

            <CreateCustomerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(newCustomer) => {
                    setIsCreateModalOpen(false);
                    toast.success(newCustomer.id ? "Cliente actualizado" : "Cliente creado exitosamente");
                    router.refresh();
                }}
            />

            <BulkCustomerImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
            />
        </div>
    );
}
