"use client";

import { useState, useEffect } from "react";
import { updateCustomer } from "./actions";
import { User, Phone, MapPin, Mail, Save, Loader2, CreditCard, Truck, Wallet, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { getLogisticZones } from "@/app/logistics/actions";
import { cn } from "@/lib/utils";

interface CustomerProfileFormProps {
    customer: {
        id: string;
        name: string;
        companyName?: string | null;
        taxId: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        sector: string | null;
        creditBalance: number; // NEW
    };
}

export default function CustomerProfileForm({ customer }: CustomerProfileFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);


    const [formData, setFormData] = useState({
        name: customer.name,
        companyName: customer.companyName || "",
        taxId: customer.taxId.startsWith('CF-') ? "" : customer.taxId, // Hide generated ID
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        sector: customer.sector || ""
    });
    const [zones, setZones] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        getLogisticZones().then(setZones);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (message) setMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        // Restore or Generate ID if empty
        const finalData = { ...formData };
        if (!finalData.taxId.trim()) {
            finalData.taxId = customer.taxId.startsWith('CF-') ? customer.taxId : `CF-${Date.now()}`;
        }

        const res = await updateCustomer(customer.id, finalData);

        if (res.success) {
            setMessage({ type: 'success', text: "Cliente actualizado correctamente." });
            router.refresh();
        } else {
            setMessage({ type: 'error', text: res.error || "Error al actualizar." });
        }
        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-sm border border-border p-6 md:p-8 h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-transfer flex items-center justify-center border-2 border-blue-100 dark:border-blue-500/20 shadow-sm">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-subheading text-primary uppercase tracking-tight">Editar Perfil</h2>
                        <p className="text-sm font-medium text-muted">Información personal y de contacto</p>
                    </div>
                </div>

                {/* CREDIT DISPLAY */}
                <div className={cn(
                    "px-4 py-2 rounded-xl border flex flex-col items-end transition-colors",
  customer.creditBalance > 0 ? "bg-emerald-50 dark:bg-brand  border-emerald-100 dark:border-emerald-500/20" : "bg-header border-border"
                )}>
                    <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-0.5" style={{ color: customer.creditBalance > 0 ? '#10b981' : '#94a3b8' }}>
                        <Wallet className="w-3 h-3" />
                        Saldo a Favor
                    </div>
                    <div className={cn(
                        "text-subheading",
                        customer.creditBalance > 0 ? "text-success" : "text-muted"
                    )}>
                        ${customer.creditBalance.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="space-y-5">
                {/* ID & Name Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Documento / NIT
                        </label>
                        <input
                            type="text"
                            name="taxId"
                            value={formData.taxId}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-header border border-border rounded-xl font-mono font-bold text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-secondary"
                            placeholder="Opcional (Vacío = Sin identificación)"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                        <Building className="w-3.5 h-3.5" /> Razón Social / Empresa (Opcional)
                    </label>
                    <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-header border border-border rounded-xl font-bold text-primary uppercase outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-secondary"
                        placeholder="Ej: MR MOBILE S.A.S"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Nombre Completo del Contacto
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-header border border-border rounded-xl font-bold text-primary uppercase outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-secondary"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" /> Teléfono
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-header border border-border rounded-xl font-medium text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-secondary"
                            placeholder="Sin registro"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" /> Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-header border border-border rounded-xl font-medium text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-secondary"
                            placeholder="Sin registro"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5" /> Sector / Zona Logística
                    </label>
                    <div className="relative">
                        <input
                            list="sectors-list-edit"
                            type="text"
                            name="sector"
                            value={formData.sector}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-header border border-border rounded-xl font-bold text-primary uppercase outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-secondary"
                            placeholder="Seleccione o cree un sector..."
                        />
                        <datalist id="sectors-list-edit">
                            {zones.map(z => (
                                <option key={z.id} value={z.name} />
                            ))}
                        </datalist>
                    </div>
                    <p className="text-[10px] text-secondary font-medium pl-1">
                        💡 Si escribe un sector nuevo, se creará automáticamente al guardar.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Dirección Física
                    </label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-header border border-border rounded-xl font-medium text-primary outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-secondary"
                        placeholder="Dirección completa..."
                    />
                </div>

                {message && (
  <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 dark:bg-brand  text-green-700 dark:text-black border border-green-100 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-card dark:bg-card text-white dark:text-primary hover:bg-slate-800 dark:hover:bg-hover font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        GUARDAR CAMBIOS
                    </button>
                </div>
            </div>
        </form >
    );
}
