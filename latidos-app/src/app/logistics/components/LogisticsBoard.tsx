"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { assignDelivery, unassignDelivery, switchToPickup, updateRouteOrder, BoardItem } from "../actions";
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
    // Pickup is now merged into pending, so we ignore separate pickup state
    const [completed, setCompleted] = useState(initialData.completed);
    const [mobileTab, setMobileTab] = useState("PENDING");

    // Sync state with props when router.refresh() updates initialData
    useEffect(() => {
        setDrivers(initialData.drivers);
        setPending(initialData.pending);
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
        const getList = (id: string): BoardItem[] => {
            if (id === "PENDING") return pending;
            if (id === "COMPLETED") return completed; // Should be disabled but for safety
            return (drivers.find(d => d.id === id)?.items || []) as BoardItem[];
        };

        const sourceList = getList(source.droppableId);
        const destList = getList(destination.droppableId);

        // Optimistic Item
        const movedItem = sourceList.find((i: BoardItem) => i.id === draggableId);
        if (!movedItem) return;

        // Case 1: Reorder within same list (Manual Sort)
        if (source.droppableId === destination.droppableId) {
            const reordered = Array.from(sourceList);
            reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, movedItem);

            // Update State
            if (source.droppableId === "PENDING") {
                setPending(reordered);
                // Save Order for Pending too if desired
                updateRouteOrder(reordered.map(i => ({ id: i.id, type: i.type })));
            } else {
                setDrivers(prev => prev.map(d => {
                    if (d.id === source.droppableId) {
                        return { ...d, items: reordered };
                    }
                    return d;
                }));
                // Save Order for Driver
                updateRouteOrder(reordered.map(i => ({ id: i.id, type: i.type })));
            }
            return;
        }

        // Case 2: Move between lists (Assign/Unassign/Reassign)

        // Remove from Source
        const newSourceList = Array.from(sourceList);
        newSourceList.splice(source.index, 1);

        // Add to Destination (at specific index!)
        const newDestList = Array.from(destList);
        const newItemWithStatus = {
            ...movedItem,
            status: destination.droppableId === "PENDING" ? "PENDING" : "ON_ROUTE"
        };
        newDestList.splice(destination.index, 0, newItemWithStatus);

        // Update States
        if (source.droppableId === "PENDING") setPending(newSourceList);
        else {
            setDrivers(prev => prev.map(d => {
                if (d.id === source.droppableId) return { ...d, items: newSourceList };
                return d;
            }));
        }

        if (destination.droppableId === "PENDING") setPending(newDestList);
        else {
            setDrivers(prev => prev.map(d => {
                if (d.id === destination.droppableId) return { ...d, items: newDestList };
                return d;
            }));
        }

        // Server Actions
        // 1. Assign/Unassign
        if (source.droppableId === "PENDING" && destination.droppableId !== "PENDING") {
            toast.promise(assignDelivery(draggableId, destination.droppableId, movedItem.type), {
                loading: "Asignando ruta...",
                success: "Asignado correctamente",
                error: (err: any) => `Error al asignar: ${err.message}`
            });
            // Update Order of Destination (Driver)
            updateRouteOrder(newDestList.map(i => ({ id: i.id, type: i.type })));
        }
        else if (source.droppableId !== "PENDING" && destination.droppableId === "PENDING") {
            toast.promise(unassignDelivery(draggableId, movedItem.type), {
                loading: "Removiendo ruta...",
                success: "Movido a pendientes",
                error: "Error al desasignar"
            });
            // Update Pending Order (Optional)
            updateRouteOrder(newDestList.map(i => ({ id: i.id, type: i.type })));
        }
        else if (destination.droppableId !== "PENDING") {
            // Reassign to another driver
            toast.promise(assignDelivery(draggableId, destination.droppableId, movedItem.type), {
                loading: "Reasignando...",
                success: "Reasignado correctamente",
                error: "Error al reasignar"
            });
            // Update Order Destination
            updateRouteOrder(newDestList.map(i => ({ id: i.id, type: i.type })));
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-col h-full">
                {/* Mobile Tabs Header */}
                <div className="md:hidden px-4 pb-2">
                    <Tabs value={mobileTab} onValueChange={setMobileTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-4">
                            <TabsTrigger value="PENDING">Pend. / Local</TabsTrigger>
                            <TabsTrigger value="DRIVERS">Rutas</TabsTrigger>
                            {/* <TabsTrigger value="PICKUP">Local</TabsTrigger> Removed */}
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
                                        <Package className="w-5 h-5 text-indigo-600" />
                                        Pendientes / Recogida
                                    </h2>
                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {pending.length}
                                    </span>
                                </div>
                            </div>

                            <Droppable droppableId="PENDING">
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 p-3 overflow-y-auto no-scrollbar transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/50" : ""
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

                        {/* 3. Pickup Column Removed */}
                        {/* Was here, but now merged with Pending */}

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
