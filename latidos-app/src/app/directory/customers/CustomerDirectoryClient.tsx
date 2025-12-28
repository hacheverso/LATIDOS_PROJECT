"use client";

import { useState } from "react";
import { Users, MapPin, Phone, Mail, Building, UserPlus, Search, Star, DollarSign, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import CreateCustomerModal from "../../sales/components/CreateCustomerModal";

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
    taxId: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    createdAt: Date;
    totalBought: number;
    transactionCount: number;
    lastPurchaseDate: Date | null;
    purchasesLast30Days: number;
    stars: number;
}

interface Metrics {
    totalRegistered: number;
    topClientName: string;
    topClientVal: number;
    averageTicket: number;
}

interface CustomerDirectoryClientProps {
    initialCustomers: CustomerWithMetrics[];
    metrics: Metrics;
}

export default function CustomerDirectoryClient({ initialCustomers, metrics }: CustomerDirectoryClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [starFilter, setStarFilter] = useState<number | null>(null);
    const [timeFilter, setTimeFilter] = useState<'all' | 'new_this_month' | 'inactive_30_days'>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Calculate Filtered List
    const filteredCustomers = initialCustomers.filter(c => {
        const matchesSearch =
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.taxId.includes(searchTerm) ||
            (c.phone && c.phone.includes(searchTerm));
        const matchesStars = starFilter ? c.stars === starFilter : true;

        let matchesTime = true;
        const now = new Date();
        if (timeFilter === 'new_this_month') {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            matchesTime = new Date(c.createdAt) >= firstDayOfMonth;
        } else if (timeFilter === 'inactive_30_days') {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            // Inactive means: Has purchased before, but NOT in last 30 days.
            // Or just no purchases ever? Usually "Inactive" implies churn.
            // Let's assume: Has purchase history AND last purchase < 30 days ago.
            matchesTime = c.lastPurchaseDate !== null && new Date(c.lastPurchaseDate) < thirtyDaysAgo;
        }

        return matchesSearch && matchesStars && matchesTime;
    });

    return (
        <div className="space-y-2 animate-in fade-in duration-500 min-h-screen bg-slate-50/50 p-3 md:p-4">

            {/* 1. Header & KPIs Dashboard */}
            <div className="space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <Users className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                Directorio
                            </h1>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Base de Datos</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-slate-500/30 transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        Nuevo Cliente
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {/* KPI 1: Registrados */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Registrados</p>
                            <p className="text-lg font-black text-slate-800 leading-none">{metrics.totalRegistered}</p>
                        </div>
                    </div>

                    {/* KPI 2: Top Cliente */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600">
                            <Star className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Top Cliente</p>
                            <p className="text-base font-black text-slate-800 truncate leading-tight">{metrics.topClientName}</p>
                            <p className="text-xs font-bold text-green-600">{formatMoney(metrics.topClientVal)}</p>
                        </div>
                    </div>

                    {/* KPI 3: Ticket Promedio */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="bg-green-50 p-2 rounded-lg text-green-600">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Ticket Prom.</p>
                            <p className="text-lg font-black text-slate-800 leading-none">{formatMoney(metrics.averageTicket)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Toolbar (Search & Filters) */}
            <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-xl p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-2 items-center justify-between">
                <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto">
                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-700 placeholder:font-bold placeholder:text-slate-400 text-sm"
                        />
                    </div>

                    {/* Time Filter */}
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value as any)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="all">📅 Todos</option>
                        <option value="new_this_month">✨ Nuevos</option>
                        <option value="inactive_30_days">💤 Inactivos</option>
                    </select>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 w-full xl:w-auto text-xs">
                    <span className="font-bold text-slate-400 uppercase mr-1 whitespace-nowrap">Nivel:</span>
                    <button
                        onClick={() => setStarFilter(null)}
                        className={cn(
                            "px-2 py-1 rounded-md font-bold border transition-colors whitespace-nowrap",
                            starFilter === null ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        Todos
                    </button>
                    {[5, 4, 3, 2, 1].map((star) => (
                        <button
                            key={star}
                            onClick={() => setStarFilter(starFilter === star ? null : star)}
                            className={cn(
                                "px-2 py-1 rounded-md font-bold border transition-colors flex items-center gap-1 whitespace-nowrap",
                                starFilter === star ? "bg-yellow-50 border-yellow-400 text-yellow-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            )}
                        >
                            {star} <Star className="w-2 h-2 fill-current" />
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredCustomers.map((customer) => (
                    <div
                        key={customer.id}
                        className={cn(
                            "relative group bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-all relative overflow-hidden group-hover:-translate-y-0.5",
                            // Inactivity Border
                            (timeFilter === 'inactive_30_days' || (customer.lastPurchaseDate && new Date(customer.lastPurchaseDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
                                ? "border-orange-200 ring-1 ring-orange-100"
                                : "border-slate-100"
                        )}
                    >
                        {/* Decor - Absolute but inside the card div */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-slate-50 to-white rounded-full -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

                        {/* Top Right Stats (Badge + Stars) - Positioned Absolutely in Card */}
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-20 pointer-events-none">
                            <div className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight">
                                <span>{customer.purchasesLast30Days}</span>
                                <span className="opacity-70 text-[8px]">MES</span>
                            </div>
                            <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className={cn(
                                            "w-2 h-2",
                                            i < customer.stars ? "text-yellow-400 fill-yellow-400" : "text-slate-200"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Main Clickable Content -> Navigates to Profile */}
                        <Link href={`/directory/customers/${customer.id}`} className="block relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center font-black text-lg text-slate-700 border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shadow-sm">
                                    {customer.name.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            <h3 className="font-black text-slate-800 text-base uppercase truncate mb-0.5 group-hover:text-blue-700 transition-colors tracking-tight pr-12">
                                {customer.name}
                            </h3>
                            <p className="text-slate-400 text-xs font-mono font-bold mb-3 flex items-center gap-1 opacity-80">
                                <Building className="w-3.5 h-3.5" />
                                {customer.taxId}
                            </p>
                        </Link>

                        {/* Footer / Actions - NOT wrapped in Link to avoid Hydration Error (<a> inside <a>) */}
                        <div className="relative z-10 space-y-2 pt-2 border-t border-slate-50">
                            {/* Financial Summary */}
                            {/* Financial Summary */}
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Histórico</span>
                                <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-sm">
                                    {formatMoney(customer.totalBought)}
                                </span>
                            </div>

                            {customer.phone && (
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                                    <div className="p-0.5 bg-slate-100 rounded text-slate-400">
                                        <Phone className="w-3 h-3" />
                                    </div>
                                    <span className="truncate">{customer.phone}</span>
                                </div>
                            )}

                            {/* Quick Actions Bar */}
                            <div className="flex gap-2 mt-2 pt-1 border-t border-slate-50/50">
                                {customer.phone && (
                                    <a
                                        href={`https://wa.me/57${customer.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold py-1.5 rounded-lg text-center transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Phone className="w-3 h-3" /> WhatsApp
                                    </a>
                                )}
                                <Link
                                    href={`/directory/customers/${customer.id}`}
                                    className="flex-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-bold py-1.5 rounded-lg text-center transition-colors block"
                                >
                                    Perfil
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}


                {filteredCustomers.length === 0 && (
                    <div className="col-span-full py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-6 h-6 text-slate-300" />
                        </div>
                        <h3 className="text-slate-900 font-black text-base mb-1">No se encontraron clientes</h3>
                        <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                            Intenta ajustar los filtros o crea un nuevo cliente.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <CreateCustomerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(newCustomer) => {
                    setIsCreateModalOpen(false);
                    // Force refresh or optimistic update?
                    // Next.js page prop update happens on refresh.
                    window.location.reload();
                }}
            />
        </div>
    );
}
