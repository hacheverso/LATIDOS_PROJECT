"use client";

import { useState } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { assignDelivery, unassignDelivery, switchToPickup, BoardItem } from "../actions";
import DeliveryCard from "./DeliveryCard";
import { Truck, Package, Store } from "lucide-react";
import { toast } from "sonner";

interface LogisticsBoardProps {
    initialData: {
        drivers: any[];
        pending: BoardItem[];
        pickup: any[];
    };
}

export default function LogisticsBoard({ initialData }: LogisticsBoardProps) {
    const [drivers, setDrivers] = useState(initialData.drivers);
    const [pending, setPending] = useState(initialData.pending);
    const [pickup, setPickup] = useState(initialData.pickup);

    const onDragEnd = async (result: any) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        // Determine Source List
        // Drivers now have .items, not .deliveries
        let sourceList = source.droppableId === "PENDING" ? pending : drivers.find(d => d.id === source.droppableId)?.items || [];

        // Optimistic Update Helpers
        const movedItem = sourceList.find((i: BoardItem) => i.id === draggableId);
        if (!movedItem) return;

        // Helper to sort by priority
        const sortItems = (items: BoardItem[]) => {
            return [...items].sort((a, b) => {
                const urgencyWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                const wA = urgencyWeight[a.urgency] || 2;
                const wB = urgencyWeight[b.urgency] || 2;
                if (wA !== wB) return wB - wA;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        };

        // Logic:
        // 1. Pending -> Driver (Assign)
        if (source.droppableId === "PENDING" && destination.droppableId !== "PENDING") {
            // Optimistic Remove from Pending
            setPending(prev => prev.filter(i => i.id !== draggableId));
            // Optimistic Add to Driver (with Sort)
            setDrivers(prev => prev.map(d => {
                if (d.id === destination.droppableId) {
                    const newItems = [...(d.items || []), { ...movedItem, status: "ON_ROUTE" }];
                    return { ...d, items: sortItems(newItems) };
                }
                return d;
            }));

            // Server Action
            toast.promise(assignDelivery(draggableId, destination.droppableId, movedItem.type), {
                loading: "Asignando ruta...",
                success: "Asignado correctamente",
                error: "Error al asignar"
            });
        }

        // 2. Driver -> Pending (Unassign)
        else if (source.droppableId !== "PENDING" && destination.droppableId === "PENDING") {
            // Optimistic Remove from Driver
            setDrivers(prev => prev.map(d => {
                if (d.id === source.droppableId) {
                    return { ...d, items: d.items.filter((i: BoardItem) => i.id !== draggableId) };
                }
                return d;
            }));
            // Optimistic Add to Pending (with Sort)
            setPending(prev => sortItems([{ ...movedItem, status: "PENDING" }, ...prev]));

            toast.promise(unassignDelivery(draggableId, movedItem.type), {
                loading: "Removiendo ruta...",
                success: "Movido a pendientes",
                error: "Error al desasignar"
            });
        }

        // 4. Move to PICKUP
        else if (destination.droppableId === "PICKUP") {
            // Remove from Source
            if (source.droppableId === "PENDING") {
                setPending(prev => prev.filter(i => i.id !== draggableId));
            } else {
                setDrivers(prev => prev.map(d => {
                    if (d.id === source.droppableId) {
                        return { ...d, items: d.items.filter((i: BoardItem) => i.id !== draggableId) };
                    }
                    return d;
                }));
            }

            // Add to Pickup (Optimistic)
            setPickup(prev => [{ ...movedItem, status: "PENDING" }, ...prev]);

            toast.promise(switchToPickup(draggableId), {
                loading: "Moviendo a Recogida...",
                success: "Movido a Recogida en Local",
                error: "Error al mover"
            });
        }

        // 5. Driver -> Driver (Reorder or Reassign)
        else if (source.droppableId !== "PENDING" && destination.droppableId !== "PENDING") {

            // Case A: Reorder within same driver (Snap-Back to Priority)
            if (source.droppableId === destination.droppableId) {
                setDrivers(prev => prev.map(d => {
                    if (d.id === source.droppableId) {
                        return { ...d, items: sortItems(d.items) };
                    }
                    return d;
                }));
                return;
            }

            // Case B: Reassign to another driver
            // 1. Remove from Source
            setDrivers(prev => prev.map(d => {
                if (d.id === source.droppableId) {
                    return { ...d, items: d.items.filter((i: BoardItem) => i.id !== draggableId) };
                }
                // 2. Add to Destination
                if (d.id === destination.droppableId) {
                    const newItems = [...(d.items || []), { ...movedItem, status: "ON_ROUTE" }];
                    return { ...d, items: sortItems(newItems) };
                }
                return d;
            }));

            toast.promise(assignDelivery(draggableId, destination.droppableId, movedItem.type), {
                loading: "Reasignando...",
                success: "Reasignado correctamente",
                error: "Error al reasignar"
            });
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4 overflow-x-auto p-4 pb-20">

                {/* 1. Pending Column */}
                <div className="min-w-[320px] max-w-[320px] flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/60">
                    <div className="p-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm rounded-t-2xl sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="font-black text-slate-800 flex items-center gap-2">
                                <Package className="w-5 h-5 text-orange-500" />
                                Pendientes
                            </h2>
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                {pending.length}
                            </span>
                        </div>
                    </div>

                    <Droppable droppableId="PENDING">
                        {(provided, snapshot) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`flex-1 p-3 overflow-y-auto no-scrollbar transition-colors ${snapshot.isDraggingOver ? "bg-orange-50/50" : ""
                                    }`}
                            >
                                {pending.map((item, index) => (
                                    <DeliveryCard key={item.id} item={item} index={index} />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                {/* 2. Pickup Column (Recogida en Local) */}
                <div className="min-w-[320px] max-w-[320px] flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200/60">
                    <div className="p-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm rounded-t-2xl sticky top-0 z-10">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="font-black text-slate-800 flex items-center gap-2">
                                <Store className="w-5 h-5 text-purple-500" />
                                Recogida en Local
                            </h2>
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                {pickup.length}
                            </span>
                        </div>
                    </div>

                    <Droppable droppableId="PICKUP">
                        {(provided, snapshot) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`flex-1 p-3 overflow-y-auto no-scrollbar transition-colors ${snapshot.isDraggingOver ? "bg-purple-50/50" : ""
                                    }`}
                            >
                                {pickup.map((item, index) => (
                                    <DeliveryCard key={item.id} item={item} index={index} />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                {/* 2. Drivers Columns */}
                {drivers.map((driver) => (
                    <div key={driver.id} className="min-w-[320px] max-w-[320px] flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200/60">
                        <div className="p-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-sm rounded-t-2xl sticky top-0 z-10">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="font-black text-slate-800 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-blue-500" />
                                    {driver.name.split(" ")[0]}
                                </h2>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {driver.items?.length || 0} En Ruta
                                </span>
                            </div>
                        </div>

                        <Droppable droppableId={driver.id}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 p-3 overflow-y-auto no-scrollbar transition-colors ${snapshot.isDraggingOver ? "bg-blue-50/50" : ""
                                        }`}
                                >
                                    {driver.items?.map((item: BoardItem, index: number) => (
                                        <DeliveryCard key={item.id} item={item} index={index} />
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
}
