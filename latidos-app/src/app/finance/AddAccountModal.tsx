"use client";

import { useState } from "react";
import { Plus, Wallet, X, Loader2, Building } from "lucide-react";
import { createPortal } from "react-dom";
import { createPaymentAccount } from "@/app/finance/actions";

export default function AddAccountModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState<"CASH" | "BANK" | "RETOMA" | "NOTA_CREDITO">("CASH");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsLoading(true);
        try {
            await createPaymentAccount(name, type);
            setIsOpen(false);
            setName("");
            setType("CASH");
        } catch (error) {
            alert("Error al crear cuenta: " + error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 cursor-pointer transition-all h-[180px] group"
            >
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors mb-3">
                    <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-xs uppercase tracking-wide">Crear Nueva Cuenta</span>
            </div>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nueva Cuenta</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setType("CASH")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'CASH' ? 'border-blue-500 bg-blue-50/50 text-blue-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                >
                                    <Wallet className={`w-8 h-8 ${type === 'CASH' ? 'fill-blue-500/20' : ''}`} />
                                    <span className="text-xs font-bold uppercase">Efectivo / Caja</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("BANK")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'BANK' ? 'border-purple-500 bg-purple-50/50 text-purple-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                >
                                    <Building className={`w-8 h-8 ${type === 'BANK' ? 'fill-purple-500/20' : ''}`} />
                                    <span className="text-xs font-bold uppercase">Banco</span>
                                </button>
                                <button
                                    type="button"
                                    // @ts-ignore
                                    onClick={() => setType("RETOMA")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'RETOMA' ? 'border-amber-500 bg-amber-50/50 text-amber-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                >
                                    <span className="text-2xl">📱</span>
                                    <span className="text-xs font-bold uppercase">Retoma</span>
                                </button>
                                <button
                                    type="button"
                                    // @ts-ignore
                                    onClick={() => setType("NOTA_CREDITO")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${type === 'NOTA_CREDITO' ? 'border-rose-500 bg-rose-50/50 text-rose-700' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'}`}
                                >
                                    <span className="text-2xl">📄</span>
                                    <span className="text-xs font-bold uppercase">Nota Crédito</span>
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre de la Cuenta</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full text-lg font-bold p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 text-slate-900"
                                    placeholder="Ej. Caja Principal, Nequi, Bancolombia..."
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading || !name}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-5 h-5" />
                                            Crear Cuenta
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
