"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { assignDelivery, unassignDelivery, switchToPickup, BoardItem } from "../actions";
import DeliveryCard from "./DeliveryCard";
import { Truck, Package, Store, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LogisticsBoardProps {
    initialData: {
        drivers: any[];
        pending: BoardItem[];
        pickup: any[];
        completed: BoardItem[];
    };
}

export default function LogisticsBoard({ initialData }: LogisticsBoardProps) {
    const [drivers, setDrivers] = useState(initialData.drivers);
    const [pending, setPending] = useState(initialData.pending);
    const [pickup, setPickup] = useState(initialData.pickup);
    const [completed, setCompleted] = useState(initialData.completed);
    const [mobileTab, setMobileTab] = useState("PENDING");

    // Sync state with props when router.refresh() updates initialData
    useEffect(() => {
        setDrivers(initialData.drivers);
        setPending(initialData.pending);
        setPickup(initialData.pickup);
        setCompleted(initialData.completed);
    }, [initialData]);

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
        if (source.droppableId === "PICKUP") sourceList = pickup;

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
        if (source.droppableId === "PENDING" && destination.droppableId !== "PENDING" && destination.droppableId !== "PICKUP") {
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
                error: (err) => `Error al asignar: ${err.message}`
            });
        }

        // 2. Driver -> Pending (Unassign)
        else if (source.droppableId !== "PENDING" && source.droppableId !== "PICKUP" && destination.droppableId === "PENDING") {
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

        // 3. Move to PICKUP
        else if (destination.droppableId === "PICKUP") {
            // Remove from Source
            if (source.droppableId === "PENDING") {
                setPending(prev => prev.filter(i => i.id !== draggableId));
            } else if (source.droppableId === "PICKUP") {
                // Reorder in Pickup? Not implemented sort logic but safe to keep
                // Actually pickup reorder is handled in Case 5 logic if we generalize
            } else {
                setDrivers(prev => prev.map(d => {
                    if (d.id === source.droppableId) {
                        return { ...d, items: d.items.filter((i: BoardItem) => i.id !== draggableId) };
                    }
                    return d;
                }));
            }

            // Add to Pickup (Optimistic)
            if (source.droppableId !== "PICKUP") {
                setPickup(prev => [{ ...movedItem, status: "PENDING" }, ...prev]);

                toast.promise(switchToPickup(draggableId), {
                    loading: "Moviendo a Recogida...",
                    success: "Movido a Recogida en Local",
                    error: "Error al mover"
                });
            }
        }

        // 4. Pickup -> Pending ? (Not explicitly handled but let's allow it conceptually if needed, or block it)
        // Assuming Pickup -> Pending is Unassign logic basically
        else if (source.droppableId === "PICKUP" && destination.droppableId === "PENDING") {
            setPickup(prev => prev.filter(i => i.id !== draggableId));
            setPending(prev => sortItems([{ ...movedItem, status: "PENDING" }, ...prev]));
            // Logic for server action? Maybe unassign works if we treat it generic
            // But existing code didn't hold Pickup logic well in "Driver -> Pending" block as it checked source !== "PENDING"
            // Let's assume unassignDelivery handles status reset.
            toast.promise(unassignDelivery(draggableId, movedItem.type), {
                loading: "Removiendo de recogida...",
                success: "Movido a pendientes",
                error: "Error"
            });
        }


        // 5. Driver -> Driver (Reorder or Reassign) OR Pickup -> Driver
        else if (destination.droppableId !== "PENDING" && destination.droppableId !== "PICKUP") {
            // Handle Pickup -> Driver
            if (source.droppableId === "PICKUP") {
                setPickup(prev => prev.filter(i => i.id !== draggableId));
                setDrivers(prev => prev.map(d => {
                    if (d.id === destination.droppableId) {
                        const newItems = [...(d.items || []), { ...movedItem, status: "ON_ROUTE" }];
                        return { ...d, items: sortItems(newItems) };
                    }
                    return d;
                }));
                toast.promise(assignDelivery(draggableId, destination.droppableId, movedItem.type), {
                    loading: "Asignando conductor...",
                    success: "Asignado desde Recogida",
                    error: "Error"
                });
                return;
            }

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
            <div className="flex flex-col h-full">
                {/* Mobile Tabs Header */}
                <div className="md:hidden px-4 pb-2">
                    <Tabs value={mobileTab} onValueChange={setMobileTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-4">
                            <TabsTrigger value="PENDING">Pend.</TabsTrigger>
                            <TabsTrigger value="DRIVERS">Rutas</TabsTrigger>
                            <TabsTrigger value="PICKUP">Local</TabsTrigger>
                            <TabsTrigger value="COMPLETED">Listos</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex-1 overflow-y-auto md:overflow-visible no-scrollbar">
                    <div className="flex flex-col md:flex-row h-full md:gap-4 md:overflow-x-auto md:p-4 md:pb-20 px-4 md:px-0">

                        {/* 1. Pending Column */}
                        <div className={`min-w-full md:min-w-[320px] md:max-w-[320px] flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/60 transition-all ${mobileTab === 'PENDING' ? 'block' : 'hidden md:flex'}`}>
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

                        {/* 2. Drivers Columns */}
                        {drivers.map((driver) => (
                            <div
                                key={driver.id}
                                className={`min-w-full md:min-w-[320px] md:max-w-[320px] flex flex-col h-auto md:h-full bg-slate-50/50 rounded-2xl border border-slate-200/60 mb-4 md:mb-0 ${mobileTab === 'DRIVERS' ? 'block' : 'hidden md:flex'}`}
                            >
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
                                            className={`p-3 transition-colors ${snapshot.isDraggingOver ? "bg-blue-50/50" : ""} ${mobileTab === 'DRIVERS' ? 'min-h-[100px]' : 'flex-1 overflow-y-auto no-scrollbar'}`}
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

                        {/* 3. Pickup Column (Recogida en Local) */}
                        <div className={`min-w-full md:min-w-[320px] md:max-w-[320px] flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200/60 ${mobileTab === 'PICKUP' ? 'block' : 'hidden md:flex'}`}>
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

                        {/* 4. Completed Column (COMPLETADAS) */}
                        <div className={`min-w-full md:min-w-[320px] md:max-w-[320px] flex flex-col h-full bg-slate-50/50 rounded-2xl border border-slate-200/60 ${mobileTab === 'COMPLETED' ? 'block' : 'hidden md:flex'}`}>
                            <div className="p-4 border-b border-slate-200/50 bg-green-50/50 backdrop-blur-sm rounded-t-2xl sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="font-black text-slate-800 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        Completadas
                                    </h2>
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {completed?.length || 0}
                                    </span>
                                </div>
                                <div className="mt-1">
                                    <p className="text-xs font-bold text-green-600 uppercase tracking-wide">
                                        ¡Hoy llevamos {completed?.length || 0} entregas!
                                    </p>
                                </div>
                            </div>

                            <Droppable droppableId="COMPLETED" isDropDisabled={true}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 p-3 overflow-y-auto no-scrollbar transition-colors ${snapshot.isDraggingOver ? "bg-green-50/50" : ""
                                            }`}
                                    >
                                        {completed?.map((item, index) => (
                                            <div key={item.id} className="opacity-75 hover:opacity-100 transition-opacity">
                                                <DeliveryCard item={item} index={index} />
                                            </div>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                    </div>
                </div>
            </div>
        </DragDropContext>
    );
}
