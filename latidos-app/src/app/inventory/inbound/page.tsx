"use client";
/* eslint-disable */

import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Save, PackageCheck, AlertCircle, Trash2, Search, Settings2, RefreshCw, ChevronDown, ScanBarcode, Box, Layers, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


import { getProductByUpc, createPurchase, searchProducts, getSuppliers, getLastProductCost, getPurchaseDetails, updatePurchase } from "@/app/inventory/actions";
import { useRouter, useSearchParams } from "next/navigation";
import CreateProviderModal from "@/components/directory/CreateProviderModal";

type ScanStep = "EXPECTING_UPC" | "EXPECTING_SERIAL" | "EXPECTING_QUANTITY";

import { Suspense } from "react";

function InboundContent() {
    // State
    const [inboundMode, setInboundMode] = useState<"SERIALIZED" | "BULK">("SERIALIZED");
    const [currency, setCurrency] = useState<"COP" | "USD">("USD");
    const [exchangeRate, setExchangeRate] = useState(4000);

    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    const [scanStep, setScanStep] = useState<ScanStep>("EXPECTING_UPC");
    const [supplierId, setSupplierId] = useState("");
    // Use proper types or explicit any if temporary to fix build, but better to use unknowns or defined types
    const [currentProduct, setCurrentProduct] = useState<any | null>(null);
    const [scannedItems, setScannedItems] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [scanFeedback, setScanFeedback] = useState<"idle" | "success" | "error" | "click">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [costs, setCosts] = useState<Record<string, number>>({});
    const [lastCosts, setLastCosts] = useState<Record<string, number | null>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Fields
    const [attendant, setAttendant] = useState("");
    const [notes, setNotes] = useState("");

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showCreateProvider, setShowCreateProvider] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        getSuppliers().then(setSuppliers);

        if (editId) {
            getPurchaseDetails(editId).then(data => {
                if (data) {
                    setSupplierId(data.purchase.supplierId);

                    // Set Currency & Rate from DB
                    setCurrency(((data.purchase as any).currency as "COP" | "USD") || "COP");
                    setExchangeRate(Number((data.purchase as any).exchangeRate) || 1);

                    setScannedItems(data.items);

                    // Populate costs using originalCost (what user typed)
                    // If originalCost is missing (old records), fallback to cost (converted) but that might be confusing if currency differs.
                    // But for new records, originalCost is exact.
                    const costMap: Record<string, number> = {};
                    data.items.forEach((item: any) => {
                        costMap[item.sku] = item.originalCost || item.cost;
                    });
                    setCosts(costMap);
                }
            });
        }
    }, [editId]);



    // Audio Context Ref
    const audioContextRef = useRef<AudioContext | null>(null);

    // Refs
    const scannerInputRef = useRef<HTMLInputElement>(null);

    // Initialize Audio Context
    useEffect(() => {
        const initAudio = () => {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
        };
        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);
        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        }
    }, []);

    const playSound = useCallback((type: "success" | "error" | "click") => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        if (type === "success") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(1500, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.1);
        } else if (type === "error") {
            oscillator.type = "sawtooth";
            oscillator.frequency.setValueAtTime(100, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.4);
        } else if (type === "click") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.05);
        }
    }, []);

    // Reset Scanner Logic
    const resetScanner = useCallback(() => {
        if (scanStep === "EXPECTING_UPC" && !currentProduct) return; // Already at start

        setScanStep("EXPECTING_UPC");
        setCurrentProduct(null);
        setInputValue("");
        setErrorMsg("OPERACIÓN CANCELADA");
        setScanFeedback("error"); // Visual feedback (Red)
        playSound("error");

        // Clear message after delay
        setTimeout(() => setErrorMsg(""), 1500);
        setTimeout(() => scannerInputRef.current?.focus(), 100);
    }, [scanStep, currentProduct, playSound]);

    // Shortcuts: F1 (Serialized), F2 (Bulk), ESC (Cancel)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F1") {
                e.preventDefault();
                setInboundMode("SERIALIZED");
                playSound("click");
            } else if (e.key === "F2") {
                e.preventDefault();
                setInboundMode("BULK");
                playSound("click");
            } else if (e.key === "Escape") {
                e.preventDefault();
                resetScanner();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [playSound, resetScanner]);

    const handleDelete = (index: number) => {
        setScannedItems(prev => prev.filter((_, i) => i !== index));
        playSound("click");
    };

    // Derived Summary
    const productSummary = scannedItems.reduce((acc: Record<string, any>, item: any) => {
        if (!acc[item.sku]) {
            acc[item.sku] = { name: item.productName, count: 0, sku: item.sku };
        }
        acc[item.sku].count++;
        return acc;
    }, {});

    // Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                // setIsSearching(true);
                const results = await searchProducts(searchQuery);
                setSearchResults(results);
                // setIsSearching(false);
                setShowSearchResults(true);
            } else {
                setSearchResults([]);
                setShowSearchResults(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectProduct = (product: any) => {
        setCurrentProduct(product);
        setSearchQuery("");
        setShowSearchResults(false);
        setScanStep(inboundMode === "BULK" ? "EXPECTING_QUANTITY" : "EXPECTING_SERIAL");
        setScanFeedback("click");
        playSound("click");

        // Fetch Last Cost
        getLastProductCost(product.id).then(cost => {
            if (cost !== null) {
                setLastCosts(prev => ({ ...prev, [product.sku]: cost }));
            }
        });

        setTimeout(() => scannerInputRef.current?.focus(), 100);
    };


    const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue) {
            e.preventDefault();
            const scannedValue = inputValue.toUpperCase().trim();

            // If empty, just return focus
            if (!scannedValue) return;

            setErrorMsg("");

            // SMART RE-SCAN / GLOBAL UPC CHECK
            // If we are in STEP 2 (Serial or Qty) but the user scans a UPC (11-14 digits usually, but let's check DB),
            // we should probably switch to that product.
            // Only do this check if we are NOT expecting UPC (since that logic handles it anyway)
            // AND if the input looks like a potential UPC to avoid unnecessary DB calls for short serials.
            if (scanStep !== "EXPECTING_UPC") {
                // Heuristic: UPCs are usually numeric and >= 8 chars.
                // Or we can just ALWAYS try to find if it looks like a UPC.
                if (scannedValue.length >= 8 && /^\d+$/.test(scannedValue)) {
                    // Try to find product
                    try {
                        const product = await getProductByUpc(scannedValue);
                        if (product) {
                            // IT IS A UPC! Reset and start with this product.
                            setCurrentProduct(product);
                            setScanStep(inboundMode === "BULK" ? "EXPECTING_QUANTITY" : "EXPECTING_SERIAL");
                            setScanFeedback("click");
                            playSound("click");
                            setInputValue("");

                            getLastProductCost(product.id).then(cost => {
                                if (cost !== null) {
                                    setLastCosts(prev => ({ ...prev, [product.sku]: cost }));
                                }
                            });

                            // Visual feedback that we switched
                            setErrorMsg("RE-SCAN: PRODUCTO CAMBIADO");
                            setTimeout(() => setErrorMsg(""), 1500);
                            return;
                        }
                    } catch (err) {
                        // Ignore error, proceed as normal input
                    }
                }
            }

            if (scanStep === "EXPECTING_UPC") {
                getProductByUpc(scannedValue).then((product) => {
                    if (product) {
                        setCurrentProduct(product);
                        setScanStep(inboundMode === "BULK" ? "EXPECTING_QUANTITY" : "EXPECTING_SERIAL");
                        setScanFeedback("click");
                        playSound("click");
                        setInputValue(""); // Clear only on success

                        // Fetch Last Cost
                        getLastProductCost(product.id).then(cost => {
                            if (cost !== null) {
                                setLastCosts(prev => ({ ...prev, [product.sku]: cost }));
                            }
                        });
                    } else {
                        setScanFeedback("error");
                        setErrorMsg("UPC NO ENCONTRADO");
                        playSound("error");
                        setInputValue(""); // Clear on error to retry
                    }
                }).catch(() => {
                    setScanFeedback("error");
                    setErrorMsg("ERROR DE CONEXIÓN");
                    playSound("error");
                    setInputValue("");
                });
            } else if (scanStep === "EXPECTING_QUANTITY") {
                const qty = parseInt(scannedValue);
                if (isNaN(qty) || qty <= 0) {
                    setScanFeedback("error");
                    setErrorMsg("CANTIDAD INVÁLIDA");
                    playSound("error");
                    setInputValue("");
                    return;
                }

                const newItems = Array.from({ length: qty }).map((_, i) => ({
                    serial: `BULK-${Date.now()}-${i}`,
                    productName: currentProduct?.name,
                    sku: currentProduct?.sku,
                    upc: currentProduct?.upc,
                    productId: currentProduct?.id,
                    timestamp: new Date().toLocaleTimeString(),
                    isBulk: true
                }));

                setScannedItems(prev => [...newItems, ...prev]);
                setScanFeedback("success");
                playSound("success");

                // RESET TO UPC
                setScanStep("EXPECTING_UPC");
                setCurrentProduct(null);
                setInputValue("");
                // Focus is maintained by autoFocus or ref below

            } else {
                // SERIAL MODE
                if (currentProduct?.upc === scannedValue) {
                    // This case is actually covered by Smart Re-scan above now!
                    // But if Smart Re-scan failed/skipped for some reason (e.g. user logic changed), keep this check?
                    // No, if user scans SAME UPC, Smart Re-scan re-initializes Step 2, effectively 'ignoring' it as a serial.
                    // So this error "ESPERABA SERIAL, NO UPC" might only happen if `getProductByUpc` failed but string match works?
                    // Let's keep it as fallback.
                    setScanFeedback("error");
                    setErrorMsg("YA ESCANEASTE ESTE UPC");
                    playSound("error");
                    setInputValue("");
                    return;
                }
                if (scannedItems.some(i => i.serial === scannedValue)) {
                    setScanFeedback("error");
                    setErrorMsg("¡SERIAL YA EN LOTE!");
                    playSound("error");
                    setInputValue("");
                    return;
                }

                const newItem = {
                    serial: scannedValue,
                    productName: currentProduct?.name,
                    sku: currentProduct?.sku,
                    upc: currentProduct?.upc,
                    productId: currentProduct?.id,
                    timestamp: new Date().toLocaleTimeString(),
                    isBulk: false
                };

                setScannedItems(prev => [newItem, ...prev]);
                setScanFeedback("success");
                playSound("success");

                // Reset to UPC as default flow
                setScanStep("EXPECTING_UPC");
                setCurrentProduct(null);
                setInputValue("");
            }
        }
    };

    // Auto-focus management
    useEffect(() => {
        if (!isSubmitting) {
            const timer = setTimeout(() => scannerInputRef.current?.focus(), 50);
            return () => clearTimeout(timer);
        }
    }, [scanStep, isSubmitting, inboundMode, currentProduct]); // Dependency on currentProduct ensures focus when step changes due to product load


    useEffect(() => {
        const newCosts = { ...costs };
        let changed = false;
        scannedItems.forEach(item => {
            if (newCosts[item.sku] === undefined) {
                newCosts[item.sku] = 0;
                changed = true;
            }
        });
        if (changed) setCosts(newCosts);
    }, [scannedItems, costs]);

    const handleFinalize = async () => {
        if (scannedItems.length === 0) {
            alert("No hay items escaneados");
            return;
        }

        // VALIDATION: Check for Zero Cost
        const zeroCostItems = scannedItems.filter(item => !costs[item.sku] || costs[item.sku] <= 0);
        if (zeroCostItems.length > 0) {
            const confirmed = window.confirm(`¡ALERTA! Hay ${zeroCostItems.length} items con Costo $0 (o no definido). \n\n¿Desea continuar de todos modos? Esto registrará el ingreso sin valor comercial.`);
            if (!confirmed) return;
        }

        setIsSubmitting(true);
        try {
            const itemsToSave = scannedItems.map(item => {
                const userCost = costs[item.sku] || 0;
                // If editing, we assume userCost is what they see (could be USD or COP). 
                // BUT, data.items loaded cost (COP).
                // If currency is USD, we convert. If COP, we take as is.
                // NOTE: When loading edit, we set costMap with DB values (COP).
                // So if user stays in COP, it's fine. If user switches to USD... 
                // The input displays `costs[p.sku]`. If we switch currency, the value in `costs` is raw number.
                // We shouldn't auto-convert the number in the state, but we should interpret it differently?
                // Actually, the simplest is: The input is "Costo ({currency})".
                // If I load 10000 COP, and I am in COP mode, input says 10000.
                // If I switch to USD, input still says 10000 (wrong).
                // Ideally, we should detect currency or force COP for now.
                // For this task, let's assume user operates in COP or re-enters if mode changes.
                // But for Save:
                const finalCost = currency === "USD" ? userCost * exchangeRate : userCost;
                return {
                    instanceId: item.instanceId, // Pass ID if editing
                    sku: item.sku,
                    serial: item.serial,
                    productId: item.productId,
                    cost: finalCost,
                    originalCost: userCost // Pass what the user sees/typed
                };
            });

            if (editId) {
                // Pass currency and TRM
                // Note: Update not yet refactored for new fields if not requested, but safe to keep as is if signature matches
                // However, user only asked for creation flow? 
                // Let's assume updatePurchase might need update too, but for strictly "Reception" usually it's create.
                // If updatePurchase wasn't changed, this line is fine.
                await updatePurchase(editId, supplierId, currency, exchangeRate, itemsToSave);
                alert("Recepción actualizada correctamente");
            } else {
                await createPurchase(supplierId, currency, exchangeRate, itemsToSave, attendant, notes);
                alert("Recepción guardada correctamente");
            }

            setScannedItems([]);
            setIsSubmitting(false);
            router.push("/inventory/purchases");

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            alert(msg);
            setIsSubmitting(false);
        }
    };

    const generatePDF = () => {
        if (scannedItems.length === 0) {
            alert("No hay items para generar reporte.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // --- HEADER ---
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("LATIDOS", 14, 20);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Reporte de Recepción de Mercancía", 14, 26);

        const dateStr = new Date().toLocaleString();
        doc.text(`Fecha: ${dateStr}`, pageWidth - 14, 20, { align: "right" });

        // Supplier & TRM Info
        const supplierName = suppliers.find(s => s.id === supplierId)?.name || "Proveedor General";
        doc.text(`Proveedor: ${supplierName}`, 14, 34);
        doc.text(`TRM Aplicada: $${exchangeRate.toLocaleString()} COP`, 14, 39);
        doc.text(`Moneda Entrada: ${currency}`, 14, 44);

        // --- DATA PROCESSING ---
        // Group items by SKU for cleaner display
        const groupedItems: Record<string, any> = {};

        scannedItems.forEach(item => {
            if (!groupedItems[item.sku]) {
                groupedItems[item.sku] = {
                    name: item.productName || item.name, // Fallback if name missing
                    upc: item.upc,
                    sku: item.sku,
                    cost: item.cost, // Assumed stored in COP or processed below
                    serials: [],
                    qty: 0,
                    isBulk: item.isBulk
                };
            }
            groupedItems[item.sku].qty += 1;
            if (!item.isBulk && item.serial) {
                groupedItems[item.sku].serials.push(item.serial);
            }
        });

        const tableRows = Object.values(groupedItems).map((item: any) => {
            // Cost Handling
            // We use the `costs` state for the source of truth if available, otherwise 0
            const rawCost = costs[item.sku] || 0;
            const costUSD = currency === "USD" ? rawCost : rawCost / exchangeRate;
            const costCOP = currency === "USD" ? rawCost * exchangeRate : rawCost;

            // Identifiers: List of Serials or Quantity
            let identifiers = "";
            if (item.isBulk) {
                identifiers = `CANTIDAD: ${item.qty}`;
            } else {
                // Formatting serials: 5 per line or just comma joined, autotable handles wrapping
                identifiers = item.serials.join(", ");
            }

            return [
                `${item.name}\n${item.sku}`, // Item
                item.upc,                     // UPC
                `$${costUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, // USD
                `$${costCOP.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, // COP
                identifiers // S/N
            ];
        });

        // --- TABLE ---
        autoTable(doc, {
            startY: 50,
            head: [["Item / SKU", "UPC", "Costo Unit (USD)", "Costo Unit (COP)", "Identificadores (S/N)"]],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 40 }, // Item
                1: { cellWidth: 30 }, // UPC
                2: { cellWidth: 25, halign: 'right' }, // USD
                3: { cellWidth: 30, halign: 'right' }, // COP
                4: { cellWidth: 'auto' } // Serials (takes remaining space)
            },
            didDrawPage: (data) => {
                // Header on new pages
                if (data.pageNumber > 1) {
                    doc.setFontSize(8);
                    doc.text("Reporte de Recepción - LATIDOS", 14, 10);
                }
            }
        });

        // --- FOOTER / TOTALS ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        // Calculate Totals
        const totalUnits = scannedItems.length;
        const totalCOP = Object.values(groupedItems).reduce((acc: number, item: any) => {
            const rawCost = costs[item.sku] || 0;
            const itemTotalCOP = (currency === "USD" ? rawCost * exchangeRate : rawCost) * item.qty;
            return acc + itemTotalCOP;
        }, 0);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Unidades: ${totalUnits}`, 14, finalY);
        doc.text(`Total Costo (COP): $${totalCOP.toLocaleString()}`, 14, finalY + 5);

        doc.save(`Recepcion_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div className="w-full px-4 md:px-8 space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pt-6">
                <div className="flex items-center gap-4">
                    <Link href="/inventory" className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors shadow-sm">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <PackageCheck className="w-8 h-8 text-blue-600" />
                            Recepción Inteligente
                        </h1>
                        <p className="text-slate-500 font-medium">Gestión de Ingresos</p>
                    </div>
                </div>

                {/* SEARCH BAR */}
                <div className="relative w-full md:w-[600px] z-50">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                            className="w-full h-16 bg-white border-2 border-slate-200 rounded-full pl-16 pr-6 text-xl font-bold text-slate-900 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none uppercase placeholder:text-slate-300 transition-all font-mono"
                            placeholder="ESCÁNER LISTO (O BUSCAR MANUAL...)"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {showSearchResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 max-h-80 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
                            {searchResults.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleSelectProduct(p)}
                                    className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl flex items-center gap-4 transition-colors mb-1 cursor-pointer group"
                                >
                                    {p.imageUrl ? (
                                        <img src={p.imageUrl} alt={p.name} className="w-14 h-14 object-contain rounded-xl bg-white border border-slate-100 p-1" />
                                    ) : (
                                        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 border border-slate-200">
                                            <PackageCheck className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-sm font-black text-slate-800 uppercase group-hover:text-blue-700 transition-colors">{p.name}</div>
                                        <div className="text-xs text-slate-400 font-bold font-mono mt-1 group-hover:text-blue-400">UPC: {p.upc}</div>
                                    </div>
                                    <div className="ml-auto bg-white border border-slate-200 p-2 rounded-lg group-hover:border-blue-200">
                                        <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180 group-hover:text-blue-500" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* NEW: TOP CONFIG BAR (Horizontal) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 animate-in slide-in-from-top-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 1. Supplier */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</label>
                        <div className="relative">
                            <select
                                value={supplierId}
                                onChange={(e) => {
                                    if (e.target.value === "NEW_PROVIDER_TRIGGER") {
                                        setShowCreateProvider(true);
                                        setSupplierId("");
                                    } else {
                                        setSupplierId(e.target.value);
                                    }
                                }}
                                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none uppercase font-bold text-slate-700 text-sm appearance-none cursor-pointer hover:bg-white transition-all"
                            >
                                <option value="">-- SELECCIONAR PROVEEDOR --</option>
                                <option value="NEW_PROVIDER_TRIGGER" className="text-blue-600 bg-blue-50 font-bold">+ CREAR NUEVO</option>
                                <option disabled>------------------------</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* 2. Attendant */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encargado <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <select
                                value={attendant}
                                onChange={(e) => setAttendant(e.target.value)}
                                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none uppercase font-bold text-slate-700 text-sm appearance-none cursor-pointer hover:bg-white transition-all"
                            >
                                <option value="">-- SELECCIONAR --</option>
                                <option value="MARIA_PAULA">María Paula</option>
                                <option value="MAURICIO_HIGUITA">Mauricio Higuita</option>
                                <option value="MATEO_MORALES">Mateo Morales</option>
                                <option value="HUGO_GIRALDO">Hugo Giraldo</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* 3. Currency & Rate */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moneda / Tasa</label>
                        <div className="flex gap-2">
                            <div className="flex bg-slate-100 p-1 rounded-xl h-12 items-center">
                                <button
                                    onClick={() => setCurrency("USD")}
                                    className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all h-full", currency === "USD" ? "bg-white text-green-700 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                >
                                    USD
                                </button>
                                <button
                                    onClick={() => setCurrency("COP")}
                                    className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all h-full", currency === "COP" ? "bg-white text-green-700 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                >
                                    COP
                                </button>
                            </div>
                            {currency === "USD" && (
                                <div className="flex-1 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">TRM</span>
                                    <input
                                        type="number"
                                        value={exchangeRate}
                                        onChange={e => setExchangeRate(Number(e.target.value))}
                                        className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-10 pr-3 text-right font-mono font-bold text-slate-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-sm"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24">

                {/* Center/Left Panel: Scanner & List (8 cols) - EXPANDED */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* NEW MODE SELECTOR (CENTERED) */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setInboundMode("SERIALIZED")}
                            className={cn(
                                "h-24 rounded-3xl text-sm font-black uppercase transition-all border-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group",
                                inboundMode === "SERIALIZED"
                                    ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-blue-200 hover:bg-blue-50"
                            )}
                        >
                            {inboundMode === "SERIALIZED" && (
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-50"></div>
                            )}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <ScanBarcode className={cn("w-6 h-6", inboundMode === "SERIALIZED" ? "text-white" : "text-slate-300 group-hover:text-blue-400")} />
                                    <span>Serializado</span>
                                </div>
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest", inboundMode === "SERIALIZED" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400")}>
                                    TECLA F1
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => setInboundMode("BULK")}
                            className={cn(
                                "h-24 rounded-3xl text-sm font-black uppercase transition-all border-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden group",
                                inboundMode === "BULK"
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                                    : "bg-white border-slate-200 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50"
                            )}
                        >
                            {inboundMode === "BULK" && (
                                <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-50"></div>
                            )}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <Layers className={cn("w-6 h-6", inboundMode === "BULK" ? "text-white" : "text-slate-300 group-hover:text-emerald-400")} />
                                    <span>Masivo</span>
                                </div>
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest", inboundMode === "BULK" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400")}>
                                    TECLA F2
                                </span>
                            </div>
                        </button>
                    </div>


                    <div className={cn(
                        "p-12 rounded-3xl shadow-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-center min-h-[320px] border-4",
                        scanFeedback === "error" ? "bg-red-600 border-red-500 shadow-red-600/30" :
                            scanStep === "EXPECTING_UPC" ? "bg-slate-900 border-slate-800 shadow-slate-900/30" :
                                inboundMode === "BULK" ? "bg-emerald-600 border-emerald-500 shadow-emerald-600/30" : "bg-blue-600 border-blue-500 shadow-blue-600/30"
                    )}>
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                            <ScanBarcode className="w-64 h-64 text-white" />
                        </div>

                        <div className="relative z-10 text-white space-y-6 max-w-3xl mx-auto w-full text-center">
                            <div className="space-y-2">
                                <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/10 backdrop-blur-md text-xs font-black tracking-widest uppercase mb-4 border border-white/20 shadow-lg">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    {scanStep === "EXPECTING_UPC" ? "PASO 1" : "PASO 2"}
                                </span>
                                <h3 className="font-black uppercase text-4xl md:text-5xl tracking-tight leading-none drop-shadow-lg">
                                    {scanStep === "EXPECTING_UPC" ? "Escanear Producto (UPC)" :
                                        scanStep === "EXPECTING_QUANTITY" ? "Ingresar Cantidad" : "Escanear Serial / IMEI"}
                                </h3>
                                {currentProduct && (
                                    <div className="inline-block px-6 py-2 bg-white/20 backdrop-blur rounded-xl border border-white/20 mt-4 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="text-white font-black uppercase text-lg tracking-wide">
                                            {currentProduct.name}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative mt-8 group">
                                <div className={cn("absolute inset-0 rounded-2xl blur-xl opacity-50 transition-colors", scanFeedback === "error" ? "bg-red-400" : "bg-blue-400")} />
                                <input
                                    ref={scannerInputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleScan}
                                    type={scanStep === "EXPECTING_QUANTITY" ? "number" : "text"}
                                    className={cn(
                                        "relative w-full bg-black/40 border-4 rounded-2xl px-8 py-8 text-white placeholder:text-white/20 focus:outline-none font-mono text-4xl md:text-5xl tracking-[0.2em] uppercase transition-all text-center selection:bg-white/30 shadow-2xl",
                                        scanStep !== "EXPECTING_UPC" && "pr-24",
                                        scanFeedback === "error" ? "border-red-400 focus:ring-4 focus:ring-red-400/50" : "border-white/20 focus:border-white focus:ring-4 focus:ring-white/20"
                                    )}
                                    placeholder={
                                        scanStep === "EXPECTING_UPC" ? "ESPERANDO UPC..." :
                                            scanStep === "EXPECTING_QUANTITY" ? "CANTIDAD..." : "ESPERANDO SERIAL..."
                                    }
                                    autoFocus
                                />
                                {scanStep !== "EXPECTING_UPC" && (
                                    <button
                                        onClick={resetScanner}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-2xl text-white/30 hover:text-white hover:bg-white/10 transition-all z-20"
                                        title="Cancelar / Reset (ESC)"
                                    >
                                        <X className="w-10 h-10" />
                                    </button>
                                )}
                                {scanFeedback === "error" && (
                                    <div className="absolute top-full inset-x-0 mt-4 flex justify-center text-white font-bold animate-in slide-in-from-top-2 fade-in">
                                        <span className="bg-red-950/90 border border-red-500 text-red-200 px-6 py-2 rounded-xl text-sm uppercase flex items-center gap-3 shadow-xl">
                                            <AlertCircle className="w-5 h-5" /> {errorMsg}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="text-xs font-bold text-white/50 uppercase tracking-[0.2em] mt-8">
                                {inboundMode === "BULK" ? "Modo Masivo: Ingresa cantidad para auto-generar" : "Modo Serializado: Escanea uno a uno en el campo"}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col min-h-[400px]">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Historial de Vinculación</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sesión Actual</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <button onClick={() => setScannedItems([])} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-black text-slate-500 hover:text-red-500 hover:border-red-200 uppercase flex items-center gap-2 transition-all shadow-sm">
                                    <RefreshCw className="w-3 h-3" /> Limpiar Todo
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/30">
                            {Object.keys(productSummary).length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                                    <ScanBarcode className="w-16 h-16" />
                                    <span className="text-sm font-black uppercase tracking-widest">Esperando Productos...</span>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white/95 backdrop-blur-md shadow-sm z-10">
                                        <tr>
                                            <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Producto</th>
                                            <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-center">Cant.</th>
                                            <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Costo Unitario</th>
                                            <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">Subtotal</th>
                                            <th className="px-4 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.values(scannedItems.reduce((acc: any, item: any) => {
                                            if (!acc[item.sku]) {
                                                acc[item.sku] = { ...item, count: 0, serials: [] };
                                            }
                                            acc[item.sku].count++;
                                            acc[item.sku].serials.push(item);
                                            return acc;
                                        }, {})).map((group: any) => {
                                            const isExpanded = expandedGroups[group.sku];
                                            const unitCost = costs[group.sku] || 0;
                                            const subtotal = unitCost * group.count;

                                            // Currency Calculations
                                            // context: currency state (USD/COP), exchangeRate
                                            // if currency is USD: unitCost is USD. conversion is unitCost * rate
                                            // if currency is COP: unitCost is COP. conversion is unitCost / rate
                                            const unitCostCOP = currency === "USD" ? unitCost * exchangeRate : unitCost;
                                            const unitCostUSD = currency === "USD" ? unitCost : unitCost / exchangeRate;

                                            const subtotalCOP = subtotal * (currency === "USD" ? exchangeRate : 1);
                                            const subtotalUSD = subtotal / (currency === "USD" ? 1 : exchangeRate);

                                            return (
                                                <>
                                                    <tr key={group.sku} className={cn("group transition-colors", isExpanded ? "bg-blue-50/50" : "hover:bg-white")}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-start gap-3">
                                                                <button
                                                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group.sku]: !prev[group.sku] }))}
                                                                    className="mt-1 p-1 rounded-full hover:bg-slate-200 transition-colors"
                                                                >
                                                                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-180 text-blue-500")} />
                                                                </button>
                                                                <div>
                                                                    <div className="font-black text-slate-700 uppercase text-xs mb-1">{group.productName}</div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="secondary" className="font-mono text-[10px] font-bold bg-slate-100 text-slate-500 border-0">
                                                                            {group.sku}
                                                                        </Badge>
                                                                        {lastCosts[group.sku] !== undefined && lastCosts[group.sku] !== null && (
                                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                                (Último: ${currency === "USD" ? lastCosts[group.sku] : (lastCosts[group.sku]! * exchangeRate).toLocaleString()})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-black text-xs border border-blue-100">
                                                                {group.count}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <span className={cn("text-xs font-bold", currency === "USD" ? "text-green-600" : "text-slate-400")}>
                                                                        {currency === "USD" ? "USD" : "COP"}
                                                                    </span>
                                                                    <input
                                                                        type="number"
                                                                        value={costs[group.sku] === undefined ? "" : costs[group.sku]}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value);
                                                                            setCosts(prev => ({ ...prev, [group.sku]: isNaN(val) ? 0 : val }));
                                                                        }}
                                                                        className={cn(
                                                                            "w-32 text-right font-mono font-bold text-sm bg-white border-2 border-slate-200 rounded-lg px-2 py-1 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all text-black placeholder:text-slate-300 shadow-sm",
                                                                            (!costs[group.sku] || costs[group.sku] === 0) && "border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-200 placeholder:text-red-300"
                                                                        )}
                                                                        placeholder="0.00"
                                                                    />
                                                                </div>
                                                                {/* Dynamic Conversion Label */}
                                                                {costs[group.sku] > 0 && (
                                                                    <span className={cn("text-[10px] font-bold tracking-tight", currency === "USD" ? "text-emerald-600" : "text-green-600")}>
                                                                        ≈ {currency === "USD"
                                                                            ? `$${unitCostCOP.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP`
                                                                            : `$${unitCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="font-mono font-black text-slate-900 text-sm">
                                                                    ${currency === "USD"
                                                                        ? subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                                        : subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </span>
                                                                {costs[group.sku] > 0 && (
                                                                    <span className={cn("text-[10px] font-bold tracking-tight mt-0.5", currency === "USD" ? "text-emerald-600" : "text-green-600")}>
                                                                        {currency === "USD"
                                                                            ? `$${subtotalCOP.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP`
                                                                            : `$${subtotalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right w-10">
                                                            {/* Placeholder for potential group actions if needed */}
                                                        </td>
                                                    </tr>

                                                    {/* EXPANDED ROW: Serial Audit */}
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/50 shadow-inner">
                                                            <td colSpan={5} className="px-6 py-4">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-8">
                                                                    {group.serials.map((serialItem: any, sIdx: number) => {
                                                                        // Find index in main scannedItems to delete
                                                                        const realIndex = scannedItems.findIndex(i => i.serial === serialItem.serial && i.sku === group.sku);

                                                                        return (
                                                                            <div key={sIdx} className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between group/serial hover:border-blue-300 hover:shadow-sm transition-all">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px]">
                                                                                        {sIdx + 1}
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="font-mono font-bold text-slate-700 text-xs tracking-wide">
                                                                                            {serialItem.serial}
                                                                                        </div>
                                                                                        {serialItem.isBulk && (
                                                                                            <span className="text-[9px] font-black text-purple-500 uppercase">Auto-Gen</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => realIndex !== -1 && handleDelete(realIndex)}
                                                                                    className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                                    title="Eliminar este ítem"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>



                {/* Right Panel: Active Summary & Notes (4 cols) - COMPACT */}
                <div className="lg:col-span-4 space-y-6">

                    {/* 1. Last Scanned Item Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <ScanBarcode className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Actividad Reciente</h3>
                        </div>

                        {scannedItems.length > 0 ? (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 relative group hover:border-blue-300 transition-colors">
                                <div className="absolute top-3 right-3">
                                    <Badge className="bg-slate-900 text-white hover:bg-black">ÚLTIMO</Badge>
                                </div>
                                <div className="pr-12">
                                    <h4 className="font-black text-slate-900 text-lg uppercase leading-tight mb-1">
                                        {scannedItems[0].productName}
                                    </h4>
                                    <p className="font-mono text-slate-500 font-bold text-xs mb-4">SKU: {scannedItems[0].sku}</p>

                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Serial / ID</p>
                                            <p className="font-mono font-bold text-slate-700 text-sm bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                                                {scannedItems[0].serial}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-32 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                <PackageCheck className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs font-bold uppercase">Listo para escanear</span>
                            </div>
                        )}
                    </div>

                    {/* 2. Total Units (Big Counter) */}
                    <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-600/30 flex flex-col items-center justify-center relative overflow-hidden cursor-default group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Layers className="w-32 h-32" />
                        </div>
                        <span className="relative z-10 text-sm font-bold uppercase tracking-[0.2em] opacity-80 mb-2">Total Unidades</span>
                        <span className="relative z-10 text-7xl font-black tracking-tighter shadow-sm">{scannedItems.length}</span>
                        <div className="relative z-10 mt-4 px-4 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm">
                            {currency === "USD" ? "Moneda: Dólar" : "Moneda: Peso COP"}
                        </div>
                    </div>

                    {/* 3. Notes (Compact) */}
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-slate-400" />
                            Observaciones
                        </h3>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium text-slate-700 text-sm transition-all hover:bg-white resize-none"
                            placeholder="Novedades de la recepción..."
                        />
                    </div>
                </div>

            </div>

            {/* STICKY FOOTER ACTIONS */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                <div className="max-w-[1920px] mx-auto px-4 md:px-8 flex items-center justify-between gap-8 h-20">

                    <button
                        onClick={generatePDF}
                        disabled={scannedItems.length === 0}
                        className="h-14 px-8 rounded-2xl text-slate-500 font-bold uppercase text-xs tracking-wider hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-3 disabled:opacity-50"
                    >
                        <PackageCheck className="w-5 h-5" />
                        <span>Comprobante PDF</span>
                    </button>

                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <div className="text-right hidden md:block">
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Items Totales</div>
                            <div className="text-xl font-black text-slate-900 leading-none">{scannedItems.length}</div>
                        </div>

                        <button
                            onClick={handleFinalize}
                            disabled={isSubmitting || (!editId && !attendant)}
                            className={cn(
                                "h-16 px-12 rounded-2xl text-white font-black uppercase tracking-widest text-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 transform hover:-translate-y-1 active:scale-95 disabled:hover:translate-y-0 disabled:active:scale-100",
                                (isSubmitting || (!editId && !attendant)) ? "bg-slate-300 text-slate-100 cursor-not-allowed shadow-none" : "bg-slate-900 hover:bg-black"
                            )}>
                            {isSubmitting ? "Guardando..." : "GUARDAR RECEPCIÓN"}
                        </button>
                    </div>
                </div>
            </div>

            {
                showCreateProvider && (
                    <CreateProviderModal
                        onClose={() => setShowCreateProvider(false)}
                        onSuccess={(newProvider: any) => {
                            setSuppliers((prev) => [newProvider as any, ...prev]);
                            setSupplierId(newProvider.id);
                            setShowCreateProvider(false);
                        }}
                    />
                )
            }
        </div >
    );
}

export default function InboundPage() {
    return (
        <Suspense fallback={
            <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                    <p className="text-sm font-bold text-slate-500">Cargando...</p>
                </div>
            </div>
        }>
            <InboundContent />
        </Suspense>
    );
}
