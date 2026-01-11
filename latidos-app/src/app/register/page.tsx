"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Building2, User, Mail, Lock } from "lucide-react";
import { registerBusiness } from "../actions";
import { loginWithGoogle } from "@/app/lib/actions";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        orgName: "",
        userName: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError("Las contraseñas no coinciden.");
            setLoading(false);
            return;
        }

        try {
            const data = new FormData();
            data.append("orgName", formData.orgName);
            data.append("userName", formData.userName);
            data.append("email", formData.email);
            data.append("password", formData.password);

            const res = await registerBusiness(data);

            if (res.error) {
                setError(res.error);
                setLoading(false);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login?registered=true");
                }, 2000);
            }
        } catch (err: any) {
            setError(err.message || "Error desconocido");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8 bg-slate-900 text-white text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Latidos</h1>
                    <p className="text-slate-400 text-sm font-medium">Crea tu espacio de trabajo inteligente.</p>
                </div>

                <div className="p-8">
                    {success ? (
                        <div className="text-center py-12 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">¡Todo listo!</h2>
                            <p className="text-slate-500">Tu organización ha sido creada exitosamente.</p>
                            <p className="text-sm text-slate-400 mt-2">Redirigiendo al login...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Social Signup */}
                            <div className="space-y-3">
                                <form action={loginWithGoogle}>
                                    <button className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm text-sm">
                                        <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24">
                                            <path
                                                fill="currentColor"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                style={{ color: "#4285F4" }}
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                style={{ color: "#34A853" }}
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                style={{ color: "#FBBC05" }}
                                            />
                                            <path
                                                fill="currentColor"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                style={{ color: "#EA4335" }}
                                            />
                                        </svg>
                                        Registrarse con Google (Crea Org)
                                    </button>
                                </form>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">O llena el formulario</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Org Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Nombre del Negocio</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                            placeholder="Ej. Tienda Deportiva"
                                            value={formData.orgName}
                                            onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* User Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Tu Nombre</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                        <input
                                            type="text"
                                            required
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                            placeholder="Ej. Juan Pérez"
                                            value={formData.userName}
                                            onChange={e => setFormData({ ...formData, userName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Correo Electrónico</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                        <input
                                            type="email"
                                            required
                                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                                            placeholder="juan@empresa.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Passwords */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Contraseña</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                            <input
                                                type="password"
                                                required
                                                minLength={6}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-sm"
                                                placeholder="******"
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Confirmar</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                            <input
                                                type="password"
                                                required
                                                minLength={6}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-sm"
                                                placeholder="******"
                                                value={formData.confirmPassword}
                                                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {error}
                                    </div>
                                )}

                                <div className="text-xs text-center text-slate-400 px-4">
                                    Al continuar, aceptas nuestros <Link href="/privacy" className="underline hover:text-slate-600">Términos y Política de Privacidad</Link>.
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Crear Cuenta <ArrowRight className="w-5 h-5" /></>}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" className="text-blue-600 font-bold hover:underline">
                            Iniciar Sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
