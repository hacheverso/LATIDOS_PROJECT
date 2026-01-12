"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Save, User, FileText, Phone, Mail, MapPin, Building } from "lucide-react";
import { createCustomer, updateCustomer } from "@/app/sales/actions";
import { getLogisticZones } from "@/app/logistics/actions";
import { X } from "lucide-react";

interface ClientFormProps {
    customerToEdit?: any;
    initialName?: string;
    onSuccess: (customer: any) => void;
    onCancel: () => void;
}

export default function ClientForm({ customerToEdit, initialName, onSuccess, onCancel }: ClientFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        companyName: "",
        taxId: "",
        phone: "",
        email: "",
        address: "",
        sector: ""
    });
    const [zones, setZones] = useState<{ id: string, name: string }[]>([]);
    const nameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getLogisticZones().then(setZones);
        // Autofocus
        setTimeout(() => nameInputRef.current?.focus(), 100);

        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name || "",
                companyName: customerToEdit.companyName || "",
                taxId: customerToEdit.taxId || "",
                phone: customerToEdit.phone || "",
                email: customerToEdit.email || "",
                address: customerToEdit.address || "",
                sector: customerToEdit.sector || ""
            });
        } else {
            setFormData({
                name: initialName || "",
                companyName: "",
                taxId: "",
                phone: "",
                email: "",
                address: "",
                sector: ""
            });
        }
    }, [customerToEdit, initialName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Handle Optional Tax ID (Auto-generate for "Fast Sale")
        const finalData = { ...formData };
        if (!finalData.taxId.trim()) {
            finalData.taxId = `CF-${Date.now()}`;
        }

        try {
            let result;
            if (customerToEdit) {
                result = await updateCustomer(customerToEdit.id, finalData);
            } else {
                result = await createCustomer(finalData);
            }
            onSuccess(result);
        } catch (err) {
            setError((err as Error).message);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Nombre / Razón Social <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            ref={nameInputRef}
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 uppercase"
                            placeholder="EJ: MARIA PEREZ"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Empresa <span className="text-xs font-normal text-slate-400 lowercase">(opcional)</span>
                    </label>
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={formData.companyName}
                            onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 uppercase"
                            placeholder="EJ: TECH SAS"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        NIT / CC <span className="text-xs font-normal text-slate-400 lowercase">(opcional)</span>
                    </label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={formData.taxId}
                            onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
                            placeholder="EJ: 123456789"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Teléfono / WhatsApp
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
                            placeholder="EJ: 3001234567"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Correo Electrónico
                </label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 lowercase"
                        placeholder="cliente@ejemplo.com"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Dirección
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 uppercase"
                        placeholder="EJ: CALLE 123 # 45-67"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Sector / Zona Logística
                </label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        list="sectors-list"
                        value={formData.sector}
                        onChange={e => setFormData({ ...formData, sector: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700 uppercase"
                        placeholder="Escriba o seleccione sector..."
                    />
                    <datalist id="sectors-list">
                        {zones.map(z => (
                            <option key={z.id} value={z.name} />
                        ))}
                    </datalist>
                </div>
                <p className="text-[10px] text-slate-400 font-medium pl-1">
                    💡 Si no existe, escríbalo y se creará automáticamente.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {error}
                </div>
            )}

            <div className="pt-2 flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-all"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {loading ? "Guardando..." : (customerToEdit ? "Actualizar Cliente" : "Registrar Cliente")}
                </button>
            </div>
        </form>
    );
}
