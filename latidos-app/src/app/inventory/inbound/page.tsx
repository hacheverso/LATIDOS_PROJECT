"use client";
/* eslint-disable */

import { useState, useRef, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Save, PackageCheck, AlertCircle, Trash2, Search, Settings2, RefreshCw, ChevronDown, ScanBarcode, Box, Layers, X, SaveAll, Loader2, Volume2, VolumeX } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import Link from "next/link";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


import { getProductByUpc, createPurchase, searchProducts, getSuppliers, getLastProductCost, getPurchaseDetails, updatePurchase } from "@/app/inventory/actions";
import { getUsers } from "@/app/directory/team/actions";
import { useRouter, useSearchParams } from "next/navigation";
import CreateProviderModal from "@/components/directory/CreateProviderModal";

import QuickCreateProductModal from "@/app/inventory/components/QuickCreateProductModal";
import VerificationModal from "./components/VerificationModal";

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
    const [isMuted, setIsMuted] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showCreateProvider, setShowCreateProvider] = useState(false);
    const [showQuickCreateProduct, setShowQuickCreateProduct] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [pendingUpcForCreate, setPendingUpcForCreate] = useState("");

    const [mounted, setMounted] = useState(false);

    // --- PERSISTENCE LOGIC ---
    const [savedDraft, setSavedDraft, clearDraft] = useLocalStorage<any>("LATIDOS_INBOUND_SESSION_V1", null);

    // 1. Load Draft on Mount
    useEffect(() => {
        setMounted(true); // Hydration fix

        // Check if we have a saved draft
        if (savedDraft && savedDraft.scannedItems && savedDraft.scannedItems.length > 0) {
            // We use a small timeout to let the UI settle or just run immediately.
            // Using window.confirm needs to happen after mount.
            const hasPending = window.confirm("Tienes un ingreso de mercancía pendiente. ¿Deseas continuar donde lo dejaste o empezar de nuevo?");

            if (hasPending) {
                // Restore State
                try {
                    setScannedItems(savedDraft.scannedItems || []);
                    setCosts(savedDraft.costs || {});
                    if (savedDraft.attendant) setAttendant(savedDraft.attendant);
                    if (savedDraft.supplierId) setSupplierId(savedDraft.supplierId);
                    if (savedDraft.notes) setNotes(savedDraft.notes);
                    if (savedDraft.isMuted !== undefined) setIsMuted(savedDraft.isMuted);
                    if (savedDraft.inboundMode) setInboundMode(savedDraft.inboundMode);
                    if (savedDraft.currency) setCurrency(savedDraft.currency);
                    if (savedDraft.exchangeRate) setExchangeRate(savedDraft.exchangeRate);
                    if (savedDraft.lastCosts) setLastCosts(savedDraft.lastCosts);

                    playSound("success");
                } catch (e) {
                    console.error("Error restoring draft", e);
                    clearDraft();
                }
            } else {
                // Discard
                clearDraft();
            }
        }
    }, []); // Only run once on mount

    // 2. Autosave
    useEffect(() => {
        // Only save if we have items or at least some meaningful data entered
        if (mounted && (scannedItems.length > 0 || attendant || (supplierId && supplierId !== ''))) {
            const draft = {
                scannedItems,
                costs,
                attendant,
                supplierId,
                notes,
                isMuted,
                inboundMode,
                currency,
                exchangeRate,
                lastCosts,
                updatedAt: Date.now()
            };
            setSavedDraft(draft);
        }
    }, [scannedItems, costs, attendant, supplierId, notes, inboundMode, currency, exchangeRate, lastCosts, mounted, isMuted]);

    // 3. Prevent Exit
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (scannedItems.length > 0) {
                const msg = "¿Estás seguro de que quieres salir? Tienes cambios sin guardar en la recepción de mercancía";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [scannedItems]);

    useEffect(() => {
        getSuppliers().then(setSuppliers);
        getUsers().then(setTeamMembers);

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
            // IGNORE if modal is open (Modal handles its own keys)
            if (showQuickCreateProduct) return;

            if (e.key === "F1") {
                e.preventDefault();
                handleModeSwitch("SERIALIZED");
                playSound("click");
            } else if (e.key === "F2") {
                e.preventDefault();
                setInboundMode("BULK");
                handleModeSwitch("BULK");
                playSound("click");
            } else if (e.key === "Escape") {
                e.preventDefault();

                // Smart Escape: If showing an error (like "UPC NOT FOUND"), just clear it silently
                if (scanFeedback === "error" || errorMsg) {
                    setErrorMsg("");
                    setScanFeedback("idle");
                    setInputValue("");

                    // Focus back to input
                    setTimeout(() => scannerInputRef.current?.focus(), 50);
                    return;
                }

                resetScanner();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [playSound, resetScanner, currentProduct, scanFeedback, errorMsg, showQuickCreateProduct]); // Added showQuickCreateProduct dep

    const handleModeSwitch = (mode: "SERIALIZED" | "BULK") => {
        setInboundMode(mode);
        // If we have a product selected, we need to switch the step and clear input
        if (currentProduct) {
            setScanStep(mode === "BULK" ? "EXPECTING_QUANTITY" : "EXPECTING_SERIAL");
            setInputValue("");
            // Focus will be handled by useEffect
        }
    };

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
        // PRIORITY: If Error is "UPC NOT FOUND" and User hits Enter -> OPEN MODAL
        // Allows proceeding even if input is not empty (contains the bad UPC)
        if (e.key === 'Enter' && scanFeedback === 'error' && errorMsg === "UPC NO ENCONTRADO") {
            e.preventDefault();
            e.stopPropagation();
            setShowQuickCreateProduct(true);
            return;
        }

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
                        // UPC NOT FOUND -> Trigger "Create?"
                        setScanFeedback("error");
                        setErrorMsg("UPC NO ENCONTRADO");
                        playSound("error");
                        // Don't clear input value immediately so user can see what they scanned
                        // Or better, keep it in a temp buffer
                        setPendingUpcForCreate(scannedValue);
                        // setInputValue(""); // Optional: keep it or clear it. If we clear, quick create uses pendingUpcForCreate.
                        // Wait user interaction for creation
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
        } else if (e.key === 'Enter' && scanFeedback === 'error' && errorMsg === "UPC NO ENCONTRADO") {
            // Smart UX: If error is "Not Found" and user hits Enter again, trigger creation
            e.preventDefault();
            setShowQuickCreateProduct(true);
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
            alert(`⛔ ERROR DE VALIDACIÓN: \n\nHay ${zeroCostItems.length} items con Costo $0 o vacío.\n\nPor favor ingrese el costo para: ${zeroCostItems.map(i => i.sku).join(", ")}`);
            return; // STOP. No saving allowed.
        }

        setShowVerificationModal(true);
    };

    const confirmFinalize = async () => {
        setShowVerificationModal(false);
        setIsSubmitting(true);
        try {
            const itemsToSave = scannedItems.map(item => {
                const userCost = Number(costs[item.sku] || 0);
                console.log(`[handleFinalize] SKU: ${item.sku}, User Cost in State: ${costs[item.sku]}, Final User Cost: ${userCost}`);

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
                    instanceId: item.instanceId || (item as any).id, // Robust fallback for instance mapping
                    sku: item.sku,
                    serial: item.serial,
                    productId: item.productId,
                    cost: finalCost,
                    originalCost: userCost // Pass what the user sees/typed
                };
            });

            console.log("Submitting Payload to Server:", itemsToSave);

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

            clearDraft(); // Clear LocalStorage
            setScannedItems([]);
            setIsSubmitting(false);
            // Force hard reload to ensure data freshness
            window.location.href = "/inventory/purchases";
            // router.push("/inventory/purchases");

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


    // --- TTS & FEEDBACK EFFECTS ---
    useEffect(() => {
        if (scanFeedback === "success") {
            // Flash Green handled by UI classes
        }
    }, [scanFeedback]);

    // TTS Effect
    useEffect(() => {
        if (!isMuted && currentProduct && scanStep !== "EXPECTING_UPC" && scanFeedback === "click") {
            // Cancel previous speech to avoid queueing
            window.speechSynthesis.cancel();

            const text = `${currentProduct.name} detectado. Escanee Serial.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "es-ES";
            utterance.rate = 1.1;
            utterance.pitch = 1;

            window.speechSynthesis.speak(utterance);
        }
    }, [currentProduct?.id, scanStep, scanFeedback, isMuted]);


    // GROUPING LOGIC
    // Sort groups by their appearance in the scannedItems list (which is Newest First)
    const groupedItemsMap = scannedItems.reduce((acc: any, item: any, index: number) => {
        if (!acc[item.sku]) {
            acc[item.sku] = { ...item, count: 0, serials: [], firstIndex: index };
        }
        acc[item.sku].count++;
        acc[item.sku].serials.push(item);
        return acc;
    }, {});

    const groupedItems = Object.values(groupedItemsMap).sort((a: any, b: any) => a.firstIndex - b.firstIndex);


    return (
        <div className={cn(
            "w-full min-h-screen pb-20 transition-colors duration-500",
            scanFeedback === "success" ? "bg-green-500/10" :
                scanFeedback === "error" ? "bg-red-500/10" : ""
        )}>
            {/* FULL SCREEN FLASH OVERLAY */}
            <div className={cn(
                "fixed inset-0 z-[100] pointer-events-none transition-opacity duration-300",
                scanFeedback === "success" ? "opacity-30 bg-green-500 mix-blend-overlay" :
                    scanFeedback === "error" ? "opacity-30 bg-red-500 mix-blend-overlay" : "opacity-0"
            )} />

            <div className="px-4 md:px-8 pt-6 space-y-6">

                {/* Header & Config */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Link href="/inventory" className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 shadow-sm">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <PackageCheck className="w-8 h-8 text-blue-600" />
                                Recepción Inteligente
                            </h1>
                            <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className="border-slate-300 text-slate-500">
                                    {suppliers.find(s => s.id === supplierId)?.name || "Proveedor NO Seleccionado"}
                                </Badge>
                                <Badge variant="outline" className="border-slate-300 text-slate-500">
                                    {attendant ? attendant.replace("_", " ") : "Encargado NO Seleccionado"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Quick Config Bar */}
                    <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                        <select
                            value={supplierId}
                            onChange={(e) => {
                                if (e.target.value === "NEW_PROVIDER_TRIGGER") { setShowCreateProvider(true); setSupplierId(""); }
                                else setSupplierId(e.target.value);
                            }}
                            className="h-10 bg-slate-50 border-transparent rounded-xl px-3 font-bold text-slate-700 text-xs uppercase focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Proveedor...</option>
                            <option value="NEW_PROVIDER_TRIGGER">+ Crear</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>

                        <select
                            value={attendant}
                            onChange={(e) => setAttendant(e.target.value)}
                            className="h-10 bg-slate-50 border-transparent rounded-xl px-3 font-bold text-slate-700 text-xs uppercase focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Encargado...</option>
                            {teamMembers.map(user => (
                                <option key={user.id} value={user.name}>{user.name}</option>
                            ))}
                        </select>

                        <div className="h-8 w-px bg-slate-200 mx-2" />

                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-all border", isMuted ? "bg-slate-100 border-slate-200 text-slate-400" : "bg-white border-blue-200 text-blue-600 shadow-sm")}
                            title={isMuted ? "Activar Voz" : "Silenciar Voz"}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>

                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setCurrency("USD")} className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", currency === "USD" ? "bg-white shadow text-green-700" : "text-slate-400")}>USD</button>
                            <button onClick={() => setCurrency("COP")} className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", currency === "COP" ? "bg-white shadow text-green-700" : "text-slate-400")}>COP</button>
                        </div>
                        {currency === "USD" && (
                            <input
                                type="number"
                                value={exchangeRate}
                                onChange={e => setExchangeRate(Number(e.target.value))}
                                className="w-24 h-10 bg-slate-50 border-0 rounded-xl px-3 font-mono font-bold text-slate-900 text-sm text-right"
                                placeholder="TRM"
                            />
                        )}
                    </div>
                </div>

                {/* MAIN SPLIT LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">

                    {/* LEFT COLUMN (70%) - SCANNER AREA */}
                    <div className="lg:col-span-8 flex flex-col gap-6">

                        {/* TOP: TOTAL & MODE */}
                        <div className="grid grid-cols-12 gap-6">
                            {/* Giant Total Indicator */}
                            <div className="col-span-12 md:col-span-8 bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 flex items-center justify-between relative overflow-hidden">
                                <div className="absolute -right-6 -bottom-10 opacity-20 transform rotate-12">
                                    <Layers className="w-40 h-40" />
                                </div>
                                <div>
                                    <span className="block text-blue-200 font-bold uppercase tracking-widest text-xs mb-1">Total Ingresado</span>
                                    <span className="text-6xl md:text-7xl font-black tracking-tighter leading-none">{scannedItems.length}</span>
                                </div>
                                <div className="text-right z-10">
                                    <div className="text-lg md:text-2xl font-black opacity-90 uppercase">Unidades</div>
                                    <div className="text-xs font-medium text-blue-200 mt-1 bg-blue-700/50 px-3 py-1 rounded-full inline-block">
                                        {currency} Mode
                                    </div>
                                </div>
                            </div>

                            {/* Mode Toggle (Compact) */}
                            <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
                                <button
                                    onClick={() => handleModeSwitch("SERIALIZED")}
                                    className={cn("flex-1 rounded-2xl border-2 flex items-center px-6 gap-3 transition-all", inboundMode === "SERIALIZED" ? "bg-white border-blue-600 text-blue-700 shadow-lg" : "bg-slate-50 border-transparent text-slate-400")}
                                >
                                    <ScanBarcode className="w-6 h-6" />
                                    <div className="text-left">
                                        <div className="font-black uppercase text-sm">Serializado</div>
                                        <div className="text-[10px] font-bold opacity-60">UNO A UNO (F1)</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleModeSwitch("BULK")}
                                    className={cn("flex-1 rounded-2xl border-2 flex items-center px-6 gap-3 transition-all", inboundMode === "BULK" ? "bg-white border-emerald-500 text-emerald-700 shadow-lg" : "bg-slate-50 border-transparent text-slate-400")}
                                >
                                    <Layers className="w-6 h-6" />
                                    <div className="text-left">
                                        <div className="font-black uppercase text-sm">Masivo</div>
                                        <div className="text-[10px] font-bold opacity-60">POR CANTIDAD (F2)</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* MAIN SCANNER CARD - MAXIMIZE HEIGHT */}
                        <div className={cn(
                            "flex-1 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-center border-[6px] transition-all duration-300 min-h-[500px]",
                            scanFeedback === "error" ? "bg-red-600 border-red-500" :
                                scanStep === "EXPECTING_UPC" ? "bg-slate-900 border-slate-800" :
                                    inboundMode === "BULK" ? "bg-emerald-600 border-emerald-500" : "bg-blue-600 border-blue-500"
                        )}>
                            {/* Product Name Display - MASSIVE & CENTERED */}
                            <div className="absolute top-12 inset-x-0 text-center px-8 z-20">
                                {currentProduct ? (
                                    <div className="animate-in zoom-in-50 duration-300 relative inline-block">
                                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase drop-shadow-xl leading-tight">
                                            {currentProduct.name}
                                        </h2>
                                        <p className="text-white/70 font-mono font-bold text-xl md:text-2xl mt-2 tracking-widest">{currentProduct.upc}</p>

                                        <button
                                            onClick={resetScanner}
                                            className="absolute -right-12 top-0 text-white/40 hover:text-white p-2 rounded-full hover:bg-white/20 transition-all"
                                            title="Cancelar / Escanear otro"
                                        >
                                            <X className="w-8 h-8" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="opacity-30">
                                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest text-center">Esperando UPC...</h2>
                                    </div>
                                )}
                            </div>

                            {/* Center Input Area */}
                            <div className="relative z-10 w-full max-w-4xl mx-auto px-4 md:px-8 py-20 flex flex-col items-center">
                                <input
                                    ref={scannerInputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleScan}
                                    type={scanStep === "EXPECTING_QUANTITY" ? "number" : "text"}
                                    className={cn(
                                        "w-full bg-transparent border-b-4 border-white/30 text-center font-black text-[3rem] md:text-[5rem] lg:text-[6rem] leading-none text-white placeholder:text-white/20 outline-none uppercase tracking-wider transition-all",
                                        "focus:border-white focus:placeholder:text-white/10"
                                    )}
                                    placeholder={
                                        scanStep === "EXPECTING_UPC" ? "" :
                                            scanStep === "EXPECTING_QUANTITY" ? "CANT..." : "SERIAL..."
                                    }
                                    autoFocus
                                />
                                {scanFeedback === "error" && errorMsg && (
                                    <div className="mt-8 text-center animate-bounce">
                                        <span className="bg-white text-red-600 text-xl md:text-3xl font-black px-8 py-4 rounded-full shadow-xl uppercase inline-flex items-center gap-3">
                                            <AlertCircle className="w-8 h-8" /> {errorMsg === "UPC NO ENCONTRADO" ? " NO ENCONTRADO" : errorMsg}
                                        </span>
                                        {errorMsg === "UPC NO ENCONTRADO" && (
                                            <div className="mt-4 text-white font-bold opacity-90 text-xl">Presiona ENTER para crear</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bottom Hints */}
                            <div className="absolute bottom-10 inset-x-0 text-center text-white/40 font-bold uppercase tracking-[0.2em] text-xs md:text-sm">
                                {scanStep === "EXPECTING_UPC" ? "Paso 1: Identificar Producto" : "Paso 2: Capturar Unicidad"}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN (30%) - HISTORY LIST */}
                    <div className="lg:col-span-4 flex flex-col h-full bg-slate-50 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[calc(100vh-140px)] sticky top-6">
                        <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center z-10 shadow-sm relative">
                            <h3 className="font-black text-slate-800 uppercase text-lg tracking-tight">Historial Reciente</h3>
                            <button onClick={() => setScannedItems([])} className="text-slate-400 hover:text-red-500 transition-colors p-2">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-slate-100/50">
                            {groupedItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60 min-h-[300px]">
                                    <Layers className="w-16 h-16 mb-4" />
                                    <p className="font-bold uppercase text-sm">Sin movimientos</p>
                                </div>
                            ) : (
                                groupedItems.map((group: any) => {
                                    const isTop = group === groupedItems[0]; // Is this the newest group modified?

                                    return (
                                        <div key={group.sku} className={cn(
                                            "bg-white rounded-3xl p-5 shadow-lg border-2 transition-all duration-500 animate-in slide-in-from-top-4",
                                            isTop ? "border-blue-500 ring-4 ring-blue-500/10 scale-100" : "border-transparent opacity-80 hover:opacity-100"
                                        )}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1">
                                                    <h4 className="font-black text-slate-800 text-lg uppercase leading-tight mb-1 line-clamp-2">
                                                        {group.productName}
                                                    </h4>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-mono text-[10px] font-bold">
                                                            {group.sku}
                                                        </Badge>
                                                        {group.firstIndex !== undefined && (
                                                            <span className="text-[10px] font-mono text-slate-300">#{group.firstIndex + 1}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* VIBRANT COUNT BADGE */}
                                                <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-600/30 ml-3 shrink-0">
                                                    <span className="text-[10px] font-black uppercase opacity-70">CANT</span>
                                                    <span className="text-2xl font-black leading-none">{group.count}</span>
                                                </div>
                                            </div>

                                            {/* Serial List (All - Reverse Chronological) */}
                                            {group.serials.length > 0 && !group.isBulk && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {group.serials.map((s: any, idx: number) => {
                                                        const isLastScanned = scannedItems.length > 0 && s === scannedItems[0];
                                                        return (
                                                            <div key={idx} className={cn(
                                                                "relative group/tag flex items-center gap-1 border px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all select-none",
                                                                isLastScanned
                                                                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                                                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                                                            )}>
                                                                <span>{s.serial}</span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const globalIndex = scannedItems.indexOf(s);
                                                                        if (globalIndex !== -1) handleDelete(globalIndex);
                                                                    }}
                                                                    className={cn(
                                                                        "ml-1.5 -mr-1 p-0.5 rounded-full transition-all opacity-50 group-hover/tag:opacity-100",
                                                                        isLastScanned
                                                                            ? "hover:bg-blue-500 text-blue-100"
                                                                            : "hover:bg-red-100 hover:text-red-500 text-slate-400"
                                                                    )}
                                                                    title="Eliminar serial"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Cost Input for Group */}
                                            {/* Cost Input for Group */}
                                            {/* Cost Input for Group */}
                                            <div className="mt-4 pt-3 border-t border-slate-100">
                                                <div className="flex items-center justify-between gap-3">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Costo Unit ({currency})</label>
                                                    <input
                                                        type="number"
                                                        value={costs[group.sku] === undefined || costs[group.sku] === 0 ? "" : costs[group.sku]}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            setCosts(prev => ({ ...prev, [group.sku]: isNaN(val) ? 0 : val }));
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                        disabled={currency === "USD" && (!exchangeRate || exchangeRate <= 0)}
                                                        className={cn(
                                                            "w-32 bg-slate-50 border rounded-lg px-2 py-1 text-right font-mono font-black text-sm outline-none transition-all placeholder:text-slate-300 text-slate-900",
                                                            "focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                                                            "disabled:opacity-50 disabled:cursor-not-allowed",
                                                            // Warning if cost is higher than last time
                                                            lastCosts[group.sku] && costs[group.sku] > lastCosts[group.sku]! ? "border-orange-300 bg-orange-50" : "border-slate-200"
                                                        )}
                                                        placeholder={currency === "USD" && (!exchangeRate || exchangeRate <= 0) ? "SIN TRM" : "0"}
                                                        style={{ MozAppearance: "textfield" }} // Hide spinner Firefox
                                                    />
                                                </div>

                                                {/* LIVE CONVERSION & HISTORY PREVIEW */}
                                                <div className="flex justify-end items-center gap-2 mt-1 animate-in slide-in-from-top-1 fade-in duration-300">

                                                    {/* 1. Last Cost Reference (Visual Comparator) */}
                                                    {lastCosts[group.sku] && lastCosts[group.sku]! > 0 && (
                                                        (() => {
                                                            const currentCostCOP = currency === "USD"
                                                                ? (costs[group.sku] || 0) * exchangeRate
                                                                : (costs[group.sku] || 0);

                                                            const lastCost = lastCosts[group.sku]!;
                                                            const diff = currentCostCOP - lastCost;
                                                            const isUp = diff > 0;
                                                            const isDown = diff < 0;

                                                            // Only show comparison if we have a current cost entered
                                                            if (!costs[group.sku]) return null;

                                                            return (
                                                                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 text-blue-600 bg-blue-50 border-blue-100">
                                                                    <span>Último: ${lastCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                    {isUp && <span className="text-red-500">↑</span>}
                                                                    {isDown && <span className="text-blue-500">↓</span>}
                                                                </div>
                                                            );
                                                        })()
                                                    )}

                                                    {/* 2. Live Conversion Label (Dynamic Color) */}
                                                    {currency === "USD" && costs[group.sku] > 0 && exchangeRate > 0 && (
                                                        (() => {
                                                            const currentCOP = costs[group.sku] * exchangeRate;
                                                            const lastCost = lastCosts[group.sku] || 0;
                                                            const hasHistory = lastCost > 0;

                                                            let colorClass = "text-slate-500 bg-slate-50 border-slate-100"; // Neutral default

                                                            if (hasHistory) {
                                                                if (currentCOP < lastCost) colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100"; // Cheaper
                                                                else if (currentCOP > lastCost) colorClass = "text-red-600 bg-red-50 border-red-100"; // More Expensive
                                                            } else {
                                                                // No history -> Default Greenish? Or neutral? User said "Dynamic based on comparison".
                                                                // If no history, maybe neutral or standard green to indicate "Valid". 
                                                                // Let's stick to standard Emerald for "New/No History" as it implies value validity.
                                                                colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
                                                            }

                                                            return (
                                                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors", colorClass)}>
                                                                    ≈ $ {currentCOP.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP
                                                                </span>
                                                            );
                                                        })()
                                                    )}
                                                </div>

                                                {/* Webkit spinner hide via global CSS or inline class if supported utility exists, else inline style */}
                                                <style jsx>{`
                                                    input[type=number]::-webkit-inner-spin-button, 
                                                    input[type=number]::-webkit-outer-spin-button { 
                                                        -webkit-appearance: none; 
                                                        margin: 0; 
                                                    }
                                                 `}</style>
                                            </div>

                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* FLOATING ACTION BUTTON (SAVE) */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={handleFinalize}
                    disabled={scannedItems.length === 0}
                    className="h-20 w-20 md:w-auto md:px-8 bg-black hover:bg-slate-900 text-white rounded-full shadow-2xl shadow-black/40 flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    <Save className="w-8 h-8" />
                    <span className="hidden md:inline font-black uppercase text-lg tracking-widest">Guardar</span>
                </button>
            </div>

            {/* Keeping Modals */}
            {showCreateProvider && (
                <CreateProviderModal
                    onClose={() => setShowCreateProvider(false)}
                    onSuccess={(newProvider: any) => {
                        setSuppliers((prev) => [newProvider as any, ...prev]);
                        setSupplierId(newProvider.id);
                        setShowCreateProvider(false);
                    }}
                />
            )}
            {showQuickCreateProduct && (
                <QuickCreateProductModal
                    prefilledUpc={pendingUpcForCreate}
                    onClose={() => {
                        setShowQuickCreateProduct(false);
                        setPendingUpcForCreate("");
                        // Silent Reset
                        setErrorMsg("");
                        setScanFeedback("idle");
                        setInputValue("");
                        setTimeout(() => scannerInputRef.current?.focus(), 100);
                    }}
                    onSuccess={(newProduct) => {
                        setShowQuickCreateProduct(false);
                        setPendingUpcForCreate("");
                        setCurrentProduct(newProduct);
                        setScanStep(inboundMode === "BULK" ? "EXPECTING_QUANTITY" : "EXPECTING_SERIAL");
                        setScanFeedback("success");
                        setErrorMsg("PRODUCTO CREADO");
                        playSound("success");
                        setInputValue("");
                        setTimeout(() => scannerInputRef.current?.focus(), 100);
                    }}
                />
            )}

            <VerificationModal
                isOpen={showVerificationModal}
                onClose={() => setShowVerificationModal(false)}
                onConfirm={confirmFinalize}
                totalUnits={scannedItems.length}
                currency={currency}

                // Calculate Total Last Cost (Sum of all Last Costs for scanned items)
                totalLastCost={scannedItems.reduce((acc, item) => {
                    // We need to assume the same "last cost" for all items of same SKU in this batch?
                    // scannedItems is array of objects.
                    return acc + (lastCosts[item.sku] || 0);
                }, 0)}

                // If in USD, calculate COP. If in COP, totalCostUSD is actually COP so we need logic separation?
                // Logic in handleFinalize was: totalPayloadCost = SUM(Number(costs[item.sku] || 0))
                // If currency == USD, costs[] are USD. totalCostUSD is correct. totalCostCOP = total * exchangeRate.
                // If currency == COP, costs[] are COP. totalCostUSD is actually COP (misnomer prop name but let's fix logic).
                // Let's pass 'totalRawCost' and logic is inside Modal or we just calculating here.
                // The Modal expects totalCostUSD and totalCostCOP.
                // Logic Upgrade:
                totalCostCOP={
                    currency === "USD"
                        ? scannedItems.reduce((acc, item) => acc + (costs[item.sku] || 0), 0) * exchangeRate
                        : scannedItems.reduce((acc, item) => acc + (costs[item.sku] || 0), 0)
                }
                // Refine USD prop to ONLY show if currency is USD
                totalCostUSD={
                    currency === "USD"
                        ? scannedItems.reduce((acc, item) => acc + (costs[item.sku] || 0), 0)
                        : 0 // Irrelevant if COP
                }
            />
        </div>
    );
}

export default function InboundPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-slate-50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>}>
            <InboundContent />
        </Suspense>
    );
}
