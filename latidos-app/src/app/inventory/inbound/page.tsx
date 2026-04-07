"use client";
/* eslint-disable */

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import BulkSerialModal from "./components/BulkSerialModal";
import dynamic from "next/dynamic";
const BarcodeScanner = dynamic(() => import("./components/BarcodeScanner"), { ssr: false });
import { Badge } from "@/components/ui/Badge";
import { PinValidationModal } from "@/components/auth/PinValidationModal";





import { ArrowLeft, Save, PackageCheck, AlertCircle, Trash2, Search, Settings2, RefreshCw, ChevronDown, ScanBarcode, Box, Layers, X, SaveAll, Loader2, Volume2, VolumeX, Sparkles, Camera } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import Link from "next/link";
import { cn, sanitizeSerial } from "@/lib/utils";

import { toast } from "sonner";


import { getProductByUpc, createPurchase, searchProducts, getSuppliers, getLastProductCost, getPurchaseDetails, updatePurchase } from "@/app/inventory/actions";
import { getSettings } from "@/app/settings/actions";
import { getUsers } from "@/app/directory/team/actions";
import { useRouter, useSearchParams } from "next/navigation";
import CreateProviderModal from "@/components/directory/CreateProviderModal";

import QuickCreateProductModal from "@/app/inventory/components/QuickCreateProductModal";
import VerificationModal from "./components/VerificationModal";

type ScanStep = "EXPECTING_UPC" | "EXPECTING_SERIAL" | "EXPECTING_QUANTITY";



