"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, User, FileText, Phone, Mail, MapPin } from "lucide-react";
import { createCustomer, updateCustomer } from "../actions";
import { getLogisticZones } from "@/app/logistics/actions";

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: any) => void;
    customerToEdit?: any; // If provided, mode is EDIT
}

export default function CreateCustomerModal({ isOpen, onClose, onSuccess, customerToEdit }: CreateCustomerModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        taxId: "",
        phone: "",
        email: "",
        address: "",
        sector: ""
    });
    const [zones, setZones] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            getLogisticZones().then(setZones);
            if (customerToEdit) {
                setFormData({
                    name: customerToEdit.name || "",
                    taxId: customerToEdit.taxId || "",
                    phone: customerToEdit.phone || "",
                    email: customerToEdit.email || "",
                    address: customerToEdit.address || "",
                    sector: customerToEdit.sector || ""
                });
            } else {
                setFormData({ name: "", taxId: "", phone: "", email: "", address: "", sector: "" });
            }
        }
    }, [isOpen, customerToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            let result;
            if (customerToEdit) {
                result = await updateCustomer(customerToEdit.id, formData);
            } else {
                result = await createCustomer(formData);
            }
            onSuccess(result);
            onClose();
            // Reset form
            setFormData({ name: "", taxId: "", phone: "", email: "", address: "", sector: "" });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                    <div>
                        <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">
                            {customerToEdit ? "Editar Cliente" : "Nuevo Cliente"}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Información básica para facturación y contacto.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                Nombre / Razón Social <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
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
                                NIT / CC <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    value={formData.taxId}
                                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-bold text-slate-700"
                                    placeholder="EJ: 123456789"
                                />
                            </div>
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

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {loading ? "Guardando..." : (customerToEdit ? "Actualizar Cliente" : "Registrar Cliente")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
