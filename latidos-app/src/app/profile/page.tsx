import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserProfile, updateProfile } from "./actions";
import { User, Phone, MapPin, Shield, Mail, Save } from "lucide-react";

export default async function ProfilePage() {
    const session = await auth();
    if (!session) redirect("/login");

    const user = await getUserProfile();
    if (!user) return <div>Usuario no encontrado</div>;

    const initials = user.name.charAt(0).toUpperCase();

    async function saveAction(formData: FormData) {
        'use server';
        const phone = formData.get("phone") as string;
        const address = formData.get("address") as string;
        await updateProfile({ phone, address });
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mi Perfil</h1>
                <p className="text-slate-500 font-medium">Gestiona tu información personal y seguridad.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* ID Card */}
                <div className="col-span-1">
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-slate-900 to-slate-800" />

                        <div className="w-24 h-24 rounded-full bg-white p-1 relative z-10 mt-12 mb-4 shadow-lg">
                            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-black text-3xl text-slate-900 border-4 border-slate-50">
                                {initials}
                            </div>
                            <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform tooltip" title="Cambiar Foto (Próximamente)">
                                <User className="w-4 h-4" />
                            </button>
                        </div>

                        <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                        <div className="flex items-center gap-2 mt-1 mb-6">
                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-emerald-200">
                                {user.role}
                            </span>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                                {user.status}
                            </span>
                        </div>

                        <div className="w-full space-y-3 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="truncate flex-1 text-left font-medium">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                                <Shield className="w-4 h-4 text-slate-400" />
                                <span className="truncate flex-1 text-left font-medium">PIN: ••••</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <form action={saveAction} className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-slate-400" /> Información de Contacto
                        </h3>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">Teléfono Móvil</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        name="phone"
                                        defaultValue={user.phone || ''}
                                        placeholder="Tu número de celular"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-0 focus:border-slate-900 transition-all bg-slate-50 focus:bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">Dirección / Ubicación</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                    <input
                                        name="address"
                                        defaultValue={user.address || ''}
                                        placeholder="Ciudad o dirección"
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-0 focus:border-slate-900 transition-all bg-slate-50 focus:bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-slate-900/20 active:scale-95">
                                <Save className="w-4 h-4" /> Guardar Cambios
                            </button>
                        </div>
                    </form>

                    {/* Permissions (ReadOnly) */}
                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200/60 opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-slate-400" /> Mis Permisos
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Estos permisos son gestionados por el administrador.</p>

                        <div className="grid grid-cols-2 gap-4">
                            {['Ver Costos', 'Editar Inventario', 'Gestionar Usuarios', 'Ver Reportes'].map((perm) => (
                                <div key={perm} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                                    <div className={`w-2 h-2 rounded-full ${(user.role === 'ADMIN') ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    <span className="text-sm font-bold text-slate-700">{perm}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
