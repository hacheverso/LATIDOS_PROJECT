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
    createdAt: Date;
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
        <div className="space-y-6 animate-in fade-in duration-500 min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Directorio de Clientes</h1>
                    <p className="text-slate-500 text-sm">Gestiona tu base de datos de clientes y su estado financiero.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <UploadCloud className="w-4 h-4" />
                        Importar Clientes
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/10"
                    >
                        <UserPlus className="w-4 h-4" />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Clientes</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{metrics.totalRegistered}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <Star className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente Top</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate" title={metrics.topClientName}>{metrics.topClientName || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{formatMoney(metrics.topClientVal)}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Promedio</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{formatMoney(metrics.averageTicket)}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Building className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cobertura</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{metrics.coverageValue || "100%"}</div>
                    <div className="text-xs text-slate-500">{metrics.coverageLabel || "Global"}</div>
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
