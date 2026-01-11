"use client";

import { useState, useEffect } from "react";
import { updateCustomer } from "./actions";
import { User, Phone, MapPin, Mail, Save, Loader2, CreditCard, Truck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { getLogisticZones } from "@/app/logistics/actions";
import { cn } from "@/lib/utils";

interface CustomerProfileFormProps {
    customer: {
        id: string;
        name: string;
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
        taxId: customer.taxId,
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

        const res = await updateCustomer(customer.id, formData);

        if (res.success) {
            setMessage({ type: 'success', text: "Cliente actualizado correctamente." });
            router.refresh();
        } else {
            setMessage({ type: 'error', text: res.error || "Error al actualizar." });
        }
        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 h-full">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border-2 border-blue-100 shadow-sm">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Editar Perfil</h2>
                        <p className="text-sm font-medium text-slate-400">Información personal y de contacto</p>
                    </div>
                </div>

                {/* CREDIT DISPLAY */}
                <div className={cn(
                    "px-4 py-2 rounded-xl border flex flex-col items-end",
                    customer.creditBalance > 0 ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                )}>
                    <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-0.5" style={{ color: customer.creditBalance > 0 ? '#059669' : '#94a3b8' }}>
                        <Wallet className="w-3 h-3" />
                        Saldo a Favor
                    </div>
                    <div className={cn(
                        "text-2xl font-black",
                        customer.creditBalance > 0 ? "text-emerald-600" : "text-slate-400"
                    )}>
                        ${customer.creditBalance.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="space-y-5">
                {/* ID & Name Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5" /> Documento / NIT
                        </label>
                        <input
                            type="text"
                            name="taxId"
                            value={formData.taxId}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Nombre Completo / Razón Social
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 uppercase outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" /> Teléfono
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            placeholder="Sin registro"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" /> Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            placeholder="Sin registro"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5" /> Sector / Zona Logística
                    </label>
                    <div className="relative">
                        <input
                            list="sectors-list-edit"
                            type="text"
                            name="sector"
                            value={formData.sector}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 uppercase outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                            placeholder="Seleccione o cree un sector..."
                        />
                        <datalist id="sectors-list-edit">
                            {zones.map(z => (
                                <option key={z.id} value={z.name} />
                            ))}
                        </datalist>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium pl-1">
                        💡 Si escribe un sector nuevo, se creará automáticamente al guardar.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Dirección Física
                    </label>
                    <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none"
                        placeholder="Dirección completa..."
                    />
                </div>

                {message && (
                    <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                        {message.text}
                    </div>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        GUARDAR CAMBIOS
                    </button>
                </div>
            </div>
        </form >
    );
}
