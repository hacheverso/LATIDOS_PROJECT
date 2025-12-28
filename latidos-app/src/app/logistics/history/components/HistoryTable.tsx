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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface HistoryItem {
    id: string;
    type: "SALE" | "TASK";
    title: string;
    driver: string;
    completedAt: Date | null;
    onRouteAt: Date | null;
    createdAt: Date;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    evidenceUrl: string | null;
}

interface HistoryTableProps {
    initialData: HistoryItem[];
}

export default function HistoryTable({ initialData }: HistoryTableProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDriver, setFilterDriver] = useState("ALL");
    const [filterType, setFilterType] = useState("ALL");

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
            item.driver.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDriver = filterDriver === "ALL" || item.driver === filterDriver;
        const matchesType = filterType === "ALL" || item.type === filterType;

        return matchesSearch && matchesDriver && matchesType;
    });

    // Unique Drivers for Filter
    const drivers = Array.from(new Set(initialData.map(i => i.driver)));

    const urgencyConfig = {
        LOW: "bg-slate-100 text-slate-500",
        MEDIUM: "bg-blue-50 text-blue-700",
        HIGH: "bg-orange-50 text-orange-700",
        CRITICAL: "bg-red-50 text-red-700"
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por ID o Domiciliario..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <select
                        className="text-sm bg-slate-50 border border-slate-200 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={filterDriver}
                        onChange={(e) => setFilterDriver(e.target.value)}
                    >
                        <option value="ALL">Todos los Domiciliarios</option>
                        {drivers.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setFilterType("ALL")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === "ALL" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Todo
                        </button>
                        <button
                            onClick={() => setFilterType("SALE")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === "SALE" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Ventas
                        </button>
                        <button
                            onClick={() => setFilterType("TASK")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterType === "TASK" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Tareas
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-[100px]">ID / Título</TableHead>
                            <TableHead>Domiciliario</TableHead>
                            <TableHead>Línea de Tiempo</TableHead>
                            <TableHead>Duración</TableHead>
                            <TableHead>Prioridad</TableHead>
                            <TableHead className="text-right">Evidencia</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-sm text-slate-700">{item.title}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{item.type === "SALE" ? "VENTA" : "TAREA"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {item.driver.charAt(0)}
                                            </div>
                                            <span className="text-sm text-slate-600">{item.driver}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 w-8">INICIO</span>
                                                <span className="text-xs text-slate-900">
                                                    {format(new Date(item.createdAt), "d MMM, h:mm a", { locale: es })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 w-8">FIN</span>
                                                <span className="text-xs text-slate-900">
                                                    {item.completedAt ? format(new Date(item.completedAt), "d MMM, h:mm a", { locale: es }) : "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono font-normal">
                                            {getDuration(item.createdAt, item.completedAt)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`border-0 font-bold ${urgencyConfig[item.urgency]}`}>
                                            {item.urgency === "CRITICAL" ? "Crítica" : item.urgency === "HIGH" ? "Alta" : item.urgency === "LOW" ? "Baja" : "Normal"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-slate-100">
                                                    <Camera className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-3" align="end">
                                                <h4 className="font-bold text-xs text-slate-700 mb-2 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> Soporte de Entrega
                                                </h4>
                                                {item.evidenceUrl ? (
                                                    <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center text-xs text-slate-400">
                                                        {/* Placeholder for real image */}
                                                        Imagen {item.evidenceUrl}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded border border-dashed">
                                                        Sin evidencia adjunta
                                                    </div>
                                                )}
                                                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                                                    Entregado el: {item.completedAt ? format(new Date(item.completedAt), "PPP p", { locale: es }) : "-"}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
