"use client";

import { useEffect, useState } from "react";
import { Plus, Shield, User, Key, MoreHorizontal, ToggleLeft, ToggleRight, Trash2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getUsers, createUser, togglePermission, resetUserPin, deleteUser } from "./actions";
import { toast } from "sonner";
import { OperatorManagement } from "./components/OperatorManagement";

export default function TeamPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        const data = await getUsers();
        setUsers(data);
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Equipo</h1>
                    <p className="text-slate-500">Administra usuarios, roles y permisos de seguridad.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Nuevo Usuario
                </button>
            </div>

            <div className="grid gap-4">
                {users.map((user) => (
                    <div key={user.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-start md:items-center">
                        {/* Avatar & Info */}
                        <div className="flex items-center gap-4 min-w-[250px]">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                                {user.name.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="font-bold text-slate-900">{user.name}</div>
                                    {user.status === 'PENDING' && (
                                        <Badge variant="outline" className="text-[10px] border-yellow-200 bg-yellow-50 text-yellow-700">
                                            Pendiente
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-sm text-slate-500">{user.email}</div>
                                <div className="mt-1 flex gap-2">
                                    <Badge variant={(user.role === 'ADMIN') ? 'default' : 'secondary'} className="text-[10px]">
                                        {user.role}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Permissions Grid - Disabled if pending */}
                        <div className={`flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 w-full ${user.status === 'PENDING' ? 'opacity-50 pointer-events-none' : ''}`}>
                            <PermissionToggle
                                label="Editar Ventas"
                                active={user.permissions?.canEditSales}
                                onClick={() => togglePermission(user.id, "canEditSales", user.permissions?.canEditSales).then(loadUsers)}
                            />
                            <PermissionToggle
                                label="Ver Costos"
                                active={user.permissions?.canViewCosts}
                                onClick={() => togglePermission(user.id, "canViewCosts", user.permissions?.canViewCosts).then(loadUsers)}
                            />
                            <PermissionToggle
                                label="Gestionar Inventario"
                                active={user.permissions?.canManageInventory}
                                onClick={() => togglePermission(user.id, "canManageInventory", user.permissions?.canManageInventory).then(loadUsers)}
                            />
                            {/* Add more perms here */}
                        </div>


                        {/* Actions */}
                        <div className="flex items-center gap-2 border-l border-slate-100 pl-6 h-full">
                            {user.status === 'PENDING' ? (
                                <button
                                    onClick={() => {
                                        if (confirm("¿Reenviar invitación a " + user.email + "?")) {
                                            createUser({ name: user.name, email: user.email, role: user.role })
                                                .then(() => alert("Invitación reenviada"));
                                        }
                                    }}
                                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 tooltip"
                                    title="Reenviar Invitación"
                                >
                                    <Mail className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        const newPin = prompt("Asignar Nuevo PIN de Seguridad:");
                                        if (newPin && newPin.length >= 4) {
                                            resetUserPin(user.id, newPin).then(() => alert("PIN Actualizado"));
                                        }
                                    }}
                                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 tooltip"
                                    title="Cambiar PIN"
                                >
                                    <Key className="w-5 h-5" />
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    if (confirm("¿Estás seguro de ELIMINAR a este usuario? Esta acción no se puede deshacer.")) {
                                        deleteUser(user.id)
                                            .then(() => loadUsers())
                                            .catch((err: any) => alert(err.message));
                                    }
                                }}
                                className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 tooltip transition-colors"
                                title="Eliminar Usuario"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Operator Management Section (Dual Identity) */}
            <div className="pt-8 border-t border-slate-200">
                <OperatorManagement />
            </div>

            {/* Simple Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-lg font-black text-slate-900 mb-4">Nuevo Miembro</h2>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            try {
                                const result = await createUser({
                                    name: formData.get("name") as string,
                                    email: formData.get("email") as string,
                                    role: formData.get("role") as string,
                                    pin: formData.get("pin") as string,
                                });

                                setIsCreateModalOpen(false);
                                loadUsers();
                                toast.success("Usuario creado exitosamente");

                                if (result.invitationLink) {
                                    setTimeout(() => {
                                        const msg = result.pin
                                            ? `✅ Usuario Creado.\n\nPIN DE ACCESO: ${result.pin}\n\nLink de Invitación (Opcional):`
                                            : "✅ Usuario Creado. Copia y envía este link de invitación:";
                                        prompt(msg, result.invitationLink || "");
                                    }, 500);
                                }
                            } catch (e: any) {
                                toast.error(e.message || "Error al crear usuario");
                            }
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">Nombre</label>
                                <input
                                    name="name"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 font-bold transition-all"
                                    placeholder="Ej: Hugo Giraldo"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">Email</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 font-bold transition-all"
                                    placeholder="hugo@latidos.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">Rol</label>
                                <select
                                    name="role"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:border-slate-900 focus:ring-0 font-bold transition-all bg-white"
                                >
                                    <option value="GESTION_OPERATIVA">Gestión Operativa (Oficina)</option>
                                    <option value="LOGISTICA">Logística / Entregas</option>
                                    <option value="ADMIN">Administrador (Control Total)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-900 ml-1">PIN de Acceso Inmediato (Opcional)</label>
                                <input
                                    name="pin"
                                    type="text" // Visible text for admin to see what they are assigning
                                    maxLength={4}
                                    pattern="\d{4}"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-0 font-bold transition-all"
                                    placeholder="Generar 4 dígitos (Ej: 1234)"
                                />
                                <p className="text-[10px] text-slate-500 ml-1">Si se deja vacío, se generará uno aleatorio.</p>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Crear Miembro</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function PermissionToggle({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'}`}
        >
            {active ? <ToggleRight className="w-6 h-6 mb-1" /> : <ToggleLeft className="w-6 h-6 mb-1" />}
            <span className="text-[10px] uppercase font-black tracking-wide text-center">{label}</span>
        </button>
    )
}
