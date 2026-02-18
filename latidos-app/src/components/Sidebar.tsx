"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Box,
    ClipboardList,
    ShoppingCart,
    Truck,
    DollarSign,
    Menu,
    ChevronDown,
    Package,
    Users,
    LucideIcon,
    Settings,
    FileText,
    Wallet,
    LogOut,
    Key
} from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { handleSignOut } from "@/app/lib/actions"; // Removed server action
import { useSession, signOut } from "next-auth/react";

interface MenuItem {
    name: string;
    href?: string;
    icon: LucideIcon;
    subItems?: { name: string; href: string; icon?: LucideIcon }[];
}

const menuItems: MenuItem[] = [
    {
        name: "Equipo",
        icon: Users,
        subItems: [
            { name: "Miembros", href: "/directory/team", icon: Users },
            { name: "Rendimiento", href: "/directory/team/performance", icon: LayoutDashboard }, // Dashboard placeholder
        ]
    },
    {
        name: "Inventario",
        icon: Box,
        subItems: [
            { name: "Panel de Control", href: "/inventory", icon: LayoutDashboard },
            { name: "Productos", href: "/inventory/catalog", icon: Box },
            { name: "Ingresos", href: "/inventory/purchases", icon: ClipboardList },
        ]
    },
    {
        name: "Ventas",
        icon: ShoppingCart,
        subItems: [
            { name: "Punto de Venta", href: "/sales/new", icon: ShoppingCart },
            { name: "Facturas", href: "/sales", icon: FileText },
            { name: "Cobranzas", href: "/sales/collections", icon: Wallet },
        ]
    },
    {
        name: "Logística",
        icon: Truck,
        subItems: [
            { name: "Tablero", href: "/logistics", icon: LayoutDashboard },
            { name: "Historial", href: "/logistics/history", icon: ClipboardList },
        ]
    },
    {
        name: "Directorio",
        icon: ClipboardList,
        subItems: [
            { name: "Clientes", href: "/directory/customers", icon: Users },
            { name: "Proveedores", href: "/directory/providers", icon: Truck },
        ]
    },
    {
        name: "Finanzas",
        icon: DollarSign,
        subItems: [
            { name: "Resumen", href: "/finance", icon: LayoutDashboard },
            { name: "Cuadre de Cuentas", href: "/finance/reconciliation", icon: ClipboardList },
            { name: "Comisiones", href: "/finance/commissions", icon: Users },
        ]
    },
    { name: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar({ mobileMode = false }: { mobileMode?: boolean }) {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    // Initialize open sections based on current path logic if needed, or default open essential ones
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        "Equipo": true,
        "Inventario": true,
        "Directorio": true,
        "Ventas": true,
        "Logística": true
    });

    const toggleSection = (name: string) => {
        if (isCollapsed) setIsCollapsed(false);
        setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // Determine Home URL based on Role
    // @ts-ignore
    const role = session?.user?.role;
    const homeHref = role === 'LOGISTICA' ? '/logistics' : '/dashboard';

    return (
        <div
            className={cn(
                "flex flex-col h-screen transition-all duration-300 bg-white border-r border-slate-100 relative z-50",
                isCollapsed ? "w-24" : "w-80"
            )}
        >
            {/* Header / Logo */}
            <div className="flex items-center justify-between p-8">
                {!isCollapsed && (
                    <Link href={homeHref} className="flex items-center gap-3 animate-in fade-in duration-300 group">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:scale-110 transition-transform">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 group-hover:text-blue-600 transition-colors">
                            LATIDOS
                        </span>
                    </Link>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors",
                        isCollapsed && "mx-auto"
                    )}
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-6 overflow-y-auto scrollbar-hide py-4">
                <div className="flex flex-col gap-1">
                    {menuItems.filter(item => {
                        // @ts-ignore
                        const role = session?.user?.role;

                        // ADMIN sees everything
                        if (role === 'ADMIN') return true;

                        // LOGISTICA only sees Logistics (redundant if redirected, but safe)
                        if (role === 'LOGISTICA') {
                            return item.name === 'Logística';
                        }

                        // GESTION_OPERATIVA (Office)
                        if (role === 'GESTION_OPERATIVA') {
                            // @ts-ignore
                            const perms = session?.user?.permissions || {};
                            // Hide Finance if not explicitly allowed
                            if (item.name === 'Finanzas' && !perms.canViewFinance) return false;

                            if (item.name === 'Configuración') return false;
                            if (item.name === 'Equipo') return false;
                        }

                        return true;
                    }).map((item) => {
                        const isOpen = openSections[item.name];
                        const Icon = item.icon;
                        const isMainActive = item.href ? pathname.startsWith(item.href) : false; // Simple check

                        // Handle Submenu Items (Accordion)
                        if (item.subItems) {
                            // Check if any child is active to highlight parent potentially, or just manage via open state
                            const isChildActive = item.subItems.some(sub => pathname.startsWith(sub.href));

                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => toggleSection(item.name)}
                                        className={cn(
                                            "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                                            "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                            isCollapsed && "justify-center px-0"
                                        )}
                                    >
                                        <Icon size={20} className={cn("flex-shrink-0 transition-colors", isChildActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-900")} />

                                        {!isCollapsed && (
                                            <>
                                                <span className="font-bold text-sm tracking-wide uppercase flex-1 text-left">
                                                    {item.name}
                                                </span>
                                                <ChevronDown
                                                    size={16}
                                                    className={cn(
                                                        "transition-transform duration-300 text-slate-400",
                                                        isOpen ? "rotate-180" : ""
                                                    )}
                                                />
                                            </>
                                        )}
                                    </button>

                                    {/* Submenu */}
                                    {!isCollapsed && isOpen && (
                                        <div className="relative ml-9 space-y-1 py-1">
                                            {/* Vertical connection line */}
                                            <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-200" />

                                            {item.subItems.map((sub) => {
                                                const isSubActive = pathname === sub.href;
                                                const SubIcon = sub.icon;
                                                return (
                                                    <Link
                                                        key={sub.href}
                                                        href={sub.href}
                                                        className={cn(
                                                            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium relative overflow-hidden group/item pl-6",
                                                            isSubActive
                                                                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/30 translate-x-1"
                                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80"
                                                        )}
                                                    >
                                                        {isSubActive && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                                                        )}
                                                        {SubIcon && (
                                                            <SubIcon
                                                                size={16}
                                                                className={cn(
                                                                    "opacity-70 group-hover/item:opacity-100 transition-opacity",
                                                                    isSubActive ? "text-emerald-300" : "text-slate-400"
                                                                )}
                                                            />
                                                        )}
                                                        <span className={cn(isSubActive ? "font-bold" : "")}>{sub.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // Handle Single Items
                        return (
                            <Link
                                key={item.name}
                                href={item.href!}
                                className={cn(
                                    "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isMainActive
                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                    isCollapsed && "justify-center px-0"
                                )}
                            >
                                <Icon size={20} className={cn("flex-shrink-0", isMainActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "text-slate-400 group-hover:text-slate-900")} />
                                {!isCollapsed && (
                                    <span className="font-bold text-sm tracking-wide uppercase">
                                        {item.name}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Mobile: User Profile at Bottom of Menu if needed, or keeping it at top? 
                User requested "En el menú lateral... nombre de usuario visible".
                The current Sidebar puts it at the bottom. 
                Let's adding a specific Mobile Header inside the Sidebar for clarity.
            */}
            {
                mobileMode && session?.user && (
                    <div className="md:hidden px-4 py-4 bg-slate-50 border-t border-slate-100 mt-auto">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                                {session.user.name ? session.user.name.charAt(0).toUpperCase() : <Users className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900">{session.user.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{/* @ts-ignore */}{session.user.role || "Miembro"}</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 relative z-50">
                {status === "loading" ? (
                    <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />
                ) : session?.user ? (
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className={cn("flex items-center gap-3 w-full outline-none hover:bg-slate-100 p-2 rounded-xl transition-colors text-left relative", isCollapsed && "justify-center")}>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-md ring-2 ring-white overflow-hidden flex-shrink-0">
                                    {/* Initial or Icon */}
                                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : <Users className="w-5 h-5" />}
                                </div>
                                {!isCollapsed && (
                                    <div className="min-w-0 flex-1 ml-3">
                                        <p className="text-sm font-black text-slate-900 truncate">{session.user.name || "Usuario"}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {/* @ts-ignore */}
                                            {session.user.role || "Miembro"}
                                        </p>
                                    </div>
                                )}
                                {!isCollapsed && <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-64 p-2 rounded-2xl border border-white/20 shadow-2xl ml-4 mb-2 backdrop-blur-md bg-white/80 ring-1 ring-black/5 z-50"
                            side="right"
                            align="end"
                        >
                            {/* ... Content ... */}
                            <div className="space-y-1">
                                <div className="px-3 py-3 border-b border-slate-100/50 mb-1">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Cuenta Activa</p>
                                    <p className="text-sm font-bold text-slate-900 truncate">{session.user.email}</p>
                                </div>
                                <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 rounded-xl transition-colors">
                                    <Users className="w-4 h-4" /> Mi Perfil
                                </Link>
                                <button onClick={() => alert("Cambio de PIN en desarrollo")} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 rounded-xl transition-colors">
                                    <Key className="w-4 h-4" /> Cambiar PIN
                                </button>
                                <div className="h-px bg-slate-100/50 my-1" />
                                <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50/50 rounded-xl transition-colors">
                                    <LogOut className="w-4 h-4" /> Cerrar Sesión
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                ) : (
                    <Link
                        href="/login"
                        className={cn(
                            "flex items-center gap-3 w-full p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 font-bold",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <LogOut className="w-5 h-5 rotate-180" />
                        {!isCollapsed && <span>Iniciar Sesión</span>}
                    </Link>
                )}
            </div>
        </div >
    );
}
