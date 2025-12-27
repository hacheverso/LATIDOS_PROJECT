import { Package } from "lucide-react";
import { checkInvitationWarning, acceptInvitation } from "./actions";

export default async function AcceptInvitePage({ searchParams }: { searchParams: { token: string } }) {
    const token = searchParams.token;
    const warning = await checkInvitationWarning(token);

    if (warning) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
                    <h1 className="text-xl font-bold text-red-600">Error de Invitación</h1>
                    <p className="text-slate-600">{warning}</p>
                </div>
            </div>
        );
    }

    const acceptAction = acceptInvitation.bind(null, token);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-6">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 mb-4">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900">Bienvenido al Equipo</h2>
                    <p className="text-slate-500 font-medium text-center">Configura tu acceso seguro</p>
                </div>

                <form action={acceptAction} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 ml-1">Nueva Contraseña</label>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold focus:ring-0 focus:border-slate-900 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 ml-1">PIN de Seguridad (4 dígitos)</label>
                        <input
                            name="pin"
                            type="text"
                            pattern="[0-9]{4}"
                            maxLength={4}
                            required
                            placeholder="0000"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold focus:ring-0 focus:border-slate-900 transition-all"
                        />
                        <p className="text-xs text-slate-500 font-bold ml-1">Usarás este PIN para autorizar cambios sensibles.</p>
                    </div>

                    <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                        Confirmar Cuenta
                    </button>
                </form>
            </div>
        </div>
    )
}
