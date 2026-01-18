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
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Operadores de Oficina (Dual ID)</h3>
                    <p className="text-sm text-slate-500">Gestiona los perfiles para terminales compartidas.</p>
                </div>
            </div>

            {/* Create Form - ADMIN ONLY */}
            {userRole === 'ADMIN' && (
                <div className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nuevo Operador</label>
                        <input
                            type="text"
                            placeholder="Nombre (ej. Mateo)"
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-slate-900 font-bold text-slate-900"
                            value={newOpName}
                            onChange={(e) => setNewOpName(e.target.value)}
                        />
                    </div>
                    <div className="w-32 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">PIN (4 Dig)</label>
                        <input
                            type="text"
                            placeholder="0000"
                            maxLength={4}
                            pattern="\d*"
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-slate-900 font-bold text-slate-900 tracking-widest text-center"
                            value={newOpPin}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, ''); // Only numbers
                                if (val.length <= 4) setNewOpPin(val);
                            }}
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        <Plus size={18} /> Crear
                    </button>
                </div>
            )}

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {operators.map((op) => (
                    <div key={op.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                {op.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">{op.name}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <Key size={10} /> PIN Protegido
                                </p>
                            </div>
                        </div>
                        {userRole === 'ADMIN' && (
                            <button
                                onClick={() => handleDelete(op.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
