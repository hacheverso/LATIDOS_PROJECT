"use client";

import React, { useState, useMemo, Fragment } from "react";
import Image from "next/image";
import { Search, Save, RotateCcw, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveAudit } from "../actions";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

// Add user avatar or lock visual marker
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Product {
    id: string;
    name: string;
    sku: string;
    upc: string;
    imageUrl: string | null;
    systemStock: number;
    category: string;
}

interface AuditTableProps {
    initialProducts: Product[];
}

interface AuditRow {
    productId: string;
    physicalCount: number | "";
    observations: string;
    verified: boolean;
}

export default function AuditTable({ initialProducts }: AuditTableProps) {
    const { data: session } = useSession();
    // @ts-ignore
    const currentUserId = session?.user?.id;

    const [search, setSearch] = useState("");
    const [auditData, setAuditData] = useState<Record<string, AuditRow>>({});

    // Server Sync State
    const [serverState, setServerState] = useState<Record<string, {
        lockedByUserId: string | null;
        totalPhysicalCount: number;
        contributions: any[];
    }>>({});

    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Initial Load from LocalStorage
    React.useEffect(() => {
        const saved = localStorage.getItem('latidos_audit_draft');
        if (saved) {
            try {
                setAuditData(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse local draft");
            }
        }
    }, []);

    // Save to LocalStorage on change
    React.useEffect(() => {
        if (Object.keys(auditData).length > 0) {
            localStorage.setItem('latidos_audit_draft', JSON.stringify(auditData));
        }
    }, [auditData]);

    // SSE Connection
    React.useEffect(() => {
        const eventSource = new EventSource('/api/audit/stream');

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'update' && data.items) {
                    setServerState(prev => {
                        const next = { ...prev };
                        data.items.forEach((item: any) => {
                            next[item.productId] = {
                                lockedByUserId: item.lockedByUserId,
                                totalPhysicalCount: item.contributions?.[0]?.count ?? "", // single value now
                                contributions: item.contributions
                            };
                        });
                        return next;
                    });

                    // Update inputs seamlessly when others change them
                    setAuditData(prevData => {
                        let changed = false;
                        const nextData = { ...prevData };
                        data.items.forEach((item: any) => {
                            const globalCount = item.contributions?.[0]?.count ?? "";

                            // To support multiple devices with the exact same user account (e.g. GESTION_OPERATIVA),
                            // we must ALWAYS update our local state if the server has a new value that doesn't 
                            // match ours, unless we are currently actually actively typing in it (focus).
                            // The focus is managed by the onFocus/onBlur triggering locks.
                            if (nextData[item.productId]?.physicalCount !== globalCount && globalCount !== "") {
                                nextData[item.productId] = {
                                    ...nextData[item.productId] || { productId: item.productId, observations: "", verified: false },
                                    physicalCount: globalCount
                                };
                                changed = true;
                            }
                        });
                        return changed ? nextData : prevData;
                    });
                }
            } catch (e) {
                console.error("SSE parse error", e);
            }
        };

        return () => {
            eventSource.close();
        };
    }, []);

    // Initial State or Reset
    const getRowState = (productId: string) => {
        return auditData[productId] || {
            productId,
            physicalCount: "",
            observations: "",
            verified: false
        };
    };

    // Debounced Sync Helper
    const syncToServer = React.useCallback(
        async (updates: { productId: string; physicalCount?: number | ""; observations?: string; isFocused?: boolean }[]) => {
            setSyncing(true);
            try {
                await fetch('/api/audit/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates })
                });
            } catch (e) {
                console.error("Failed to sync", e);
            } finally {
                setSyncing(false);
            }
        },
        []
    );

    const debounceSync = React.useMemo(() => {
        let timeout: NodeJS.Timeout;
        return (updates: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => syncToServer(updates), 500);
        };
    }, [syncToServer]);

    const handleCountChange = (productId: string, val: string) => {
        const num = val === "" ? "" : parseInt(val);
        if (num !== "" && isNaN(num)) return;

        setAuditData(prev => ({
            ...prev,
            [productId]: {
                ...getRowState(productId),
                physicalCount: num,
                verified: true
            }
        }));
    };

    const handleObservationChange = (productId: string, val: string) => {
        setAuditData(prev => ({
            ...prev,
            [productId]: {
                ...getRowState(productId),
                observations: val
            }
        }));
    };

    const handleFocus = (productId: string, isFocused: boolean) => {
        syncToServer([{ productId, isFocused }]);
    };

    const handleReset = async () => {
        if (confirm("¿Estás seguro de reiniciar la auditoría? Se borrará todo el conteo actual de todos los usuarios.")) {
            setAuditData({});
            localStorage.removeItem('latidos_audit_draft');
            await fetch('/api/audit/reset', { method: 'POST' });
            toast.info("Auditoría reiniciada.");
            window.location.reload();
        }
    };

    const handleFinish = async () => {
        // Filter only modified rows? Or send all?
        // User wants to "Finalize". Usually this means submitting what we found.
        // If phyiscalCount is empty -> we assume we didn't count it (ignore? or assume 0? Dangerous to assume 0).
        // Let's warn if there are uncounted items, or just submit the counted ones.

        const countedItems = Object.values(auditData).filter(row => row.physicalCount !== "");

        if (!confirm(`Se enviará tu conteo para finalizar la auditoría global. ¿Estás seguro?`)) return;

        setLoading(true);
        try {
            // First flush any remaining drafts
            await syncToServer(countedItems);

            // Then submit to finalize
            const result = await saveAudit(countedItems.map(item => ({
                productId: item.productId,
                physicalCount: Number(item.physicalCount),
                observations: item.observations
            })));

            if (result.success) {
                toast.success("Auditoría guardada exitosamente.");
                setAuditData({});
                localStorage.removeItem('latidos_audit_draft');
                window.location.href = "/inventory/audit/history";
            } else {
                toast.error(result.error || "Error al guardar auditoría");
            }
        } catch (e) {
            toast.error("Error al conectar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    const groupedProducts = useMemo(() => {
        let products = initialProducts;

        // Filter Logic
        if (!search) {
            // Default: Hide 0 stock
            products = products.filter(p => p.systemStock > 0);
        } else {
            // Search: Show all matches (even 0 stock)
            const low = search.toLowerCase();
            products = products.filter(p =>
                p.name.toLowerCase().includes(low) ||
                p.sku.toLowerCase().includes(low) ||
                p.upc.toLowerCase().includes(low)
            );
        }

        // Group by Category
        const groups: Record<string, Product[]> = {};
        products.forEach(p => {
            const cat = p.category || "SIN CATEGORÍA";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p);
        });

        // Sort Categories Alphabetically
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [initialProducts, search]);

    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-card p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/10">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar producto, SKU o escanear..."
                        className="pl-9 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={handleReset} className="flex-1 md:flex-none gap-2 text-slate-600 dark:text-slate-300 dark:border-white/20 dark:hover:bg-white/10">
                        <RotateCcw className="w-4 h-4" />
                        Reiniciar
                    </Button>
                    <Button onClick={handleFinish} disabled={loading} className="flex-1 md:flex-none gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                        <Save className="w-4 h-4" />
                        {loading ? "Guardando..." : "Finalizar Auditoría"}
                    </Button>
                </div>
                {syncing && <span className="absolute top-2 right-4 text-[10px] text-blue-500 animate-pulse">Sincronizando...</span>}
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-100 dark:border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-[#1A1C1E] border-b border-slate-100 dark:border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Producto</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-24">UPC</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-28">Sistema</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-32">Físico</th>
                                <th className="px-4 py-3 text-center font-bold text-slate-500 dark:text-slate-400 w-28">Diferencia</th>
                                <th className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {groupedProducts.map(([category, products]) => (
                                <Fragment key={category}>
                                    {/* Category Header */}
                                    <tr className="bg-slate-100/80 dark:bg-white/5 border-y border-slate-200 dark:border-white/10">
                                        <td colSpan={6} className="px-4 py-2 font-black text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wider">
                                            {category} <span className="text-slate-400 font-normal">({products.length})</span>
                                        </td>
                                    </tr>

                                    {/* Products */}
                                    {products.map(product => {
                                        const rowState = getRowState(product.id);
                                        const srvState = serverState[product.id];

                                        // My count
                                        const myCount = rowState.physicalCount;
                                        const hasVal = myCount !== "";
                                        const diff = hasVal ? (myCount as number) - product.systemStock : 0;
                                        const isMatched = hasVal && diff === 0;
                                        const isMismatch = hasVal && diff !== 0;

                                        // The iPad concurrency is solved by allowing visual overlap but syncing the exact last value reliably
                                        const isLockedByOther = srvState?.lockedByUserId && srvState.lockedByUserId !== currentUserId;

                                        // If someone locked it AND gave a value, we can just allow editing. It's more about preventing overwriting while empty.
                                        // Actually, to make iPads work together safely, we can just highlight it but not strictly disable it.
                                        const isLockedVisual = srvState?.lockedByUserId;
                                        const lastContributor = srvState?.contributions?.[0];

                                        return (
                                            <tr
                                                key={product.id}
                                                className={cn(
                                                    "transition-colors relative",
                                                    isLockedVisual ? "bg-amber-50/30 dark:bg-amber-500/5 hover:bg-amber-100/50" :
                                                        isMatched ? "bg-green-50/50 dark:bg-green-500/10 hover:bg-green-100/50 dark:hover:bg-green-500/20" :
                                                            isMismatch ? "bg-red-50/50 dark:bg-red-500/10 hover:bg-red-100/50 dark:hover:bg-red-500/20" :
                                                                "hover:bg-slate-50 dark:hover:bg-white/5"
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                                                            {product.imageUrl ? (
                                                                <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                                                            )}
                                                            {isLockedVisual && (
                                                                <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                                                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 max-w-full">
                                                            <p className="font-bold text-slate-900 dark:text-white whitespace-normal leading-tight" title={product.name}>{product.name}</p>
                                                            {isLockedVisual ? (
                                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">Editando...</p>
                                                            ) : lastContributor ? (
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5" title={lastContributor.userName}>Última edición: <span className="text-blue-600 dark:text-blue-400">{lastContributor.userName.split(' ')[0]}</span></p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {product.upc && (
                                                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded">
                                                            {product.upc}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold font-mono">
                                                        {product.systemStock}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            disabled={isLockedVisual ? true : false}
                                                            className={cn(
                                                                "audit-count-input w-20 h-9 text-center font-bold font-mono mx-auto text-lg",
                                                                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                                isLockedVisual ? "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-500/10 cursor-not-allowed" :
                                                                    isMatched ? "border-green-500 text-green-700 dark:text-green-400 ring-green-200 dark:ring-green-900 bg-white dark:bg-[#1A1C1E]" :
                                                                        isMismatch ? "border-red-500 text-red-700 dark:text-red-400 ring-red-200 dark:ring-red-900 bg-white dark:bg-[#1A1C1E]" : "text-black dark:text-white border-slate-300 dark:border-white/20 bg-white dark:bg-[#1A1C1E]"
                                                            )}
                                                            value={myCount}
                                                            onChange={(e) => handleCountChange(product.id, e.target.value)}
                                                            onFocus={() => handleFocus(product.id, true)}
                                                            onBlur={(e) => {
                                                                handleFocus(product.id, false);
                                                                syncToServer([{ productId: product.id, physicalCount: e.target.value === "" ? "" : Number(e.target.value), isFocused: false }]);
                                                            }}
                                                            onWheel={(e) => e.currentTarget.blur()}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.audit-count-input:not(:disabled)'));
                                                                    const idx = inputs.indexOf(e.currentTarget);
                                                                    if (idx !== -1 && idx + 1 < inputs.length) {
                                                                        inputs[idx + 1].focus();
                                                                        inputs[idx + 1].select();
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {hasVal && (
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                                                            diff === 0 ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" :
                                                                diff > 0 ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                                                        )}>
                                                            {diff > 0 ? "+" : ""}{diff}
                                                            {diff === 0 && <CheckCircle2 className="w-3 h-3" />}
                                                            {diff !== 0 && <AlertCircle className="w-3 h-3" />}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Input
                                                        placeholder="Nota opcional..."
                                                        disabled={!!isLockedVisual}
                                                        className="h-9 text-xs font-semibold text-slate-900 dark:text-white border-transparent bg-transparent hover:bg-white dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10 focus:bg-white dark:focus:bg-white/10 focus:border-slate-300 dark:focus:border-white/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50"
                                                        value={rowState.observations}
                                                        onChange={(e) => handleObservationChange(product.id, e.target.value)}
                                                        onFocus={() => handleFocus(product.id, true)}
                                                        onBlur={(e) => {
                                                            handleFocus(product.id, false);
                                                            syncToServer([{ productId: product.id, observations: e.target.value, isFocused: false }]);
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            ))}
                            {groupedProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                        No se encontraron productos
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
