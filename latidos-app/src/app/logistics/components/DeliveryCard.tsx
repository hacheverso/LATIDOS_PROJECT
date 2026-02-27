"use client";

import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Phone, MapPin, MessageCircle, FileText, ClipboardList, AlertTriangle, ChevronDown, ChevronUp, Package, DollarSign, CheckCircle, Store, Clock, Map as MapIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    const [isReportOpen, setIsReportOpen] = useState(false);

    // Urgency Styling
    const urgencyConfig = {
        LOW: { color: "bg-slate-100 dark:bg-slate-800/50 text-muted", border: "border-border" },
        MEDIUM: { color: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400", border: "border-blue-100 dark:border-blue-500/20" },
        HIGH: { color: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400", border: "border-red-200 dark:border-red-500/20" },
        CRITICAL: { color: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300", border: "border-red-500 dark:border-red-500/50 shadow-red-100 dark:shadow-none ring-1 ring-red-500/20" }
    };

    const style = urgencyConfig[item.urgency] || urgencyConfig.MEDIUM;

    // Helper to render Product List (Sales Only)
    const renderProductList = () => {
        if (item.type !== 'SALE' || !item.sale?.instances) return null;

        // Group instances by Product for Summary
        const instances = item.sale.instances;
        const groupedMap = new Map<string, any>();

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
            <div className="mt-3 bg-background rounded-lg p-2 border border-slate-100/50 dark:border-white/5 transition-colors">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Contenido del Pedido
                </div>
                <div className="space-y-1.5">
                    {visibleProducts.map((prod: any, idx: number) => (
                        <div key={idx} className="text-xs text-muted flex justify-between items-start leading-tight">
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
                    <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/10 space-y-2 animate-in slide-in-from-top-1">
                        {/* Full Item Details with Serials */}
                        {distinctProducts.map((prod: any, idx: number) => (
                            <div key={idx} className="text-[10px] text-muted">
                                {prod.serials.length > 0 && (
                                    <div className="pl-4 border-l-2 border-slate-200 dark:border-white/20 mt-0.5">
                                        <div className="font-bold text-[9px] text-muted mb-0.5">{prod.name} Seriales:</div>
                                        {prod.serials.map((s: string, i: number) => (
                                            <div key={i} className="font-mono text-[9px] text-muted">{s}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Delivery Notes */}
                        {item.description && (
                            <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-500 p-2 rounded text-[11px] leading-snug border border-amber-100 dark:border-amber-500/20">
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
                    className={`bg-surface rounded-xl p-3 shadow-sm border mb-2 transition-all group ${style.border} ${snapshot.isDragging ? "shadow-xl ring-2 ring-blue-500/20 rotate-2" : "hover:shadow-md"
                        }`}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase ${style.color}`}>
                            {item.urgency === 'CRITICAL' && <AlertTriangle className="w-3 h-3" />}
                            {item.urgency === 'CRITICAL' ? 'Crítica' : item.urgency === 'HIGH' ? 'Alta' : item.urgency === 'LOW' ? 'Baja' : 'Normal'}
                        </div>

                        {item.type === 'SALE' ? (
                            <div className="flex items-center gap-1">
                                {item.sale?.deliveryMethod === 'PICKUP' ? (
                                    <span className="font-mono text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1" title="Recogida en Tienda">
                                        <Store className="w-3 h-3" /> RECOGIDA
                                    </span>
                                ) : (
                                    // Status Check: If On Route, show Truck? Or just keep invoice number?
                                    // User requirement: "Si es 'Domicilio', icono de Reloj/Alerta indicando que falta asignar"
                                    item.status === 'PENDING' ? (
                                        <span className="font-mono text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 px-1.5 py-0.5 rounded font-bold flex items-center gap-1" title="Pendiente de Asignación">
                                            <Clock className="w-3 h-3" /> EN ESPERA
                                        </span>
                                    ) : null
                                )}
                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800/50 text-muted px-1.5 py-0.5 rounded font-bold">
                                    {item.title.replace("Factura ", "")}
                                </span>
                            </div>
                        ) : (
                            <span className="font-mono text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" /> TAREA
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <h4 className="font-black text-slate-800 dark:text-white text-sm leading-tight mb-1">
                        {item.type === 'SALE' ? item.sale?.customer?.name : item.title}
                    </h4>

                    {/* Task Description (Prominent) vs Sale Address */}
                    {item.type === 'TASK' && item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 leading-relaxed bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-border">
                            {item.description}
                        </p>
                    )}

                    {item.address && (
                        <div className="flex items-start gap-1 text-[10px] text-muted mb-2 line-clamp-2">
                            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>
                                {item.address}
                                {item.type === 'SALE' && item.sale?.customer?.sector && (
                                    <span className="ml-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1 py-0.5 rounded">
                                        ({item.sale.customer.sector})
                                    </span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* Financials for Tasks (Big & Bold) */}
                    {(item.moneyToCollect > 0) && (
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-2 rounded-lg text-base font-black w-full justify-between mb-2 border border-green-100 dark:border-green-500/20">
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
                    <div className="flex gap-1 mt-2 pt-2 border-t border-slate-50 dark:border-white/5 relative">
                        {item.phone && (
                            <a
                                href={`https://wa.me/57${item.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-700 dark:text-green-400 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors group/btn"
                                title="WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </a>
                        )}
                        {/* Map Options Button (Popover) */}
                        {item.address && (
                            <div className="flex-1 relative">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className="w-full py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 data-[state=open]:bg-indigo-100 data-[state=open]:text-indigo-700 dark:data-[state=open]:bg-indigo-500/20 dark:data-[state=open]:text-indigo-400"
                                            title="Abrir Mapa"
                                        >
                                            <MapIcon className="w-4 h-4" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" align="center" sideOffset={5} className="w-48 p-2 z-[9999] bg-background shadow-xl border border-border">
                                        <div className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 px-1">Abrir con...</div>
                                        <div className="space-y-1">
                                            <a
                                                href={`https://waze.com/ul?q=${encodeURIComponent(item.address)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white text-xs font-bold transition-colors"
                                            >
                                                <span className="text-lg">🚙</span>
                                                Waze
                                            </a>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white text-xs font-bold transition-colors"
                                            >
                                                <span className="text-lg">🗺️</span>
                                                Maps
                                            </a>
                                        </div>
                                        {/* Arrow Indicator */}
                                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-background border-b border-r border-border rotate-45 group-data-[side=bottom]:-top-1.5 group-data-[side=bottom]:border-t group-data-[side=bottom]:border-l group-data-[side=bottom]:border-b-0 group-data-[side=bottom]:border-r-0 shadow-sm"></div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}

                        {/* Expand Button (If has items) */}
                        {item.type === 'SALE' && item.sale?.instances && item.sale.instances.length > 0 && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex-1 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-muted py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
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

                        {/* Finalize Button (For On Route OR Pending/Pickup) */}
                        {(item.status === 'ON_ROUTE' || item.status === 'PENDING') && (
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-green-200"
                                title="Finalizar Entrega (Firma Requerida)"
                            >
                                <CheckCircle className="w-6 h-6" />
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
