"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Edit2, Save, X, Layers, Plus } from "lucide-react";
import Link from "next/link";
import { getCategoriesWithCount, updateCategory, ensureCategories, createCategory } from "../actions";

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [migrationStats, setMigrationStats] = useState<{ created: number, total: number } | null>(null);

    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getCategoriesWithCount();
            setCategories(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleMigrate = async () => {
        if (!confirm("Esto analizará todos los productos y creará categorías faltantes basándose en el campo de texto antiguo. ¿Continuar?")) return;
        setLoading(true);
        try {
            const stats = await ensureCategories();
            setMigrationStats(stats);
            await loadData();
        } catch (e) {
            alert("Error en migración: " + String(e));
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (cat: any) => {
        setEditingId(cat.id);
        setEditName(cat.name);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
    };

    const saveEdit = async (id: string) => {
        try {
            await updateCategory(id, editName);
            setEditingId(null);
            loadData();
        } catch (e) {
            alert("Error al actualizar: " + String(e));
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        try {
            await createCategory(newName);
            setNewName("");
            setIsCreating(false);
            loadData();
        } catch (e) {
            alert(String(e));
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Gestión de Categorías</h1>
                        <p className="text-slate-500 font-medium">Administra la taxonomía de tus productos</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Categoría
                    </button>
                    <button
                        onClick={handleMigrate}
                        className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <Layers className="w-4 h-4 text-slate-400" />
                        Sincronizar / Migrar
                    </button>
                </div>
            </div>

            {/* Stats Alert */}
            {migrationStats && (
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-3 text-green-800 animate-in fade-in slide-in-from-top-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-sm font-medium">
                        Migración completada: <strong>{migrationStats.created}</strong> nuevas categorías creadas de <strong>{migrationStats.total}</strong> tipos encontrados.
                    </p>
                </div>
            )}

            {/* Creation Form */}
            {isCreating && (
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                    <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value.toUpperCase())}
                        placeholder="NOMBRE DE LA NUEVA CATEGORÍA..."
                        className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-2 font-bold text-slate-800 placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleCreate} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setIsCreating(false)} className="p-2 bg-white text-slate-400 hover:text-red-500 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Nombre de Categoría</th>
                            <th className="px-6 py-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Productos</th>
                            <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading && categories.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium animate-pulse">
                                    Cargando taxonomía...
                                </td>
                            </tr>
                        ) : categories.map((cat) => (
                            <tr key={cat.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    {editingId === cat.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value.toUpperCase())}
                                                className="w-full bg-white border-2 border-blue-100 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-xs border border-indigo-100">
                                                {cat.name.substring(0, 2)}
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                        {cat._count.products} ITEMS
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editingId === cat.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => saveEdit(cat.id)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Guardar"
                                            >
                                                <Save className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Cancelar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => startEdit(cat)}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Editar Nombre"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && categories.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center">
                                    <p className="text-slate-400 font-medium mb-2">No hay categorías definidas.</p>
                                    <button onClick={handleMigrate} className="text-blue-600 text-sm font-bold hover:underline">
                                        Ejecutar Migración Inicial
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
