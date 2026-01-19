"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createLogisticsTask } from "../actions";

export default function CreateTaskModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        address: "",
        moneyToCollect: "0",
        urgency: "MEDIUM"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await createLogisticsTask({
            title: formData.title,
            description: formData.description,
            address: formData.address,
            moneyToCollect: Number(formData.moneyToCollect),
            urgency: formData.urgency as any
        });

        if (result.success) {
            toast.success("Tarea creada correctamente");
            setOpen(false);
            setFormData({ title: "", description: "", address: "", moneyToCollect: "0", urgency: "MEDIUM" });
        } else {
            toast.error("Error al crear tarea");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-white text-black hover:bg-slate-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Tarea
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-900 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nueva Tarea Logística</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Título</label>
                        <Input
                            required
                            placeholder="Ej. Recoger paquete, Cobrar factura..."
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-blue-600"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Valor a Recaudar</label>
                        <Input
                            type="number"
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-blue-600"
                            value={formData.moneyToCollect}
                            onChange={(e) => setFormData({ ...formData, moneyToCollect: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Dirección / Ubicación</label>
                        <Input
                            placeholder="Dirección o enlace de Maps"
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-blue-600"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Notas</label>
                        <Textarea
                            placeholder="Detalles adicionales..."
                            className="bg-white border-slate-200 text-slate-900 focus-visible:ring-blue-600 min-h-[100px]"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Tarea"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
