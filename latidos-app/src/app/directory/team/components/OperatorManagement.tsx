"use client";

import { useState, useEffect } from "react";
import { getOperators, createOperator, deleteOperator } from "@/app/directory/team/actions";
import { Plus, Trash2, Key, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Operator {
    id: string;
    name: string;
    isActive: boolean;
}

export function OperatorManagement({ userRole }: { userRole: string | null }) {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [newOpName, setNewOpName] = useState("");
    const [newOpPin, setNewOpPin] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const loadOperators = async () => {
        setIsLoading(true);
        try {
            const data = await getOperators();
            setOperators(data);
        } catch (error) {
            toast.error("Error cargando operadores");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOperators();
    }, []);

    const handleCreate = async () => {
        if (!newOpName.trim() || newOpPin.length !== 4) {
            toast.error("Nombre inválido o el PIN debe ser de 4 dígitos exactos.");
            return;
        }

        try {
            await createOperator(newOpName, newOpPin);
            toast.success("Operador creado correctamente");
            setNewOpName("");
            setNewOpPin("");
            loadOperators();
        } catch (error: any) {
            toast.error(error.message || "Error al crear operador");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de eliminar este operador?")) {
            try {
                await deleteOperator(id);
                toast.success("Operador eliminado");
                loadOperators();
            } catch (error) {
                toast.error("Error al eliminar");
            }
        }
    };

    return (
        <div className="space-y-6 bg-surface p-6 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-foreground">Operadores de Oficina (Dual ID)</h3>
                    <p className="text-sm text-muted">Gestiona los perfiles para terminales compartidas.</p>
                </div>
            </div>

            {/* Create Form - ADMIN ONLY */}
            {userRole === 'ADMIN' && (
                <div className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-transparent dark:border-white/5">
                    <div className="flex-1 space-y-1 w-full sm:w-auto">
                        <label className="text-xs font-bold text-muted uppercase">Nuevo Operador</label>
                        <input
                            type="text"
                            placeholder="Nombre (ej. Mateo)"
                            className="w-full px-4 py-2 rounded-lg border border-border outline-none focus:border-slate-900 dark:focus:border-white font-bold text-foreground bg-surface"
                            value={newOpName}
                            onChange={(e) => setNewOpName(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-32 space-y-1">
                        <label className="text-xs font-bold text-muted uppercase">PIN (4 Dig)</label>
                        <input
                            type="text"
                            placeholder="0000"
                            maxLength={4}
                            pattern="\d*"
                            className="w-full px-4 py-2 rounded-lg border border-border outline-none focus:border-slate-900 dark:focus:border-white font-bold text-foreground tracking-widest text-center bg-surface"
                            value={newOpPin}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, ''); // Only numbers
                                if (val.length <= 4) setNewOpPin(val);
                            }}
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Crear
                    </button>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {operators.map((op) => (
                    <div key={op.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white dark:bg-white/5 hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-muted">
                                {op.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-foreground">{op.name}</p>
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <Key size={10} /> PIN Protegido
                                </p>
                            </div>
                        </div>
                        {userRole === 'ADMIN' && (
                            <button
                                onClick={() => handleDelete(op.id)}
                                className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
                {operators.length === 0 && !isLoading && (
                    <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                        No hay operadores registrados aún.
                    </div>
                )}
            </div>
        </div>
    );
}
