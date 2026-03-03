"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Search, Filter, Calendar, Camera, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface HistoryItem {
    id: string;
    type: "SALE" | "TASK";
    title: string;
    method: "DELIVERY" | "PICKUP";
    responsible: string; // Driver or Operator
    completedAt: Date | null;
    onRouteAt: Date | null;
    createdAt: Date;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    evidenceUrl: string | null;
    notes?: string | null;
}

interface HistoryTableProps {
    initialData: HistoryItem[];
}

import { Bike, Store } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function HistoryTable({ initialData }: HistoryTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterResponsible, setFilterResponsible] = useState("ALL");
    const [filterType, setFilterType] = useState("ALL");
    const [selectedImage, setSelectedImage] = useState<{ url: string, title: string, date: Date | null } | null>(null);

    // Helper: Calculate Duration
    const getDuration = (start: Date, end: Date | null) => {
        if (!end) return "-";
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    // Filter Logic
    const filteredData = initialData.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.responsible.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesResponsible = filterResponsible === "ALL" || item.responsible === filterResponsible;
        const matchesType = filterType === "ALL" || item.type === filterType;

        return matchesSearch && matchesResponsible && matchesType;
    });

    // Unique Responsibles for Filter
    const responsibles = Array.from(new Set(initialData.map(i => i.responsible)));

    const urgencyConfig = {
        LOW: "bg-header text-primary0",
        MEDIUM: "bg-blue-50 text-blue-700",
        HIGH: "bg-orange-50 text-orange-700",
        CRITICAL: "bg-red-50 text-red-700"
    };

    return (
        <div className="bg-background rounded-xl shadow-sm border border-border transition-colors">
            {/* Toolbar */}
            <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <Input
                        placeholder="Buscar por ID o Responsable..."
                        className="pl-9 dark:bg-card/5 border-border  dark:placeholder:text-primary0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <select
                        className="text-sm bg-header border border-border  rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={filterResponsible}
                        onChange={(e) => setFilterResponsible(e.target.value)}
                    >
                        <option value="ALL">Todos los Responsables</option>
                        {responsibles.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <div className="flex bg-card-hover p-1 rounded-lg transition-colors">
                        <button
                            onClick={() => setFilterType("ALL")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === "ALL" ? "bg-card/10 shadow text-primary " : "text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white"}`}
                        >
                            Todo
                        </button>
                        <button
                            onClick={() => setFilterType("SALE")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === "SALE" ? "bg-card/10 shadow text-primary " : "text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white"}`}
                        >
                            Ventas
                        </button>
                        <button
                            onClick={() => setFilterType("TASK")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === "TASK" ? "bg-card/10 shadow text-primary " : "text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white"}`}
                        >
                            Tareas
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-header transition-colors">
                        <TableRow>
                            <TableHead className="w-[50px] text-center text-primary  font-bold">Tipo</TableHead>
                            <TableHead className="w-[140px] text-primary  font-bold">ID / Título</TableHead>
                            <TableHead className="text-primary  font-bold">Responsable / Domiciliario</TableHead>
                            <TableHead className="text-primary  font-bold">Observación</TableHead>
                            <TableHead className="text-primary  font-bold">Línea de Tiempo</TableHead>
                            <TableHead className="text-primary  font-bold">Duración</TableHead>
                            <TableHead className="text-right text-primary  font-bold">Evidencia</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-muted bg-card dark:bg-transparent">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id} className="hover:bg-hover/50 /5 transition-colors border-border">
                                    <TableCell className="text-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${item.method === "PICKUP" ? "bg-emerald-100 dark:bg-brand text-inverse/20 text-success" : "bg-blue-100 dark:bg-blue-500/20 text-transfer"}`} title={item.method === "PICKUP" ? "Recogida en Oficina" : "Domicilio"}>
                                            {item.method === "PICKUP" ? <Store className="w-4 h-4" /> : <Bike className="w-4 h-4" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-primary ">{item.title}</span>
                                            <span className="text-[10px] text-muted font-bold font-mono">{item.type === "SALE" ? "VENTA" : "TAREA"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-primary ">{item.responsible}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.notes ? (
                                            <TooltipProvider delayDuration={0}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-xs text-muted truncate max-w-[150px] block cursor-pointer border-b border-dotted border-border dark:border-border/30">
                                                            {item.notes}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="max-w-xs">{item.notes}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <span className="text-muted text-xs italic">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-muted w-8">FIN</span>
                                                <span className="text-xs text-primary">
                                                    {item.completedAt ? format(new Date(item.completedAt), "d MMM, h:mm a", { locale: es }) : "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono font-normal dark:bg-card/5  /20">
                                            {getDuration(item.createdAt, item.completedAt)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.evidenceUrl ? (
                                            <div
                                                onClick={() => setSelectedImage({ url: item.evidenceUrl!, title: item.title, date: item.completedAt })}
                                                className="inline-flex items-center gap-2 cursor-pointer group hover:bg-hover /5 p-1.5 rounded-lg border border-transparent hover:border-border dark:hover:border-border/10 transition-all"
                                            >
                                                <div className="w-8 h-8 rounded bg-slate-200 dark:bg-card/10 overflow-hidden relative border border-border">
                                                    <img src={item.evidenceUrl} alt="Evidencia" className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-[10px] text-transfer font-medium group-hover:underline">Ver</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted text-xs italic">Sin foto</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Evidence Modal */}
                <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                    <DialogContent className="sm:max-w-xl bg-background p-0 overflow-hidden border-0">
                        <div className="relative aspect-video bg-black flex items-center justify-center group">
                            {selectedImage && (
                                <img
                                    src={selectedImage.url}
                                    alt="Evidencia Full"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.classList.add('bg-slate-800');
                                        const fallback = document.createElement('div');
                                        fallback.className = 'text-primary0 text-sm p-4';
                                        fallback.innerText = 'Error al cargar imagen';
                                        e.currentTarget.parentElement?.appendChild(fallback);
                                    }}
                                />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                                <h3 className="font-bold text-lg">{selectedImage?.title}</h3>
                                <p className="text-sm opacity-90">
                                    Entregado el: {selectedImage?.date ? format(new Date(selectedImage.date), "PPP p", { locale: es }) : "N/A"}
                                </p>
                            </div>
                            <Button
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1 w-8 h-8 text-white border-0"
                                onClick={() => setSelectedImage(null)}
                            >
                                ✕
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div >
        </div >
    );
}
