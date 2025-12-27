"use strict";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { User, History, AlertTriangle, ArrowRight } from "lucide-react";

interface AuditLog {
    id: string;
    userName: string;
    reason: string;
    changes: any;
    createdAt: string;
}

export default function AuditTimeline({ audits }: { audits: AuditLog[] }) {
    if (!audits || audits.length === 0) return null;

    return (
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                    <History className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-wide">Historial de Cambios</h3>
                    <p className="text-xs text-slate-500 font-medium">Registro de auditoría y modificaciones</p>
                </div>
            </div>

            <div className="divide-y divide-slate-100">
                {audits.map((log) => {
                    const changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;

                    return (
                        <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors group">
                            <div className="flex items-start gap-4">
                                {/* Auto-Avatar based on Initial */}
                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                                    {log.userName?.charAt(0) || "U"}
                                </div>

                                <div className="flex-1 space-y-3">

                                    {/* Header: Who, When, Why */}
                                    <div>
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-bold text-slate-800 text-sm">
                                                {log.userName} <span className="text-slate-400 font-normal">modificó la factura</span>
                                            </p>
                                            <span className="text-xs font-mono text-slate-400">
                                                {format(new Date(log.createdAt), "dd MMM yyyy - HH:mm", { locale: es })}
                                            </span>
                                        </div>
                                        <div className="mt-2 bg-orange-50 border border-orange-100 text-orange-800 text-xs font-medium px-3 py-2 rounded-lg inline-block">
                                            <span className="font-bold uppercase tracking-wide mr-1 text-[10px]">Razón:</span>
                                            "{log.reason}"
                                        </div>
                                    </div>

                                    {/* Diff Visualization */}
                                    {changes && (
                                        <div className="space-y-2 mt-2">
                                            {/* Financial Changes */}
                                            {(changes.oldTotal !== changes.newTotal) && (
                                                <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 w-fit px-2 py-1 rounded border border-slate-200">
                                                    <span className="text-slate-500">Total:</span>
                                                    <span className="line-through decoration-red-500 decoration-2">${changes.oldTotal?.toLocaleString()}</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                                    <span className="font-bold text-slate-900">${changes.newTotal?.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {/* Item Changes */}
                                            {changes.itemChanges && changes.itemChanges.length > 0 && (
                                                <div className="grid gap-1">
                                                    {changes.itemChanges.map((item: any, idx: number) => (
                                                        <div key={idx} className="text-xs flex items-center gap-2 text-slate-600">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1" />
                                                            <span className="font-black text-slate-800 mr-1">
                                                                {item.productName}
                                                            </span>
                                                            <span className="text-slate-300 mx-1">|</span>

                                                            {/* Quantity Change */}
                                                            {item.oldQty !== item.newQty && (
                                                                <span className="bg-blue-50 text-blue-700 px-1.5 rounded flex items-center gap-1 border border-blue-100 font-mono">
                                                                    Cant: {item.oldQty} <ArrowRight className="w-3 h-3" /> {item.newQty}
                                                                </span>
                                                            )}

                                                            {/* Price Change */}
                                                            {item.oldPrice !== item.newPrice && (
                                                                <span className="bg-green-50 text-green-700 px-1.5 rounded flex items-center gap-1 border border-green-100">
                                                                    Precio: ${item.oldPrice?.toLocaleString()} <ArrowRight className="w-2 h-2" /> ${item.newPrice?.toLocaleString()}
                                                                </span>
                                                            )}

                                                            {/* New Item Tag */}
                                                            {item.type === 'added' && (
                                                                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">Nuevo</span>
                                                            )}

                                                            {/* Removed Item Tag */}
                                                            {item.type === 'removed' && (
                                                                <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">Eliminado</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
