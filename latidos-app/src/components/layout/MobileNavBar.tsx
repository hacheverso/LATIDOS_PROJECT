"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Truck, Menu, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/Sidebar"; // Reuse existing sidebar in Sheet? Or just Menu button toggles main sidebar?
// Ideally, the Sidebar is complex with state.
// For the "Menu" button on mobile, we can use a Sheet (Side Drawer) that renders the Sidebar content.
// However, the existing Sidebar component assumes it's always visible or collapsed in desktop flow.
// Let's create a wrapper or reuse it. For now, let's make the "Menu" button just open a Sheet containing the Sidebar.

export function MobileNavBar() {
    const pathname = usePathname();

    const navItems = [
        {
            name: "Inicio",
            href: "/inventory", // Dashboard is at /inventory usually? Or /? Sidebar says /inventory is Panel.
            icon: LayoutDashboard
        },
        {
            name: "Venta",
            href: "/sales/new",
            icon: ShoppingCart
        },
        {
            name: "Logística",
            href: "/logistics",
            icon: Truck
        },
        {
            name: "Catálogo",
            href: "/inventory/catalog",
            icon: Box
        }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] safe-area-bottom">
            <div className="flex justify-between items-center">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                                isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Icon className={cn("w-6 h-6", isActive && "fill-current")} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-bold uppercase tracking-wide">{item.name}</span>
                        </Link>
                    );
                })}

                {/* Mobile Menu Trigger (Sheet) */}
                <Sheet>
                    <SheetTrigger asChild>
                        <button className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                            <Menu className="w-6 h-6" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">Menú</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-80 border-r-0">
                        {/* We render the Sidebar here. We need to make sure Sidebar fits or adjustments are needed. 
                            The Sidebar has 'h-screen', which fits.
                            But Sidebar has 'hidden md:flex' in layout. We need to render it here regardless.
                            We might need to adjust Sidebar to NOT have hidden class inside itself, but relying on parent.
                            Looking at Sidebar.tsx, it has 'flex flex-col h-screen...'. It doesn't have 'hidden'.
                            The 'hidden' is in layout.tsx. Perfect.
                        */}
                        <Sidebar mobileMode={true} />
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
}