function InboundContent() {
    // State
    const [inboundMode, setInboundMode] = useState<"SERIALIZED" | "BULK">("SERIALIZED");
    const [currency, setCurrency] = useState<"COP" | "USD">("COP"); // default overridden from settings on mount
    const [exchangeRate, setExchangeRate] = useState(4000);

    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    // Load default currency from organization settings
    useEffect(() => {
        getSettings().then((s: any) => {
            if (s?.inboundCurrency === "USD" || s?.inboundCurrency === "COP") {
                setCurrency(s.inboundCurrency);
            }
        }).catch(() => {}); // silent — fallback stays COP
    }, []);

    const [scanStep, setScanStep] = useState<ScanStep>("EXPECTING_UPC");
    const [supplierId, setSupplierId] = useState("");
    // Use proper types or explicit any if temporary to fix build, but better to use unknowns or defined types
    const [currentProduct, setCurrentProduct] = useState<any | null>(null);
    const [scannedItems, setScannedItems] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [scanFeedback, setScanFeedback] = useState<"idle" | "success" | "error" | "click">("idle");
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [pendingBulkData, setPendingBulkData] = useState<{ qty: number; product: any } | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [costs, setCosts] = useState<Record<string, number>>({});
    const [lastCosts, setLastCosts] = useState<Record<string, number | null>>({});
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Fields
    const [attendant, setAttendant] = useState("");
    const [notes, setNotes] = useState("");
    const [isMuted, setIsMuted] = useState(false);

    // Operator Pin State
    const [showPinModal, setShowPinModal] = useState(false);
    const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
    const [selectedOperatorName, setSelectedOperatorName] = useState<string | null>(null);



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
    const [showScanner, setShowScanner] = useState(false);

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
        if (e.key === 'Enter' && inputValue) {
            e.preventDefault();
            const scannedValue = sanitizeSerial(inputValue.toUpperCase());

            // If empty, just return focus
            if (!scannedValue) return;

            setErrorMsg("");

            // ─── INPUT TYPE DETECTION HELPERS ─────────────────────────────
            // UPC: purely numeric, 6-15 digits (EAN-8, UPC-A, EAN-13, and internal codes)
            const looksLikeUPC = /^\d{6,15}$/.test(scannedValue);
            // Serial/IMEI: has at least one letter, OR is a 15-digit IMEI, OR is alphanumeric mix
            const hasLetters = /[a-zA-Z]/.test(scannedValue);
            const looksLikeSerial = hasLetters || (scannedValue.length === 15 && /^\d+$/.test(scannedValue));
            // Short numeric that's too short to be a UPC (like a quantity "5")
            const looksLikeQuantity = /^\d{1,5}$/.test(scannedValue) && scannedValue.length < 6;

            // ─── SMART RE-SCAN / GLOBAL UPC CHECK ─────────────────────────
            // If the user scans a UPC while we expect a serial/qty, switch to that product.
            if (scanStep !== "EXPECTING_UPC") {
                if (looksLikeUPC && scannedValue.length >= 8) {
                    try {
                        // Prevent Smart Re-scan if the user explicitly scans the exact same UPC as a Serial.
                        if (currentProduct?.upc !== scannedValue) {
                            const product = await getProductByUpc(scannedValue);
                            if (product) {
                                // IT IS A NEW UPC! Reset and start with this new product.
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
                                setErrorMsg("PRODUCTO CAMBIADO");
                                setTimeout(() => setErrorMsg(""), 1500);
                                return;
                            }
                        }
                    } catch (err) {
                        // Ignore error, proceed as normal input (it's just a numeric serial)
                    }
                }
            }

            if (scanStep === "EXPECTING_UPC") {
                // ─── VALIDATE: Must look like a UPC ──────────────────────
                if (hasLetters) {
                    // This is a serial, not a UPC — reject clearly
                    setScanFeedback("error");
                    setErrorMsg("⚠️ ESO ES UN SERIAL, NO UN UPC");
                    playSound("error");
                    setInputValue("");
                    return;
                }

                if (scannedValue.length < 6) {
                    setScanFeedback("error");
                    setErrorMsg("⚠️ CÓDIGO MUY CORTO PARA UPC");
                    playSound("error");
                    setInputValue("");
                    return;
                }

                if (!/^\d+$/.test(scannedValue)) {
                    setScanFeedback("error");
                    setErrorMsg("⚠️ UPC DEBE SER NUMÉRICO");
                    playSound("error");
                    setInputValue("");
                    return;
                }

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
                        setPendingUpcForCreate(scannedValue);
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

                // TRIGGER BULK MODAL INSTEAD OF IMMEDIATE CREATION
                setPendingBulkData({ qty, product: currentProduct });
                setShowBulkModal(true);
                setInputValue("");
                // Don't reset everything yet, wait for modal confirm

            } else {
                // ─── SERIAL MODE — VALIDATE ──────────────────────────────
                // Reject if it looks like a pure UPC and matches no known serial pattern
                if (looksLikeUPC && !looksLikeSerial && scannedValue !== currentProduct?.upc) {
                    // Pure numeric 8-13 digits that isn't the current product's UPC — likely scanned wrong barcode
                    setScanFeedback("error");
                    setErrorMsg("⚠️ ESO PARECE UN UPC, NO UN SERIAL");
                    playSound("error");
                    setInputValue("");
                    return;
                }

                if (scannedValue.length < 4) {
                    setScanFeedback("error");
                    setErrorMsg("⚠️ SERIAL MUY CORTO");
                    playSound("error");
                    setInputValue("");
                    return;
                }

                // Check for duplicate serial in current batch
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
                    imageUrl: currentProduct?.imageUrl,
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
        // --- CLIENT-SIDE VALIDATION ---
        if (scannedItems.length === 0) {
            toast.error("No hay productos escaneados. Escanea al menos un producto para continuar.");
            return;
        }
        if (!supplierId) {
            toast.error("Debes seleccionar un proveedor antes de guardar.");
            return;
        }

        // Warn about zero costs (but allow it — draft behavior)
        const skusWithZeroCost = Object.entries(productSummary)
            .filter(([sku]) => !costs[sku] || Number(costs[sku]) <= 0)
            .map(([, info]: [string, any]) => info.name);

        if (skusWithZeroCost.length > 0) {
            const proceed = window.confirm(
                `Los siguientes productos tienen costo $0:\n\n${skusWithZeroCost.join("\n")}\n\n¿Deseas continuar? Podrás editar los costos después.`
            );
            if (!proceed) return;
        }

        setShowVerificationModal(true);
    };

    const executePurchase = async (operatorIdToUse: string, operatorNameToUse?: string, pinToUse?: string) => {
        setIsSubmitting(true);
        try {
            const itemsToSave = scannedItems.map(item => {
                const userCost = Number(costs[item.sku] || 0);

                // USD mode: cost IS dollars, store directly. COP mode: cost IS pesos, store directly.
                const finalCost = userCost;
                return {
                    instanceId: item.instanceId || (item as any).id,
                    sku: item.sku,
                    serial: item.serial,
                    productId: item.productId,
                    cost: finalCost,
                    originalCost: userCost
                };
            });

            if (editId) {
                await updatePurchase(editId, supplierId, currency, exchangeRate, itemsToSave);
                toast.success("Recepción actualizada correctamente");
            } else {
                // Determine attendant name (Display) -> Prioritize Operator Name
                const attendantName = operatorNameToUse || selectedOperatorName || "OPERADOR VERIFICADO";

                // Pass PIN to createPurchase for Dual ID verification
                const res = await createPurchase(supplierId, currency, exchangeRate, itemsToSave, attendantName, notes, operatorIdToUse, pinToUse);
                if (res && 'success' in res && res.success === false) {
                    throw new Error(String(res.error));
                }
                toast.success("Recepción guardada correctamente");
            }

            clearDraft();
            setScannedItems([]);
            setIsSubmitting(false);
            router.push("/inventory/purchases");
            router.refresh();

        } catch (error) {
            // Humanize error messages — never show raw stack traces
            let msg = "Error desconocido al guardar la recepción.";
            if (error instanceof Error) {
                const raw = error.message;
                if (raw.includes("proveedor") || raw.includes("supplierId")) {
                    msg = "Debes seleccionar un proveedor válido.";
                } else if (raw.includes("PIN") || raw.includes("pin")) {
                    msg = "PIN de operador inválido o no proporcionado.";
                } else if (raw.includes("CRÍTICO") || raw.includes("Seriales ya existentes")) {
                    msg = raw; // This one is already clear
                } else if (raw.includes("encargado") || raw.includes("attendant")) {
                    msg = "Falta asignar un encargado a esta recepción.";
                } else if (raw.includes("recepción único") || raw.includes("receptionNumber")) {
                    msg = "Error al generar número de recepción. Intenta nuevamente.";
                } else if (raw.length > 200) {
                    // Likely a raw Prisma/DB error — don't show it
                    msg = "Error interno del servidor. Por favor intenta de nuevo o contacta soporte.";
                    console.error("[Inbound Save Error]", raw);
                } else {
                    msg = raw;
                }
            }
            toast.error(msg);
            setIsSubmitting(false);
        }
    };

    const handleBulkConfirm = (serials: string[]) => {
        if (!pendingBulkData) return;
        const { qty, product } = pendingBulkData;

        let newItems: any[] = [];

        if (serials.length === 0) {
            // AUTO MODE (Generate BULK- IDs)
            newItems = Array.from({ length: qty }).map((_, i) => ({
                serial: `BULK-${Date.now()}-${i}`,
                productName: product.name,
                sku: product.sku,
                upc: product.upc,
                productId: product.id,
                imageUrl: product.imageUrl,
                timestamp: new Date().toLocaleTimeString(),
                isBulk: true,
                instanceId: undefined
            }));
        } else {
            // MANUAL SERIALS MODE
            // Double check sanitization
            newItems = serials.map(s => sanitizeSerial(s)).filter(s => s.length > 0).map((s) => ({
                serial: s,
                productName: product.name,
                sku: product.sku,
                upc: product.upc,
                productId: product.id,
                timestamp: new Date().toLocaleTimeString(),
                isBulk: true, // Still marks as bulk group in UI
                instanceId: undefined
            }));
        }

        setScannedItems(prev => [...newItems, ...prev]);
        setScanFeedback("success");
        playSound("success");

        // RESET
        setShowBulkModal(false);
        setPendingBulkData(null);
        setScanStep("EXPECTING_UPC");
        setCurrentProduct(null);
        setTimeout(() => scannerInputRef.current?.focus(), 100);
    };

    const confirmFinalize = async () => {
        // ALWAYS ENFORCE OPERATOR SIGNATURE FOR RECEPTION
        // Backend requires PIN for every transaction linked to an Operator.
        setShowVerificationModal(false);

        // Slight delay to allow modal transition
        setTimeout(() => setShowPinModal(true), 300);
    };

    const handleOperatorSuccess = (operatorId: string, pin: string, operatorName: string) => {
        setSelectedOperatorId(operatorId);
        setSelectedOperatorName(operatorName);
        toast.success(`Gracias ${operatorName}, guardando recepción...`);

        // Auto-Trigger Save WITH PIN
        executePurchase(operatorId, operatorName, pin);
    };

    const generatePDF = async () => {
        if (scannedItems.length === 0) {
            alert("No hay items para generar reporte.");
            return;
        }

        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
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

        // Supplier & Currency Info
        const supplierName = suppliers.find(s => s.id === supplierId)?.name || "Proveedor General";
        doc.text(`Proveedor: ${supplierName}`, 14, 34);
        doc.text(`Moneda: ${currency}`, 14, 39);
        if (currency === "COP" && exchangeRate > 0) {
            doc.text(`TRM Referencia: $${exchangeRate.toLocaleString()} COP/USD`, 14, 44);
        }

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
            // In USD mode, cost is USD directly. In COP mode, cost is COP directly.
            const costUSD = currency === "USD" ? rawCost : (exchangeRate > 0 ? rawCost / exchangeRate : 0);
            const costCOP = currency === "COP" ? rawCost : (exchangeRate > 0 ? rawCost * exchangeRate : 0);

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
        const totalCost = Object.values(groupedItems).reduce((acc: number, item: any) => {
            const rawCost = costs[item.sku] || 0;
            return acc + rawCost * item.qty;
        }, 0);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Unidades: ${totalUnits}`, 14, finalY);
        doc.text(`Total Costo (${currency}): $${totalCost.toLocaleString()}`, 14, finalY + 5);

        doc.save(`Recepcion_${new Date().toISOString().slice(0, 10)}.pdf`);
    };


    // --- TTS & FEEDBACK EFFECTS ---
    // Auto-reset scanFeedback after brief flash
    useEffect(() => {
        if (scanFeedback === "success" || scanFeedback === "error") {
            const timer = setTimeout(() => setScanFeedback("idle"), 1500);
            return () => clearTimeout(timer);
        }
    }, [scanFeedback]);

    // TTS Effect
    useEffect(() => {
        if (!isMuted && currentProduct && scanStep !== "EXPECTING_UPC" && scanFeedback === "click") {
            // Cancel previous speech to avoid queueing
            window.speechSynthesis.cancel();

            let text = `${currentProduct.name} detectado.`;
            if (scanStep === "EXPECTING_QUANTITY") {
                text += " Ingrese cantidad.";
            } else {
                text += " Escanee Serial.";
            }
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
        <div className="w-full min-h-screen pb-20">
            {/* SUCCESS/ERROR TOP BANNER — brief, non-intrusive */}
            {scanFeedback === "success" && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-emerald-600 text-white text-center py-2 text-xs font-black uppercase tracking-widest animate-in slide-in-from-top duration-300">
                    ✓ REGISTRADO EXITOSAMENTE
                </div>
            )}
            {scanFeedback === "error" && errorMsg && (
                <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center py-2 text-xs font-black uppercase tracking-widest animate-in slide-in-from-top duration-300">
                    ✕ {errorMsg}
                </div>
            )}

            <div className="px-4 md:px-8 pt-6 space-y-6">

                {/* Header & Config */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/inventory" className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-card hover:bg-hover border border-border text-secondary shadow-sm shrink-0">
                            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-lg md:text-2xl text-primary uppercase tracking-tight flex items-center gap-2 font-black">
                                <PackageCheck className="w-6 h-6 md:w-8 md:h-8 text-blue-600 shrink-0" />
                                <span className="truncate">Recepción Inteligente</span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn(
                                    "font-bold text-xs",
                                    supplierId ? "border-border text-primary" : "border-red-500 text-red-500 dark:border-red-400 dark:text-red-400"
                                )}>
                                    {suppliers.find(s => s.id === supplierId)?.name || "⚠ Proveedor NO Seleccionado"}
                                </Badge>
                                <Badge variant="outline" className="border-border text-muted font-medium text-xs hidden sm:inline-flex">
                                    {attendant ? attendant.replace("_", " ") : "Encargado · Se asigna al guardar"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Quick Config Bar */}
                    <div className="flex flex-wrap items-center gap-4 bg-card p-2 rounded-2xl border border-border shadow-sm">
                        <select
                            value={supplierId}
                            onChange={(e) => {
                                if (e.target.value === "NEW_PROVIDER_TRIGGER") { setShowCreateProvider(true); setSupplierId(""); }
                                else setSupplierId(e.target.value);
                            }}
                            className="h-10 bg-card dark:bg-[#131517] hover:bg-hover border-transparent rounded-xl px-3 font-bold text-primary text-xs uppercase focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            <option value="" className="dark:bg-[#131517]">Proveedor...</option>
                            <option value="NEW_PROVIDER_TRIGGER" className="dark:bg-[#131517]">+ Crear</option>
                            {suppliers.map(s => <option key={s.id} value={s.id} className="dark:bg-[#131517]">{s.name}</option>)}
                        </select>



                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn("h-10 w-10 flex items-center justify-center rounded-xl transition-all border", isMuted ? "bg-header border-border text-secondary" : "bg-card border-blue-200 text-blue-600 shadow-sm")}
                            title={isMuted ? "Activar Voz" : "Silenciar Voz"}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>

                        <div className="flex items-center bg-header rounded-lg p-1">
                            <button onClick={() => setCurrency("USD")} className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", currency === "USD" ? "bg-card shadow text-green-700 dark:text-green-400" : "text-secondary")}>USD</button>
                            <button onClick={() => setCurrency("COP")} className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", currency === "COP" ? "bg-card shadow text-green-700 dark:text-green-400" : "text-secondary")}>COP</button>
                        </div>
                        {currency === "COP" && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-muted uppercase hidden sm:block">TRM<br/>Ref.</span>
                                <span className="text-[9px] font-bold text-muted uppercase sm:hidden">TRM</span>
                                <input
                                    type="number"
                                    value={exchangeRate}
                                    onChange={e => setExchangeRate(Number(e.target.value))}
                                    className="w-24 h-10 bg-card hover:bg-hover border-transparent rounded-xl px-3 font-mono font-bold text-primary text-sm text-right transition-colors"
                                    placeholder="4000"
                                />
                            </div>
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
                                    <div className="text-lg md:text-subheading opacity-90 uppercase">Unidades</div>
                                    <div className="text-xs font-medium text-blue-200 mt-1 bg-blue-700/50 px-3 py-1 rounded-full inline-block">
                                        {currency} Mode
                                    </div>
                                </div>
                            </div>

                            {/* Mode Toggle (Compact) */}
                            <div className="col-span-12 md:col-span-4 flex flex-col gap-3">
                                <button
                                    onClick={() => handleModeSwitch("SERIALIZED")}
                                    className={cn("flex-1 rounded-2xl border flex items-center px-4 md:px-6 gap-3 transition-all min-h-[3.5rem]", inboundMode === "SERIALIZED" ? "bg-card border-blue-600 text-blue-500 dark:text-blue-400 shadow-lg" : "bg-header border-transparent text-secondary hover:bg-hover")}
                                >
                                    <ScanBarcode className="w-6 h-6 shrink-0" />
                                    <div className="text-left">
                                        <div className="font-black uppercase text-sm">Serializado</div>
                                        <div className="text-[10px] font-bold opacity-60">UNO A UNO (F1)</div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleModeSwitch("BULK")}
                                    className={cn("flex-1 rounded-2xl border flex items-center px-4 md:px-6 gap-3 transition-all min-h-[3.5rem]", inboundMode === "BULK" ? "bg-card border-emerald-500 text-emerald-500 dark:text-emerald-400 shadow-lg" : "bg-header border-transparent text-secondary hover:bg-hover")}
                                >
                                    <Layers className="w-6 h-6 shrink-0" />
                                    <div className="text-left">
                                        <div className="font-black uppercase text-sm">Masivo</div>
                                        <div className="text-[10px] font-bold opacity-60">POR CANTIDAD (F2)</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Mobile Camera Scan Button */}
                        <button
                            onClick={() => setShowScanner(true)}
                            className={cn(
                                "md:hidden w-full flex items-center justify-center gap-3 text-white rounded-2xl py-4 font-black uppercase tracking-wider text-sm shadow-xl active:scale-[0.98] transition-transform",
                                scanStep === "EXPECTING_UPC"
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/20"
                                    : "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-600/20"
                            )}
                        >
                            <Camera className="w-5 h-5" />
                            {scanStep === "EXPECTING_UPC" ? "Escanear UPC con Cámara" : "Escanear Serial / IMEI"}
                        </button>

                        {/* MAIN SCANNER CARD - MAXIMIZE HEIGHT */}
                        <div className={cn(
                            "flex-1 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-center border-[6px] transition-all duration-300 min-h-[500px]",
                            scanFeedback === "error" ? "bg-red-600 border-red-500" :
                                scanStep === "EXPECTING_UPC" ? "bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950 border-slate-700 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950 dark:border-slate-800" :
                                    inboundMode === "BULK" ? "bg-emerald-600 border-emerald-500" : "bg-blue-600 border-blue-500"
                        )}>
                            {/* Product Name Display - MASSIVE & CENTERED */}
                            <div className="w-full text-center px-4 md:px-12 pt-12 pb-4 z-20 shrink-0">
                                {currentProduct ? (
                                    <div className="animate-in zoom-in-50 duration-300 relative inline-block">
                                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase drop-shadow-xl leading-tight">
                                            {currentProduct.name}
                                        </h2>
                                        <p className="text-white/70 font-mono font-bold text-xl md:text-2xl mt-2 tracking-widest">{currentProduct.upc}</p>

                                        <button
                                            onClick={resetScanner}
                                            className="absolute -right-12 top-0 text-white/40 hover:text-white p-2 rounded-full hover:bg-card transition-all"
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
                            <div className="relative z-10 w-full max-w-4xl mx-auto px-4 md:px-8 pb-12 flex-1 flex flex-col items-center justify-center">
                                <input
                                    ref={scannerInputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleScan}
                                    type={scanStep === "EXPECTING_QUANTITY" ? "number" : "text"}
                                    className={cn(
                                        "w-full bg-transparent border-b-4 border-border/30 text-center font-black text-[3rem] md:text-[5rem] lg:text-[6rem] leading-none text-white placeholder:text-white/20 outline-none uppercase tracking-wider transition-all",
                                        "focus:border-border focus:placeholder:text-white/10"
                                    )}
                                    placeholder={
                                        scanStep === "EXPECTING_UPC" ? "" :
                                            scanStep === "EXPECTING_QUANTITY" ? "CANTIDAD..." : "SERIAL..."
                                    }
                                    autoFocus
                                />
                                {/* Space reserved for Error and Buttons to prevent layout shifting */}
                                <div className="h-40 mt-8 w-full relative flex flex-col items-center justify-start">
                                    {scanFeedback === "error" && errorMsg && (
                                        <div className="absolute top-0 text-center flex flex-col items-center">
                                            <span className="animate-pulse bg-card text-red-600 text-xl md:text-heading px-8 py-4 rounded-full shadow-xl uppercase inline-flex items-center gap-3">
                                                <AlertCircle className="w-8 h-8" /> {errorMsg === "UPC NO ENCONTRADO" ? " NO ENCONTRADO" : errorMsg}
                                            </span>
                                            {errorMsg === "UPC NO ENCONTRADO" && (
                                                <div className="mt-6 flex justify-center w-full">
                                                    <button
                                                        onClick={() => setShowQuickCreateProduct(true)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center gap-2 transition-transform hover:scale-105"
                                                        type="button"
                                                    >
                                                        <Sparkles className="w-6 h-6" />
                                                        Crear Producto
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bottom Hints */}
                            <div className="absolute bottom-10 inset-x-0 text-center text-white/40 font-bold uppercase tracking-[0.2em] text-xs md:text-sm pointer-events-none">
                                {scanStep === "EXPECTING_UPC" ? "Paso 1: Identificar Producto" : "Paso 2: Capturar Unicidad"}
                            </div>
                        </div>


                    </div>

                    {/* RIGHT COLUMN (30%) - HISTORY LIST */}
                    <div className="lg:col-span-4 flex flex-col h-full bg-card backdrop-blur-md border border-border rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[calc(100vh-140px)] sticky top-6">
                        <div className="p-6 bg-card border-b border-border flex justify-between items-center z-10 shadow-sm relative">
                            <h3 className="font-black text-primary uppercase text-lg tracking-tight">Historial Reciente</h3>
                            <button onClick={() => setScannedItems([])} className="text-secondary hover:text-debt transition-colors p-2">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide bg-transparent">
                            {groupedItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted opacity-60 min-h-[300px]">
                                    <Layers className="w-16 h-16 mb-4" />
                                    <p className="font-bold uppercase text-sm">Sin movimientos</p>
                                </div>
                            ) : (
                                groupedItems.map((group: any) => {
                                    const isTop = group === groupedItems[0]; // Is this the newest group modified?

                                    return (
                                        <div key={group.sku} className={cn(
                                            "bg-card rounded-3xl p-5 shadow-lg border-2 transition-all duration-500 animate-in slide-in-from-top-4",
                                            isTop ? "border-blue-500 ring-4 ring-blue-500/10 scale-100" : "border-transparent opacity-80 hover:opacity-100"
                                        )}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 flex gap-3">
                                                    {group.imageUrl && (
                                                        <div className="w-12 h-12 shrink-0 rounded-lg border border-border bg-card overflow-hidden shadow-sm">
                                                            <img src={group.imageUrl} alt={group.productName} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h4 className="font-black text-primary text-lg uppercase leading-tight mb-1 line-clamp-2">
                                                            {group.productName}
                                                        </h4>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="bg-header text-secondary font-mono text-[10px] font-bold">
                                                                {group.sku}
                                                            </Badge>
                                                            {group.isBulk && !group.serials[0]?.serial?.startsWith("BULK-") && (
                                                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 text-[10px]">
                                                                    MASIVO MANUAL
                                                                </Badge>
                                                            )}
                                                            {group.firstIndex !== undefined && (
                                                                <span className="text-[10px] font-mono text-slate-300">#{group.firstIndex + 1}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* VIBRANT COUNT BADGE */}
                                                <div className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-blue-600/30 ml-3 shrink-0">
                                                    <span className="text-subheading">{group.count}</span>
                                                    <span className="text-[9px] font-bold uppercase opacity-80">Und</span>
                                                </div>
                                            </div>

                                            {/* Serial List - Hide if bulk generic OR if empty serial */}
                                            {group.serials.length > 0 && (!group.isBulk || !group.serials[0]?.serial?.startsWith("BULK-")) && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {group.serials.filter((s: any) => s.serial && s.serial.trim().length > 0).map((s: any, idx: number) => {
                                                        const isLastScanned = scannedItems.length > 0 && s === scannedItems[0];
                                                        return (
                                                            <div key={idx} className={cn(
                                                                "relative group/tag flex items-center gap-1 border px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all select-none",
                                                                isLastScanned
                                                                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30 scale-105"
                                                                    : "bg-header border-border text-secondary hover:border-border"
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
                                                                            : "hover:bg-red-100 hover:text-debt text-secondary"
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
                                            <div className="mt-4 pt-3 border-t border-border">
                                                <div className="flex items-center justify-between gap-3">
                                                    <label className="text-[10px] font-bold text-secondary uppercase">Costo Unit ({currency})</label>
                                                    <input
                                                        type="number"
                                                        value={costs[group.sku] === undefined || costs[group.sku] === 0 ? "" : costs[group.sku]}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            setCosts(prev => ({ ...prev, [group.sku]: isNaN(val) ? 0 : val }));
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                        className={cn(
                                                            "w-32 bg-header hover:bg-hover border rounded-lg px-2 py-1 text-right font-mono font-black text-sm outline-none transition-all placeholder:text-muted text-primary",
                                                            "focus:bg-card focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                                                            // Logic Update: $0 Cost Highlighting vs Last Cost Warning
                                                            (costs[group.sku] === undefined || costs[group.sku] === 0)
                                                                ? "border-orange-500 ring-1 ring-orange-500 bg-orange-50"
                                                                : lastCosts[group.sku] && costs[group.sku] > lastCosts[group.sku]!
                                                                    ? "border-orange-300 bg-orange-50"
                                                                    : "border-border"
                                                        )}
                                                        placeholder="0"
                                                        style={{ MozAppearance: "textfield" }} // Hide spinner Firefox
                                                    />
                                                </div>

                                                {/* LIVE CONVERSION & HISTORY PREVIEW */}
                                                <div className="flex justify-end items-center gap-2 mt-1 animate-in slide-in-from-top-1 fade-in duration-300">

                                                    {/* 1. Last Cost Reference (Visual Comparator) OR New Product Badge */}
                                                    {(lastCosts[group.sku] && lastCosts[group.sku]! > 0) ? (
                                                        (() => {
                                                            // Cost is direct in the selected currency
                                                            const currentCostCOP = currency === "COP"
                                                                ? (costs[group.sku] || 0)
                                                                : (exchangeRate > 0 ? (costs[group.sku] || 0) * exchangeRate : 0);

                                                            const lastCost = lastCosts[group.sku]!;
                                                            const diff = currentCostCOP - lastCost;
                                                            const isUp = diff > 0;
                                                            const isDown = diff < 0;
                                                            const hasCurrentInput = costs[group.sku] && costs[group.sku] > 0;

                                                            return (
                                                                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 text-blue-600 bg-blue-50 border-blue-100">
                                                                    <span>Último: ${lastCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                    {hasCurrentInput && isUp && <span className="text-debt">↑</span>}
                                                                    {hasCurrentInput && isDown && <span className="text-transfer">↓</span>}
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 text-emerald-600 bg-emerald-50 border-emerald-100 shadow-sm">
                                                            <span className="uppercase">✨ Nuevo Producto</span>
                                                        </div>
                                                    )}

                                                    {/* 2. Live Conversion Label (Dynamic Color) */}
                                                    {/* COP mode with TRM: show USD equivalent. USD mode: no conversion needed */}
                                                    {currency === "COP" && costs[group.sku] > 0 && exchangeRate > 0 && (
                                                        (() => {
                                                            const equivUSD = costs[group.sku] / exchangeRate;
                                                            return (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors text-secondary bg-header border-border">
                                                                    ≈ $ {equivUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
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
            <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
                <button
                    onClick={handleFinalize}
                    disabled={scannedItems.length === 0}
                    className="h-20 w-20 md:w-auto md:px-8 bg-black hover:bg-slate-800 dark:hover:bg-slate-800 text-white rounded-full shadow-2xl shadow-black/40 flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
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

            {showBulkModal && pendingBulkData && (
                <BulkSerialModal
                    isOpen={showBulkModal}
                    onClose={() => {
                        setShowBulkModal(false);
                        setPendingBulkData(null);
                        setScanStep("EXPECTING_UPC"); // Reset if canceled
                        setCurrentProduct(null);
                        setInputValue("");
                        setTimeout(() => scannerInputRef.current?.focus(), 100);
                    }}
                    onConfirm={handleBulkConfirm}
                    productName={pendingBulkData.product.name}
                    quantity={pendingBulkData.qty}
                    onQuantityChange={(newQty) => {
                        setPendingBulkData(prev => prev ? { ...prev, qty: newQty } : null);
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
                    currency === "COP"
                        ? scannedItems.reduce((acc, item) => acc + (costs[item.sku] || 0), 0)
                        : (exchangeRate > 0 ? scannedItems.reduce((acc, item) => acc + (costs[item.sku] || 0), 0) * exchangeRate : 0)
                }
                totalCostUSD={
                    currency === "USD"
                        ? scannedItems.reduce((acc, item) => acc + (costs[item.sku] || 0), 0)
                        : (exchangeRate > 0 ? scannedItems.reduce((acc, item) => acc + (costs[item.sku] || 0), 0) / exchangeRate : 0)
                }
                hasZeroCostItems={scannedItems.some(item => !costs[item.sku] || costs[item.sku] <= 0)}
            />

            <PinValidationModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={handleOperatorSuccess}
                title="Acceso de Operador"
                description="Ingresa tu PIN para gestionar esta recepción"
            />

            <BarcodeScanner
                isOpen={showScanner}
                onClose={() => setShowScanner(false)}
                mode={scanStep === "EXPECTING_UPC" ? "upc" : "serial"}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted(!isMuted)}
                onScan={async (value) => {
                    setShowScanner(false);
                    const scannedValue = value.trim().toUpperCase();
                    if (!scannedValue) return;

                    // Helper: speak text immediately (from user gesture chain)
                    const speak = (text: string) => {
                        if (isMuted) return;
                        try {
                            window.speechSynthesis.cancel();
                            const utterance = new SpeechSynthesisUtterance(text);
                            utterance.lang = "es-ES";
                            utterance.rate = 1.1;
                            utterance.pitch = 1;
                            window.speechSynthesis.speak(utterance);
                        } catch {}
                    };

                    if (scanStep === "EXPECTING_UPC") {
                        // UPC MODE: Look up product
                        try {
                            const product = await getProductByUpc(scannedValue);
                            if (product) {
                                setCurrentProduct(product);
                                setScanStep(inboundMode === "BULK" ? "EXPECTING_QUANTITY" : "EXPECTING_SERIAL");
                                setScanFeedback("click");
                                playSound("click");
                                setInputValue("");
                                speak(`${product.name} detectado. ${inboundMode === "BULK" ? "Ingrese cantidad." : "Escanee serial."}`);
                                getLastProductCost(product.id).then(cost => {
                                    if (cost !== null) {
                                        setLastCosts(prev => ({ ...prev, [product.sku]: cost }));
                                    }
                                });
                            } else {
                                setScanFeedback("error");
                                setErrorMsg("UPC NO ENCONTRADO");
                                playSound("error");
                                speak("Producto no encontrado.");
                                setPendingUpcForCreate(scannedValue);
                                // Open create modal immediately on mobile — same as desktop button
                                setShowQuickCreateProduct(true);
                            }
                        } catch {
                            setScanFeedback("error");
                            setErrorMsg("ERROR DE CONEXIÓN");
                            playSound("error");
                        }
                    } else if (scanStep === "EXPECTING_SERIAL" && currentProduct) {
                        // SERIAL MODE: Register the serial for the current product
                        const serial = scannedValue;
                        if (scannedItems.some(i => i.serial === serial)) {
                            setScanFeedback("error");
                            setErrorMsg("¡SERIAL YA EN LOTE!");
                            playSound("error");
                            speak("Serial duplicado.");
                        } else {
                            const newItem = {
                                serial,
                                productName: currentProduct.name,
                                sku: currentProduct.sku,
                                upc: currentProduct.upc,
                                productId: currentProduct.id,
                                imageUrl: currentProduct.imageUrl,
                                timestamp: new Date().toLocaleTimeString(),
                                isBulk: false
                            };
                            setScannedItems(prev => [newItem, ...prev]);
                            setScanFeedback("success");
                            playSound("success");
                            speak(`Serial registrado. ${currentProduct.name}.`);
                            // Reset to UPC
                            setScanStep("EXPECTING_UPC");
                            setCurrentProduct(null);
                        }
                        setInputValue("");
                    }
                    setTimeout(() => scannerInputRef.current?.focus(), 200);
                }}
            />
        </div>
    );
}

export default function InboundPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full bg-header flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>}>
            <InboundContent />
        </Suspense>
    );
}
