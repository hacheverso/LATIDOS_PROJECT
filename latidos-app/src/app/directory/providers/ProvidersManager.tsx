"use client";

import { useState } from "react";
import { Search, Plus, Building2, Phone, Mail, MapPin, Hash, Trash2 } from "lucide-react";
import { deleteProvider } from "@/app/directory/actions";
import CreateProviderModal from "@/components/directory/CreateProviderModal";
import { useRouter } from "next/navigation";

interface Provider {
    id: string;
    name: string;
    nit: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contactName?: string | null;
    _count?: { purchases: number };
}

export default function ProvidersManager({ initialProviders }: { initialProviders: Provider[] }) {
    const [providers, setProviders] = useState(initialProviders);
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();

    const filtered = providers.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.nit.includes(search) ||
        (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
    );

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este proveedor?")) return;
        setIsDeleting(id);
        const res = await deleteProvider(id);
        if (res.success) {
            setProviders(prev => prev.filter(p => p.id !== id));
            router.refresh();
        } else {
            alert(res.error);
        }
        setIsDeleting(null);
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-background p-4 rounded-2xl shadow-sm border border-border transition-colors">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar por Nombre, NIT o Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-white/5 border border-border rounded-xl text-slate-800 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                    />
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="w-full md:w-auto px-6 h-12 bg-blue-600 dark:bg-blue-600 text-white rounded-xl font-bold uppercase hover:bg-blue-700 dark:hover:bg-blue-500 transition-all shadow-lg dark:shadow-none flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Proveedor
                </button>
            </div>

            {/* Table */}
            <div className="bg-background rounded-2xl shadow-sm border border-border overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-muted uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-muted uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-muted uppercase tracking-wider">Ubicación</th>
                                <th className="px-6 py-4 text-center text-xs font-black text-muted uppercase tracking-wider">Compras</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-muted uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted font-bold uppercase">
                                        No se encontraron proveedores
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((provider) => (
                                    <tr key={provider.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white uppercase text-sm">{provider.name}</p>
                                                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-400/80 text-[10px] font-bold uppercase">
                                                        <Hash className="w-3 h-3" />
                                                        {provider.nit}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {provider.phone && (
                                                    <div className="flex items-center gap-2 text-xs font-medium text-muted">
                                                        <Phone className="w-3 h-3 text-muted" />
                                                        {provider.phone}
                                                    </div>
                                                )}
                                                {provider.email && (
                                                    <div className="flex items-center gap-2 text-xs font-medium text-muted">
                                                        <Mail className="w-3 h-3 text-muted" />
                                                        {provider.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {provider.address && (
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted max-w-[200px] truncate">
                                                    <MapPin className="w-3 h-3 text-muted" />
                                                    <span className="truncate">{provider.address}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-white/10 text-muted">
                                                {provider._count?.purchases || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(provider.id)}
                                                disabled={isDeleting === provider.id}
                                                className="p-2 text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreate && (
                <CreateProviderModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={(newProvider) => {
                        setProviders([newProvider as Provider, ...providers]);
                        setShowCreate(false);
                    }}
                />
            )}
        </div>
    );
}
