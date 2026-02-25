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
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0D0F] p-8 space-y-8 transition-colors">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Configuración</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Personaliza los datos de tu empresa para la facturación.</p>
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
                <div className="bg-white dark:bg-[#1A1C1E] rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-white/10 space-y-6 transition-colors">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10 transition-colors">
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 transition-colors">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white transition-colors">Información del Negocio</h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">Datos generales de la empresa</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Nombre del Negocio</label>
                            <div className="relative">
                                <Heading className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5 transition-colors" />
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131517] font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                    placeholder="Ej. Latidos Tech"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">NIT / Documento</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5 transition-colors" />
                                <input
                                    name="nit"
                                    value={formData.nit}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131517] font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                    placeholder="Ej. 900.123.456-7"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Dirección</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5 transition-colors" />
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131517] font-medium text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                    placeholder="Ej. Calle 123 # 45-67"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Plazo de Vencimiento (Días)</label>
                            <div className="relative group">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="number"
                                    name="defaultDueDays"
                                    value={formData.defaultDueDays}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131517] font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                    placeholder="30"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-2 transition-colors">
                                Define cuándo una factura pasa a estado <span className="text-red-500 font-bold">VENCIDO</span>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact & Brandy Branding */}
                <div className="space-y-8">
                    <div className="bg-white dark:bg-[#1A1C1E] rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-white/10 space-y-6 transition-colors">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10 transition-colors">
                            <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400 transition-colors">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white transition-colors">Contacto</h2>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">Información pública para clientes</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Teléfono / WhatsApp</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5 transition-colors" />
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131517] font-medium text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                        placeholder="Ej. +57 300 123 4567"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5 transition-colors" />
                                    <input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131517] font-medium text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                                        placeholder="contacto@empresa.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#1A1C1E] rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-white/10 space-y-6 transition-colors">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10 transition-colors">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 transition-colors">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white transition-colors">Marca y Branding</h2>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">Logo y pie de página para facturas</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Logo</label>
                                <div className="flex items-start gap-6">
                                    <div className="w-32 h-32 bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/20 flex items-center justify-center overflow-hidden relative group transition-colors">
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
                                            <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 transition-colors" />
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
                                                className="inline-flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#131517] border border-slate-200 dark:border-white/10 rounded-xl font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                Subir Imagen
                                            </label>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 transition-colors">
                                                Recomendado: Imagen PNG o JPG cuadrada. Se guardará internamente.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 transition-colors">Mensaje al Pie de Página</label>
                                <textarea
                                    name="footerMsg"
                                    rows={3}
                                    value={formData.footerMsg}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#131517] font-medium text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-colors"
                                    placeholder="Ej. Gracias por su compra - Garantía de 30 días"
                                />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Integrations Card */}
                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-[#1A1C1E] rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-white/10 space-y-6 transition-colors">
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/10 transition-colors">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 transition-colors">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white transition-colors">API y Respaldos</h2>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">Credenciales para integraciones externas (Google Sheets, Holded, etc.)</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-[#131517] p-6 rounded-2xl border border-slate-200 dark:border-white/10 transition-colors">
                            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 transition-colors">Tu API Key Privada</label>

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        value={formData.backupApiKey || ""}
                                        readOnly
                                        className="w-full pl-4 pr-12 py-3 bg-white dark:bg-[#1A1C1E] rounded-xl border border-slate-200 dark:border-white/10 font-mono text-sm text-slate-700 dark:text-slate-300 transition-colors"
                                        placeholder="•••••••••••••••••••••"
                                    />
                                    <button
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 transition-colors"
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
                                    className="p-3 bg-white dark:bg-[#1A1C1E] border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors shadow-sm shrink-0"
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
                                    className="p-3 bg-white dark:bg-[#1A1C1E] border border-slate-200 dark:border-white/10 rounded-xl hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 dark:text-slate-500 transition-colors shadow-sm shrink-0"
                                    title="Regenerar Key"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-lg flex items-start gap-3 transition-colors">
                                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                <p className="text-xs text-orange-700 dark:text-orange-400 font-medium leading-relaxed transition-colors">
                                    Esta llave otorga acceso de lectura a todas las ventas de tu negocio. Mantenla segura y no la compartas con personas no autorizadas.
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">Endpoint de Respaldo:</p>
                                    <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 cursor-pointer transition-colors" onClick={() => {
                                        const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/backups/sales?apiKey=${formData.backupApiKey}`;
                                        navigator.clipboard.writeText(url);
                                        toast.success("URL copiada");
                                    }}>
                                        Copiar URL Completa
                                    </Badge>
                                </div>
                                <code className="block bg-slate-800 dark:bg-black/50 p-3 rounded-lg text-[10px] sm:text-xs text-green-400 dark:text-green-400/80 font-mono break-all select-all shadow-inner transition-colors">
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
