import { isFirstUsage, createAdminOrganization } from "../actions/setup";
import { redirect } from "next/navigation";
import { SetupForm } from "./SetupForm";

export default async function RegisterAdminPage() {
    // Security: Only allow if no users exist
    const isFirst = await isFirstUsage();
    if (!isFirst) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 p-8 text-white text-center">
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Bienvenido a Latidos</h1>
                    <p className="text-blue-100 font-medium">Configuración Inicial del Sistema</p>
                </div>

                <div className="p-8">
                    <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl text-sm text-blue-800">
                        <p className="font-bold mb-1">Has iniciado el sistema por primera vez.</p>
                        <p>Crea la Organización Principal y tu cuenta de Administrador para comenzar.</p>
                    </div>

                    <SetupForm action={createAdminOrganization} />
                </div>
            </div>
        </div>
    );
}
