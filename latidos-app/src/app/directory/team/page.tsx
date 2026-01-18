"use client";

import { useEffect, useState } from "react";
import { Plus, Shield, User, Key, MoreHorizontal, ToggleLeft, ToggleRight, Trash2, Mail, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getUsers, createUser, togglePermission, resetUserPin, deleteUser, getCurrentUserRole } from "./actions";
import { toast } from "sonner";
import { OperatorManagement } from "./components/OperatorManagement";

export default function TeamPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const [usersData, role] = await Promise.all([
            getUsers(),
            getCurrentUserRole()
        ]);
        setUsers(usersData);
        setUserRole(role);
    }

    // Group Users
    const admins = users.filter(u => u.role === 'ADMIN');
    const operatives = users.filter(u => u.role === 'GESTION_OPERATIVA');
    const logistics = users.filter(u => u.role === 'LOGISTICA');

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Equipo</h1>
                    <p className="text-slate-500">Administra usuarios, roles y permisos de seguridad.</p>
                </div>
                {userRole === 'ADMIN' && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Usuario
                    </button>
                )}
            </div>

            {/* SECTIONS */}
            <div className="space-y-12">

                {/* 1. ADMINS */}
                {admins.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Administradores</h2>
                        <div className="grid gap-4">
                            {admins.map(user => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    onUpdate={loadData}
                                    userRole={userRole}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. OPERATIVES + LINKED OPERATORS */}
                {(operatives.length > 0) && (
                    <section className="space-y-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Gestión Operativa (Oficina)</h2>
                            <div className="grid gap-4">
                                {operatives.map(user => (
                                    <UserCard
                                        key={user.id}
                                        user={user}
                                        onUpdate={loadData}
                                        userRole={userRole}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* CONNECTED OPERATORS SECTION */}
                        <div className="mt-4 pt-2">
                            <OperatorManagement userRole={userRole} />
                        </div>
                    </section>
                )}

                {/* 3. LOGISTICS */}
                {logistics.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Logística y Entregas</h2>
                        <div className="grid gap-4">
                            {logistics.map(user => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    onUpdate={loadData}
                                    userRole={userRole}
                                />
                            ))}
                        </div>
                    </section>
                )}
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
                                });

                                setIsCreateModalOpen(false);
                                loadData();
                                toast.success("Usuario creado exitosamente");

                                if (result.invitationLink) {
                                    setTimeout(() => {
                                        prompt("✅ Usuario Creado. Copia y envía este link de invitación:", result.invitationLink || "");
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



function UserCard({ user, onUpdate, userRole }: { user: any, onUpdate: () => void, userRole: string | null }) {
    const [showPermissions, setShowPermissions] = useState(false);

    return (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-md">
                {/* Avatar & Info */}
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 font-black text-xl border border-slate-100">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="font-bold text-slate-900 text-lg">{user.name}</div>
                            {user.status === 'PENDING' && (
                                <Badge variant="outline" className="text-[10px] border-yellow-200 bg-yellow-50 text-yellow-700">
                                    Pendiente
                                </Badge>
                            )}
                        </div>
                        <div className="text-sm text-slate-500 font-medium">{user.email}</div>
                        <div className="mt-2 flex gap-2">
                            <Badge variant={(user.role === 'ADMIN') ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.5">
                                {user.role === 'GESTION_OPERATIVA' ? 'GESTIÓN OPERATIVA' : user.role}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Actions - ADMIN ONLY */}
                {userRole === 'ADMIN' && (
                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        {/* Permissions Button */}
                        <button
                            onClick={() => setShowPermissions(true)}
                            disabled={user.status === 'PENDING'}
                            className="p-2.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-all tooltip flex items-center gap-2 group"
                            title="Configurar Permisos"
                        >
                            <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>

                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                        {user.status === 'PENDING' ? (
                            <button
                                onClick={() => {
                                    if (confirm("¿Reenviar invitación a " + user.email + "?")) {
                                        createUser({ name: user.name, email: user.email, role: user.role })
                                            .then(() => alert("Invitación reenviada"));
                                    }
                                }}
                                className="p-2.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all tooltip"
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
                                className="p-2.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-all tooltip"
                                title="Cambiar PIN"
                            >
                                <Key className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={() => {
                                if (confirm("¿Estás seguro de ELIMINAR a este usuario? Esta acción no se puede deshacer.")) {
                                    deleteUser(user.id)
                                        .then(() => onUpdate())
                                        .catch((err: any) => alert(err.message));
                                }
                            }}
                            className="p-2.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white transition-all tooltip"
                            title="Eliminar Usuario"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Simple Permissions Modal */}
            {showPermissions && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Permisos de Acceso</h3>
                                <p className="text-sm text-slate-500 font-medium">Configura qué puede hacer {user.name.split(' ')[0]}</p>
                            </div>
                            <button onClick={() => setShowPermissions(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <PermissionRow
                                label="Editar Ventas"
                                description="Puede modificar precios y descuentos"
                                active={user.permissions?.canEditSales}
                                onClick={() => togglePermission(user.id, "canEditSales", user.permissions?.canEditSales).then(onUpdate)}
                            />
                            <PermissionRow
                                label="Ver Costos"
                                description="Puede ver costos de productos y utilidad"
                                active={user.permissions?.canViewCosts}
                                onClick={() => togglePermission(user.id, "canViewCosts", user.permissions?.canViewCosts).then(onUpdate)}
                            />
                            <PermissionRow
                                label="Gestionar Inventario"
                                description="Puede crear y editar productos"
                                active={user.permissions?.canManageInventory}
                                onClick={() => togglePermission(user.id, "canManageInventory", user.permissions?.canManageInventory).then(onUpdate)}
                            />
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <button onClick={() => setShowPermissions(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function PermissionRow({ label, description, active, onClick }: { label: string, description: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group text-left ${active ? 'bg-slate-900 border-slate-900 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
            <div>
                <div className={`font-bold text-sm ${active ? 'text-white' : 'text-slate-900'}`}>{label}</div>
                <div className={`text-xs ${active ? 'text-slate-400' : 'text-slate-500'}`}>{description}</div>
            </div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${active ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
        </button>
    )
}

