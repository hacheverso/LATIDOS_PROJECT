import { isFirstUsage, createAdminOrganization } from "../actions/setup";
import { redirect } from "next/navigation";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
    // Security: Only allow if no users exist
    const isFirst = await isFirstUsage();
    if (!isFirst) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 p-8 text-white text-center">
                    <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Configuración Inicial</h1>
                    <p className="text-slate-400 font-medium text-sm">Prepara tu entorno de trabajo en segundos</p>
                </div>

                <div className="p-8">
                    <SetupForm action={createAdminOrganization} />
                </div>
            </div>
        </div>
    );
}
