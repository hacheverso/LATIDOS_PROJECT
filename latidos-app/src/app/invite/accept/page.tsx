import { Package } from "lucide-react";
import { checkInvitationWarning, acceptInvitation, getInvitationContext } from "./actions";
import { InviteForm } from "./InviteForm";

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

    const context = await getInvitationContext(token);
    const acceptAction = acceptInvitation.bind(null, token);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20 mb-6 rotate-3">
                        <Package className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
                        ¡Hola! Te damos la bienvenida a la familia {context?.orgName}
                    </h2>

                    <p className="text-slate-500 font-medium leading-relaxed">
                        Estás a un paso de comenzar. Configura tu acceso seguro para empezar a trabajar en Latidos.
                    </p>
                </div>

                <div className="pt-2">
                    <InviteForm action={acceptAction} />
                </div>
            </div>
        </div>
    )
}
