"use client";

import { useState, useEffect, useRef } from "react";
import { getSettings, updateSettings, bulkUpdateDueDates } from "./actions";
import { Save, Building2, Smartphone, Mail, Globe, Heading, FileText, Image as ImageIcon, Eye, EyeOff, AlertTriangle, Copy, RefreshCw, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // Store original due days to detect changes
    const originalDueDaysRef = useRef<number>(30);

    const [formData, setFormData] = useState({
        name: "",
        nit: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        logoUrl: "",
        footerMsg: "",
        backupApiKey: "",
        defaultDueDays: 30
    });

    useEffect(() => {
        getSettings().then((data) => {
            if (data) {
                const days = (data as any).defaultDueDays || 30;
                originalDueDaysRef.current = days;
                setFormData({
                    name: data.name || "",
                    nit: data.nit || "",
                    address: data.address || "",
                    phone: data.phone || "",
                    email: data.email || "",
                    website: data.website || "",
                    logoUrl: data.logoUrl || "",
                    footerMsg: data.footerMsg || "",
                    backupApiKey: (data as any).backupApiKey || "", // Cast as any momentarily until types update
                    defaultDueDays: days
                });
            }
            setLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setSaving(true);
        setSuccess(false);
        try {
            await updateSettings({
                ...formData,
                defaultDueDays: Number(formData.defaultDueDays)
            });

            // Logic for Bulk Update
            const newDueDays = Number(formData.defaultDueDays);
            if (newDueDays !== originalDueDaysRef.current) {
                const shouldUpdate = window.confirm(
                    `Has cambiado el plazo de vencimiento de ${originalDueDaysRef.current} a ${newDueDays} días.\n\n` +
                    `¿Deseas aplicar este nuevo plazo a TODAS las facturas pendientes actuales?\n` +
                    `(Esto recalculará sus fechas de vencimiento basándose en su fecha de creación)`
                );

                if (shouldUpdate) {
                    const result = await bulkUpdateDueDates(newDueDays);
                    if (result.success) {
                        toast.success(`Se actualizaron ${result.count} facturas pendientes.`);
                    }
                }
                // Update Ref
                originalDueDaysRef.current = newDueDays;
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert(`Error al guardar: ${(error as Error).message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración</h1>
                    <p className="text-slate-500 font-medium">Personaliza los datos de tu empresa para la facturación.</p>
                </div>
                <div className="flex items-center gap-4">
                    {success && (
                        <span className="text-green-600 font-bold animate-in fade-in slide-in-from-right-4">
                            ¡Guardado correctamente!
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-6 py-3 rounded-xl font-black uppercase tracking-wide shadow-lg flex items-center gap-2 transition-all disabled:opacity-50 ${success
                            ? "bg-green-500 text-white hover:bg-green-600 shadow-green-500/30"
                            : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30"
                            }`}
                    >
                        <Save className="w-5 h-5" />
                        {saving ? "Guardando..." : success ? "¡Guardado!" : "Guardar Cambios"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Info Card */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Información del Negocio</h2>
                            <p className="text-xs text-slate-400 font-medium">Datos generales de la empresa</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nombre del Negocio</label>
                            <div className="relative">
                                <Heading className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Ej. Latidos Tech"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">NIT / Documento</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    name="nit"
                                    value={formData.nit}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Ej. 900.123.456-7"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Dirección</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Ej. Calle 123 # 45-67"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Plazo de Vencimiento (Días)</label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="number"
                                    name="defaultDueDays"
                                    value={formData.defaultDueDays}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="30"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 ml-2">
                                Define cuándo una factura pasa a estado <span className="text-red-500 font-bold">VENCIDO</span>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact & Brandy Branding */}
                <div className="space-y-8">
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Contacto</h2>
                                <p className="text-xs text-slate-400 font-medium">Información pública para clientes</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Teléfono / WhatsApp</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ej. +57 300 123 4567"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="contacto@empresa.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Marca y Branding</h2>
                                <p className="text-xs text-slate-400 font-medium">Logo y pie de página para facturas</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Logo</label>
                                <div className="flex items-start gap-6">
                                    <div className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                                        {formData.logoUrl ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, logoUrl: "" }))}
                                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <span className="text-white text-xs font-bold uppercase">Eliminar</span>
                                                </button>
                                            </>
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    if (file.size > 5 * 1024 * 1024) {
                                                        alert("El archivo es demasiado grande. Máximo 5MB.");
                                                        return;
                                                    }

                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            const MAX_WIDTH = 500;
                                                            const scaleSize = MAX_WIDTH / img.width;
                                                            canvas.width = MAX_WIDTH;
                                                            canvas.height = img.height * scaleSize;

                                                            const ctx = canvas.getContext('2d');
                                                            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

                                                            const dataUrl = canvas.toDataURL(file.type);
                                                            setFormData(prev => ({ ...prev, logoUrl: dataUrl }));
                                                        };
                                                        img.src = event.target?.result as string;
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                                className="hidden"
                                                id="logo-upload"
                                            />
                                            <label
                                                htmlFor="logo-upload"
                                                className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Subir Imagen
                                            </label>
                                            <p className="text-xs text-slate-400 mt-2">
                                                Recomendado: Imagen PNG o JPG cuadrada. Se guardará internamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Mensaje al Pie de Página</label>
                                <textarea
                                    name="footerMsg"
                                    rows={3}
                                    value={formData.footerMsg}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                    placeholder="Ej. Gracias por su compra - Garantía de 30 días"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Integrations Card */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">API y Respaldos</h2>
                                <p className="text-xs text-slate-400 font-medium">Credenciales para integraciones externas (Google Sheets, Holded, etc.)</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Tu API Key Privada</label>

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        value={formData.backupApiKey || ""}
                                        readOnly
                                        className="w-full pl-4 pr-12 py-3 bg-white rounded-xl border border-slate-200 font-mono text-sm text-slate-700"
                                        placeholder="•••••••••••••••••••••"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                        title={showApiKey ? "Ocultar" : "Mostrar"}
                                    >
                                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        if (formData.backupApiKey) {
                                            navigator.clipboard.writeText(formData.backupApiKey);
                                            toast.success("¡Llave copiada con éxito!");
                                        }
                                    }}
                                    className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm shrink-0"
                                    title="Copiar al portapapeles"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={async () => {
                                        if (confirm("⚠️ ¿Estás seguro?\n\nSi generas una nueva llave, la conexión actual con tu Google Sheets dejará de funcionar inmediatamente. ¿Deseas continuar?")) {
                                            const { regenerateApiKey } = await import("./actions");
                                            const result = await regenerateApiKey();

                                            // Handling the structured return type
                                            if (result && typeof result === 'object' && 'success' in result) {
                                                if (result.success && result.key) {
                                                    setFormData(prev => ({ ...prev, backupApiKey: result.key! }));
                                                    toast.success("Nueva llave generada exitosamente");
                                                } else {
                                                    toast.error("Error: " + (result.error || "No se pudo generar la llave"));
                                                }
                                            } else if (typeof result === 'string') {
                                                // Fallback for old return type just in case
                                                setFormData(prev => ({ ...prev, backupApiKey: result }));
                                                toast.success("Nueva llave generada");
                                            } else {
                                                toast.error("Error desconocido al regenerar la llave.");
                                            }
                                        }
                                    }}
                                    className="p-3 bg-white border border-slate-200 rounded-xl hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-slate-400 transition-colors shadow-sm shrink-0"
                                    title="Regenerar Key"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                <p className="text-xs text-orange-700 font-medium leading-relaxed">
                                    Esta llave otorga acceso de lectura a todas las ventas de tu negocio. Mantenla segura y no la compartas con personas no autorizadas.
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-200/60">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-slate-500">Endpoint de Respaldo:</p>
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer" onClick={() => {
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/backups/sales?apiKey=${formData.backupApiKey}`;
                                        navigator.clipboard.writeText(url);
                                        toast.success("URL copiada");
                                    }}>
                                        Copiar URL Completa
                                    </Badge>
                                </div>
                                <code className="block bg-slate-800 p-3 rounded-lg text-[10px] sm:text-xs text-green-400 font-mono break-all select-all shadow-inner">
                                    GET {typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/backups/sales?apiKey={showApiKey ? formData.backupApiKey : '•••••••••••••'}
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
