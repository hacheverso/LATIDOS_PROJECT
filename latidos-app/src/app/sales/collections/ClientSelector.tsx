"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { searchCustomers } from "./actions";

interface Customer {
    id: string;
    name: string;
    taxId: string;
    creditBalance?: number;
}

interface ClientSelectorProps {
    onSelect: (customer: Customer | null) => void;
}

export function ClientSelector({ onSelect }: ClientSelectorProps) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const [query, setQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            try {
                // @ts-ignore
                const results = await searchCustomers(query);
                // @ts-ignore
                setCustomers(results);
            } catch (error) {
                console.error("Error fetching customers:", error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(fetchCustomers, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-12 text-lg"
                >
                    {value
                        ? customers.find((customer) => customer.id === value)?.name
                        : "Buscar Cliente (Nombre, NIT, Celular)..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-2 border-b bg-white">
                    <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900 transition-all">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400 text-slate-900"
                            placeholder="Buscar por Nombre, NIT o Teléfono..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                    {loading && <div className="p-2 text-sm text-center text-muted-foreground">Buscando...</div>}
                    {!loading && customers.length === 0 && (
                        <div className="p-2 text-sm text-center text-muted-foreground">No se encontraron clientes.</div>
                    )}
                    {customers.map((customer) => (
                        <div
                            key={customer.id}
                            className={cn(
                                "flex items-center gap-2 p-3 rounded-md cursor-pointer text-sm transition-colors border-b last:border-0 border-slate-50",
                                "hover:bg-slate-100 hover:text-slate-900",
                                value === customer.id ? "bg-slate-900 text-white hover:bg-slate-800 hover:text-white" : "text-slate-700 bg-white"
                            )}
                            onClick={() => {
                                const newValue = value === customer.id ? "" : customer.id;
                                setValue(newValue);
                                onSelect(newValue ? customer : null);
                                setOpen(false);
                            }}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4 flex-shrink-0",
                                    value === customer.id ? "opacity-100" : "opacity-0"
                                )}
                            />
                            <div className="flex flex-col">
                                <span className={cn("font-bold", value === customer.id ? "text-white" : "text-slate-900")}>
                                    {customer.name}
                                </span>
                                <div className="flex gap-2 text-xs opacity-80">
                                    <span>NIT: {customer.taxId}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
