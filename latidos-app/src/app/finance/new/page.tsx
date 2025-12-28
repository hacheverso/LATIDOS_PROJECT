"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPaymentAccounts, createTransaction } from "../actions";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function NewTransactionPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: "",
        type: "EXPENSE", // Default to Expense as it's most common manual entry
        description: "",
        category: "Arriendo", // Default
        accountId: ""
    });

    useEffect(() => {
        getPaymentAccounts().then(setAccounts);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.accountId) {
            toast.error("Seleccione una cuenta");
            return;
        }

        setIsLoading(true);
        try {
            await createTransaction({
                amount: Number(formData.amount),
                type: formData.type as "INCOME" | "EXPENSE",
                description: formData.description,
                category: formData.category,
                accountId: formData.accountId
            });
            toast.success("Transacción registrada");
            router.push("/finance");
        } catch (error) {
            toast.error("Error al registrar: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const categories = [
        "Arriendo", "Nómina", "Servicios Públicos", "Mercancía", "Impuestos", "Mantenimiento", "Publicidad", "Otros"
    ];

    return (
        <div className="max-w-xl mx-auto pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/finance" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Nueva Transacción</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">

                {/* Type Selector */}
                <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "INCOME" })}
                        className={`py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all ${formData.type === 'INCOME'
                                ? 'bg-white text-green-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Ingreso
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: "EXPENSE" })}
                        className={`py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all ${formData.type === 'EXPENSE'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Gasto
                    </button>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monto</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input
                            type="number"
                            required
                            className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                            placeholder="0.00"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                </div>

                {/* Account */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuenta Afectada</label>
                    <select
                        required
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all appearance-none"
                        value={formData.accountId}
                        onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                    >
                        <option value="">Seleccione Cuenta...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>

                {/* Category & Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                        <select
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                            placeholder="Ej: Pago arriendo Enero"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Guardar Transacción
                </button>

            </form>
        </div>
    );
}
