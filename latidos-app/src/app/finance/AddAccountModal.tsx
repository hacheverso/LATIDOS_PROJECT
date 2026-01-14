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
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-md shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.02)] hover:bg-slate-800 transition-all text-base font-bold active:scale-95"
            >
                <Plus className="w-5 h-5" />
                <span>Nueva Cuenta</span>
            </button>

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
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setType("CASH")}
                                    className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all h-40 ${type === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className={`p-4 rounded-full ${type === 'CASH' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                                        <Wallet className={`w-8 h-8 ${type === 'CASH' ? 'text-emerald-600' : 'text-slate-500'}`} />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-wide">Efectivo / Caja</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("BANK")}
                                    className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all h-40 ${type === 'BANK' ? 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-500/20' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className={`p-4 rounded-full ${type === 'BANK' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                        <Building className={`w-8 h-8 ${type === 'BANK' ? 'text-blue-600' : 'text-slate-500'}`} />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-wide">Banco</span>
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
