"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Phone, MapPin, MessageCircle, FileText, ClipboardList, AlertTriangle, ChevronDown, ChevronUp, Package, DollarSign, CheckCircle } from "lucide-react";
import { BoardItem } from "../actions";
import FinalizeDeliveryModal from "./FinalizeDeliveryModal";
import ReportIssueModal from "./ReportIssueModal"; // NEW

interface DeliveryCardProps {
    item: BoardItem;
    index: number;
}

export default function DeliveryCard({ item, index }: DeliveryCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false); // NEW

    // Urgency Styling
    const urgencyConfig = {
        LOW: { color: "bg-slate-100 text-slate-500", border: "border-slate-100" },
        MEDIUM: { color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
        HIGH: { color: "bg-red-50 text-red-600", border: "border-red-200" },
        CRITICAL: { color: "bg-red-100 text-red-700", border: "border-red-500 shadow-red-100 ring-1 ring-red-500/20" }
    };

    const style = urgencyConfig[item.urgency] || urgencyConfig.MEDIUM;

    // Helper to render Product List (Sales Only)
    const renderProductList = () => {
        if (item.type !== 'SALE' || !item.sale?.instances) return null;

        // Group instances by Product for Summary
        const instances = item.sale.instances;
        const groupedMap = new Map();

        instances.forEach((inst: any) => {
            const pid = inst.product.id;
            if (!groupedMap.has(pid)) {
                groupedMap.set(pid, { ...inst.product, count: 0, serials: [] });
            }
            const entry = groupedMap.get(pid);
            entry.count += 1;
            if (inst.serialNumber) entry.serials.push(inst.serialNumber);
        });

        const distinctProducts = Array.from(groupedMap.values());
        const visibleProducts = isExpanded ? distinctProducts : distinctProducts.slice(0, 2);
        const remainingCount = distinctProducts.length - 2;

        return (
            <div className="mt-3 bg-slate-50 rounded-lg p-2 border border-slate-100/50">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Contenido del Pedido
                </div>
                <div className="space-y-1.5">
                    {visibleProducts.map((prod: any, idx: number) => (
                        <div key={idx} className="text-xs text-slate-600 flex justify-between items-start leading-tight">
                            <span className="font-medium line-clamp-1 flex-1">
                                {prod.count}x {prod.name}
                            </span>
                        </div>
                    ))}

                    {!isExpanded && remainingCount > 0 && (
                        <div className="text-[10px] text-slate-400 font-medium pl-1">
                            + {remainingCount} productos más...
                        </div>
                    )}
                </div>

                {/* Expanded Details (Serials/Notes) */}
                {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-200/50 space-y-2 animate-in slide-in-from-top-1">
                        {/* Full Item Details with Serials */}
                        {distinctProducts.map((prod: any, idx: number) => (
                            <div key={idx} className="text-[10px] text-slate-500">
                                {prod.serials.length > 0 && (
                                    <div className="pl-4 border-l-2 border-slate-200 mt-0.5">
                                        <div className="font-bold text-[9px] text-slate-400 mb-0.5">{prod.name} Seriales:</div>
                                        {prod.serials.map((s: string, i: number) => (
                                            <div key={i} className="font-mono text-[9px] text-slate-500">{s}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Delivery Notes */}
                        {item.description && (
                            <div className="bg-amber-50 text-amber-800 p-2 rounded text-[11px] leading-snug border border-amber-100">
                                <span className="font-bold block text-[9px] uppercase tracking-wide opacity-70 mb-0.5">Nota para Mensajero:</span>
                                {item.description}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Draggable draggableId={item.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`bg-white rounded-xl p-3 shadow-sm border mb-2 transition-all group ${style.border} ${snapshot.isDragging ? "shadow-xl ring-2 ring-blue-500/20 rotate-2" : "hover:shadow-md"
                        }`}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase ${style.color}`}>
                            {item.urgency === 'CRITICAL' && <AlertTriangle className="w-3 h-3" />}
                            {item.urgency === 'CRITICAL' ? 'Crítica' : item.urgency === 'HIGH' ? 'Alta' : item.urgency === 'LOW' ? 'Baja' : 'Normal'}
                        </div>

                        {item.type === 'SALE' ? (
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                                {item.title.replace("Factura ", "")}
                            </span>
                        ) : (
                            <span className="font-mono text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" /> TAREA
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <h4 className="font-black text-slate-800 text-sm leading-tight mb-1">
                        {item.type === 'SALE' ? item.sale?.customer?.name : item.title}
                    </h4>

                    {/* Task Description (Prominent) vs Sale Address */}
                    {item.type === 'TASK' && item.description && (
                        <p className="text-xs text-slate-600 mb-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {item.description}
                        </p>
                    )}

                    {item.address && (
                        <div className="flex items-start gap-1 text-[10px] text-slate-500 mb-2 line-clamp-2">
                            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>
                                {item.address}
                                {item.type === 'SALE' && item.sale?.customer?.sector && (
                                    <span className="ml-1 font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                                        ({item.sale.customer.sector})
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* Financials for Tasks (Big & Bold) */}
                    {(item.moneyToCollect > 0) && (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-base font-black w-full justify-between mb-2 border border-green-100">
                            <span className="text-[10px] uppercase font-bold opacity-70">Cobrar:</span>
                            <div className="flex items-center">
                                <DollarSign className="w-4 h-4" />
                                {item.moneyToCollect.toLocaleString()}
                            </div>
                        </div>
                    )}

                    {/* Product List (Conditional) */}
                    {renderProductList()}

                    {/* Actions & Expansion */}
                    <div className="flex gap-1 mt-2 pt-2 border-t border-slate-50 relative">
                        {item.phone && (
                            <a
                                href={`https://wa.me/57${item.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors group/btn"
                                title="WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </a>
                        )}
                        {item.address && (
                            <a
                                href={`https://waze.com/ul?q=${encodeURIComponent(item.address)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors group/btn"
                                title="Waze"
                            >
                                <MapPin className="w-4 h-4" />
                            </a>
                        )}

                        {/* Expand Button (If has items) */}
                        {item.type === 'SALE' && item.sale?.instances && item.sale.instances.length > 0 && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        )}

                        {/* Report Issue Button (NEW) */}
                        {(item.status === 'ON_ROUTE' || item.sale?.deliveryMethod === 'PICKUP') && (
                            <button
                                onClick={() => setIsReportOpen(true)}
                                className="flex-1 text-amber-500 hover:bg-amber-50 hover:text-amber-700 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                                title="Reportar Novedad/Cancelar"
                            >
                                <AlertTriangle className="w-4 h-4" />
                            </button>
                        )}

                        {/* Finalize Button (Only for On Route or Pickup) */}
                        {(item.status === 'ON_ROUTE' || item.sale?.deliveryMethod === 'PICKUP') && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors shadow-sm shadow-green-200"
                                title="Finalizar Entrega"
                            >
                                <CheckCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <FinalizeDeliveryModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        item={item}
                    />

                    <ReportIssueModal
                        isOpen={isReportOpen}
                        onClose={() => setIsReportOpen(false)}
                        item={item}
                    />
                </div>
            )}
        </Draggable>
    );
}
