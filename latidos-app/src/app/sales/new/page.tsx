"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    ScanBarcode,
    UserPlus,
    Trash2,
    CreditCard,
    Banknote,
    ArrowRight,
    CheckCircle2,

    Users,
    ShoppingCart,
    Truck,
    Store,
    Grid,
    Plus,
    Minus,
    Hash,
    Lock,
    StickyNote,
    Pencil,
    MapPin,
    Printer,
    MessageCircle,
    Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { searchCustomers, createCustomer, getInstanceBySerial, processSale, checkCustomerStatus, getProductByUpcOrSku, getUserRole } from "../actions";
import { ProductCatalog } from "@/components/sales/ProductCatalog";
import { SerialSelectionModal } from "@/components/sales/SerialSelectionModal";
import CreateCustomerModal from "../components/CreateCustomerModal";
import { PinSignatureModal } from "@/components/auth/PinSignatureModal";
import { printReceipt } from "../components/printUtils";
import { shareReceiptViaWhatsApp } from "../components/whatsappUtils";

// Interface for Cart Items
interface CartItem {
    product: any;
    quantity: number;
    serials: string[]; // List of specific serials. Empty if General Stock.
    salePrice: number;
    unitCost?: number;
}

export default function SalesPage() {
    const router = useRouter();
    // State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [viewMode, setViewMode] = useState<"CATALOG" | "CART">("CATALOG"); // Mobile View State
    const [customer, setCustomer] = useState<any | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [foundCustomers, setFoundCustomers] = useState<any[]>([]);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

    // Delivery State
    const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY"); // Default to Delivery
    const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
    const [lastSale, setLastSale] = useState<any>(null); // Store the last completed sale for actions

    // Dual Identity State
    const [currentUserRole, setCurrentUserRole] = useState<string>("");
    const [showPinModal, setShowPinModal] = useState(false);

    useEffect(() => {
        getUserRole().then(role => setCurrentUserRole(role));
    }, []);

    // Scanner
    const [scanInput, setScanInput] = useState("");
    const [scanError, setScanError] = useState("");
    const scanInputRef = useRef<HTMLInputElement>(null);

    // Catalog & Selection
    const [selectedProductForSerial, setSelectedProductForSerial] = useState<any | null>(null);
    const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
    // Track which cart index triggered the modal (if any) to "convert" a general item
    const [convertingCartIndex, setConvertingCartIndex] = useState<number | null>(null);

    // New Customer Form
    const [newCustomerData, setNewCustomerData] = useState({ name: "", taxId: "", phone: "", email: "", address: "" });
    const [customerToEdit, setCustomerToEdit] = useState<any | null>(null);

    // Processing
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [isProcessing, setIsProcessing] = useState(false);
    const [notes, setNotes] = useState("");
    const [amountPaid, setAmountPaid] = useState<number>(0);

    // Derived Financials
    const rawTotal = cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
    const totalCost = cart.reduce((acc, item) => {
        const cost = item.unitCost || item.product.estimatedCost || 0;
        return acc + (cost * quantityOrSerials(item));
    }, 0);

    // Helper to get quantity
    function quantityOrSerials(item: CartItem) {
        return item.serials && item.serials.length > 0 ? item.serials.length : item.quantity;
    }

    // Margin Calculation for Discount Logic
    // Margin Calculation
    const finalTotal = rawTotal;
    const profit = finalTotal - totalCost;

    // --- Customer Logic ---
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            console.log("🔍 Searching for:", customerSearch);
            if (customerSearch.length > 0) {
                try {
                    const results = await searchCustomers(customerSearch);
                    console.log("✅ Results:", results);
                    setFoundCustomers(results);
                } catch (error) {
                    console.error("❌ Search Error:", error);
                }
            } else {
                setFoundCustomers([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [customerSearch]);

    const handleCreateCustomer = async () => {
        try {
            if (newCustomerData.email && !newCustomerData.email.includes("@")) {
                alert("Email inválido");
                return;
            }
            if (!newCustomerData.taxId) {
                alert("El Documento (NIT/CC) es obligatorio");
                return;
            }

            const newK = await createCustomer(newCustomerData);
            setCustomer(newK);
            setShowNewCustomerForm(false);
            setCustomerSearch("");
            setNewCustomerData({ name: "", taxId: "", phone: "", email: "", address: "" });
            alert("Cliente creado exitosamente");
        } catch (e) {
            alert((e as Error).message);
        }
    };

    // --- Scanner Logic ---
    const playSound = (type: 'success' | 'error') => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'success') {
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 (High Beep)
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else {
            osc.frequency.setValueAtTime(150, ctx.currentTime); // Low Buzz
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    };

    const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && scanInput) {
            e.preventDefault();
            setScanError("");

            // 1. Check if input is a known Serial already in cart
            if (cart.some(item => item.serials && item.serials.includes(scanInput))) {
                setScanError("Este serial ya está en el carrito.");
                playSound('error');
                setScanInput("");
                return;
            }

            try {
                // STEP 1: Try Serial Check
                let instance = null;
                try {
                    instance = await getInstanceBySerial(scanInput);
                } catch (e) {
                    instance = null;
                }

                if (instance) {
                    // Found Serial
                    const product = instance.product;
                    const fullInstance = { ...instance };
                    // @ts-ignore
                    const cost = instance.cost || 0;

                    addToCart(product, 1, fullInstance.serialNumber ? [fullInstance.serialNumber] : [], cost);
                    playSound('success');
                    setScanInput("");
                    return;
                }

                // STEP 2: Try UPC/SKU Check
                const productByUpc = await getProductByUpcOrSku(scanInput);

                if (productByUpc) {
                    if (productByUpc.requiresSerial) {
                        openSerialModal(productByUpc);
                        playSound('success');
                    } else {
                        if (productByUpc.generalStock > 0) {
                            addToCart(productByUpc, 1);
                            playSound('success');
                        } else {
                            if (productByUpc.uniqueStock > 0) {
                                openSerialModal(productByUpc);
                                playSound('success');
                            } else {
                                throw new Error("Producto sin stock disponible.");
                            }
                        }
                    }
                    setScanInput("");
                    return;
                }

                throw new Error("Serial o UPC no encontrado.");

            } catch (e) {
                setScanError((e as Error).message);
                playSound('error');
                setScanInput("");
            }
        }
    };

    // --- Cart Logic ---

    // Unified Add to Cart
    const addToCart = (product: any, quantity: number = 1, serials: string[] = [], unitCost: number = 0) => {
        setCart(prev => {
            // Case A: Specific Serials (Serials array provided)
            if (serials.length > 0) {
                const existingIndex = prev.findIndex(i => i.product.id === product.id && i.serials.length > 0);

                if (existingIndex >= 0) {
                    // Update existing row
                    const newCart = [...prev];
                    // Create shallow copy of item to avoid mutation
                    const existingItem = { ...newCart[existingIndex] };

                    // Merge serials, avoid dupes
                    const currentSerials = new Set(existingItem.serials);
                    serials.forEach(s => currentSerials.add(s));

                    existingItem.serials = Array.from(currentSerials);
                    existingItem.quantity = existingItem.serials.length; // Quantity is driven by serial count

                    newCart[existingIndex] = existingItem;
                    return newCart;
                } else {
                    // New Serialized Row
                    // Prioritize specific unitCost if provided, else fallback to product estimated
                    const finalCost = unitCost > 0 ? unitCost : (product.estimatedCost || 0);
                    return [...prev, { product, quantity: serials.length, serials, salePrice: Number(product.basePrice), unitCost: finalCost }];
                }
            }

            // Case B: Adding General Stock (No serials)
            const existingIndex = prev.findIndex(i => i.product.id === product.id && i.serials.length === 0);

            if (existingIndex >= 0) {
                const newCart = [...prev];
                // Create shallow copy of item
                const existingItem = { ...newCart[existingIndex] };

                const newQty = existingItem.quantity + quantity;
                if (newQty > (product.generalStock || 999)) {
                    alert("Stock general insuficiente.");
                    return prev;
                }
                existingItem.quantity = newQty;
                newCart[existingIndex] = existingItem;
                return newCart;
            } else {
                if (product.generalStock === 0 && serials.length === 0) {
                    return prev;
                }
                const finalCost = unitCost > 0 ? unitCost : (product.estimatedCost || 0);
                return [...prev, { product, quantity, serials: [], salePrice: Number(product.basePrice), unitCost: finalCost }];
            }
        });
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = { ...newCart[index] }; // Shallow copy

            // If it has serials, quantity is locked to serial list (unless we implement removing serials via qty?)
            // For now, let's disable granular qty update for Serial items, forces them to delete serials?
            if (item.serials && item.serials.length > 0) {
                // Cant update simple quantity
                return prev;
            }

            const newQty = item.quantity + delta;
            if (newQty < 1) return prev;
            if (delta > 0 && item.product.generalStock && newQty > item.product.generalStock) {
                return prev;
            }
            item.quantity = newQty;
            newCart[index] = item;
            return newCart;
        });
    };

    const updatePrice = (index: number, newPrice: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const newItem = { ...newCart[index], salePrice: newPrice };
            newCart[index] = newItem;
            return newCart;
        });
    };

    const resetPrice = (index: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const newItem = { ...newCart[index], salePrice: Number(newCart[index].product.basePrice) };
            newCart[index] = newItem;
            return newCart;
        });
    };

    // Check if price is below cost (Warning Logic)
    const isBelowCost = (price: number, cost: number) => {
        return price < cost;
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    // Remove specific serial from item
    const removeSerialFromItem = (cartIndex: number, serial: string) => {
        setCart(prev => {
            const newCart = [...prev];
            // Shallow item copy
            const item = { ...newCart[cartIndex] };

            item.serials = item.serials.filter(s => s !== serial);
            item.quantity = item.serials.length;
            newCart[cartIndex] = item;

            if (item.quantity === 0) {
                return prev.filter((_, i) => i !== cartIndex);
            }
            return newCart;
        });
    };

    // --- Catalog Interactions ---
    const handleQuickRemove = (product: any) => {
        setCart(prev => {
            const index = prev.findIndex(i => i.product.id === product.id);
            if (index === -1) return prev;

            const item = prev[index];
            // Block quick-remove for serialized items used as counters, force specific management
            if (item.serials && item.serials.length > 0) {
                alert("Para productos serializados, elimine el serial específico desde el carrito.");
                return prev;
            }

            if (item.quantity > 1) {
                const newCart = [...prev];
                // Update immutable
                const newItem = { ...newCart[index] };
                newItem.quantity -= 1;
                newCart[index] = newItem;
                return newCart;
            } else {
                return prev.filter((_, i) => i !== index);
            }
        });
    };



    const handleProductClick = (product: any) => {
        if (product.generalStock > 0) {
            addToCart(product, 1);
        } else {
            openSerialModal(product);
        }
    };

    const openSerialModal = (product: any, cartIndexToConvert: number | null = null) => {
        setSelectedProductForSerial(product);
        setConvertingCartIndex(cartIndexToConvert);
        setIsSerialModalOpen(true);
    };

    // Modified to accept Array of instances/objects from Modal
    const handleSerialSelected = (instances: any[]) => {
        // instances contains {serialNumber, isManual ?, product}
        const serials = instances.map(i => i.serialNumber);

        // We assume product is same for all (batch selection)
        if (instances.length === 0) return;
        const product = instances[0].product;

        if (convertingCartIndex !== null) {
            // Converting a General Row? Or Adding to it?
            // "Asignar Serial" button usually implies we want to attach serials to existing items.
            // But with new logic, we just merge into a serialized row.
            // Let's remove the General Row and add a Serialized Row (or merge).

            setCart(prev => {
                const newCart = [...prev];
                // Remove general row
                newCart.splice(convertingCartIndex, 1);
                return newCart;
            });
            // Add new Serialized items
            addToCart(product, 0, serials);
        } else {
            addToCart(product, 0, serials);
        }
        setConvertingCartIndex(null);
    };

    // --- Cart Totals ---
    const total = cart.reduce((acc, item) => acc + (item.salePrice * item.quantity), 0);
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    // --- Checkout ---
    const handleCheckout = async (operatorId?: string, pin?: string) => {
        if (!customer) {
            alert("Selecciona un cliente");
            return;
        }
        if (cart.length === 0) {
            alert("Carrito vacío");
            return;
        }

        // 1. PIN Check: If we are in "Rigorous" mode (or always for now for Sales), 
        // and we haven't received the signature yet, trigger the modal.
        // We can check currentUserRole/Permissions here if needed, but the requirement is "Total Traceability".
        // If we haven't passed operatorId/pin arguments, open the modal.
        if (!operatorId || !pin) {
            setShowPinModal(true);
            return;
        }

        setIsProcessing(true);
        try {
            const payloadItems = cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                serials: item.serials, // Send array of serials
                price: item.salePrice // Send negotiated price
            }));

            const sale = await processSale({
                customerId: customer.id,
                items: payloadItems,
                total: total,
                amountPaid: amountPaid,
                paymentMethod,
                deliveryMethod,
                urgency: deliveryMethod === "DELIVERY" ? urgency : undefined,
                notes,
                operatorId, // Pass Operator info
                pin
            });
            // Enrich lastSale with client-side snapshots for immediate printing/display
            setLastSale({
                ...sale,
                customerSnapshot: customer, // Capture customer state before clearing
                cartSnapshot: cart
            });
            router.push(`/sales/${sale.id}`);
        } catch (e) {
            alert("Error al procesar venta: " + (e as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSignatureSuccess = (operator: { id: string, name: string }, pin: string) => {
        // Callback from Modal with valid credentials
        handleCheckout(operator.id, pin);
    };

    return (
        <div className="flex flex-col md:flex-row h-[100dvh] md:h-[calc(100vh-2rem)] gap-0 md:gap-6 overflow-hidden bg-slate-50 dark:bg-[#0B0D0F] md:bg-transparent md:dark:bg-transparent pb-20 md:pb-0">
            {/* LEFT PANEL (Catalog & Search) (1/2) */}
            <div className={cn(
                "flex-1 flex flex-col gap-4 md:gap-6 overflow-hidden transition-all",
                viewMode === 'CART' ? "hidden md:flex" : "flex"
            )}>

                {/* 1. Header & Scanner Bar */}
                <div className="bg-surface p-4 md:rounded-2xl shadow-sm border-b md:border border-border flex gap-4 items-center flex-none sticky top-0 z-40">
                    <div className="relative flex-1">
                        <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                        <input
                            ref={scanInputRef}
                            type="text"
                            placeholder="ESCANEAR SERIAL O UPC..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border-2 border-border focus:border-blue-500 focus:ring-0 text-lg font-black tracking-widest uppercase text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            onKeyDown={handleScan}
                            autoFocus
                        />
                        {scanError && <div className="absolute top-full left-0 mt-1 text-xs font-bold text-red-500 animate-pulse bg-red-50 px-2 py-1 rounded">{scanError}</div>}
                    </div>
                </div>

                {/* 2. Catalog Grid */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="mb-4 flex items-center gap-2 text-muted">
                        <Grid className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Catálogo de Productos</span>
                    </div>

                    <ProductCatalog
                        onProductSelect={handleProductClick}
                        cart={cart}
                        onQuickAdd={(p) => addToCart(p, 1)}
                        onQuickRemove={handleQuickRemove}
                    />
                </div>
            </div>

            {/* RIGHT PANEL (Cart & Customer) (1/2) */}
            <div className={cn(
                "flex-1 flex flex-col gap-4 h-full min-w-[340px] lg:min-w-[380px] z-30",
                viewMode === "CATALOG" ? "hidden md:flex" : "flex"
            )}>

                {/* Customer Section */}
                <div className="bg-white dark:bg-[#131517] p-5 rounded-2xl shadow-sm border border-border flex-none z-20 relative">
                    <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Cliente Asignado
                    </h2>

                    {customer ? (
                        <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-500/5 p-3 rounded-xl border border-blue-100 dark:border-blue-500/20">
                            <div className="overflow-hidden">
                                <p className="font-black text-slate-800 dark:text-blue-300 uppercase truncate text-sm leading-tight">{customer.name}</p>
                                {customer.companyName && (
                                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase truncate mb-1 bg-blue-50 dark:bg-blue-900/20 w-fit px-1.5 py-0.5 rounded-sm">{customer.companyName}</p>
                                )}
                                <p className="text-[10px] font-mono text-muted">{customer.taxId}</p>
                                {customer.address && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 truncate">
                                        <MapPin className="w-3 h-3" />
                                        {customer.address}
                                    </div>
                                )}
                                {customer.sector && (
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded w-fit mt-1">
                                        <Truck className="w-3 h-3" />
                                        {customer.sector}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1 ml-2">
                                <button
                                    onClick={() => {
                                        setCustomerToEdit(customer);
                                        setShowNewCustomerForm(true);
                                    }}
                                    className="p-1.5 bg-white text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shadow-sm border border-blue-100"
                                    title="Editar Cliente"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setCustomer(null)} className="p-1.5 bg-white dark:bg-white/5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400 rounded-lg transition-colors shadow-sm border border-red-100 dark:border-red-500/20" title="Cambiar Cliente">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                    <input
                                        type="text"
                                        placeholder="Buscar Cliente..."
                                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-white dark:bg-transparent text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        onFocus={() => setFoundCustomers([])}
                                    />
                                    {/* Results Dropdown */}
                                    {foundCustomers.length > 0 ? (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-xl shadow-xl border border-border z-50 overflow-hidden max-h-60 overflow-y-auto">
                                            {foundCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={async () => {
                                                        // Check for warning status
                                                        const status = await checkCustomerStatus(c.id);
                                                        if (status.warning) {
                                                            const proceed = window.confirm(`⛔ ADVERTENCIA DE CARTERA ⛔\n\nEste cliente tiene ${status.reason}\nFactura más antigua: ${status.oldestInvoice} (${status.daysOverdue} días de mora).\n\n¿Deseas continuar y asignarle una nueva venta de todos modos?`);
                                                            if (!proceed) return;
                                                        }

                                                        setCustomer(c);
                                                        setCustomerSearch("");
                                                        setFoundCustomers([]);
                                                    }}
                                                    className="p-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer border-b border-slate-50 dark:border-white/5 last:border-0"
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-200 leading-tight truncate pr-2">{c.name}</p>
                                                        {c.companyName && (
                                                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded whitespace-nowrap uppercase tracking-wider border border-blue-100 dark:border-blue-800">
                                                                {c.companyName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <Truck className="w-3 h-3" />
                                                            {c.sector || "SIN ZONA ASIGNADA"}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-slate-400">{c.taxId}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : customerSearch.length > 0 && (
                                        <div
                                            onClick={() => setShowNewCustomerForm(true)}
                                            className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-xl shadow-xl border border-blue-100 dark:border-blue-500/20 z-50 p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/10 group transition-all"
                                        >
                                            <p className="text-xs text-muted font-medium text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                ¿El cliente no existe? <br />
                                                <span className="font-bold underline">Haz clic aquí para crearlo</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => setShowNewCustomerForm(true)}
                                    className="px-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}


                </div>

                {/* Cart & Total Section (Combined) */}
                <div className="flex-1 bg-white dark:bg-[#131517] text-foreground rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-border">
                    {/* Header */}
                    <div className="p-5 bg-slate-50/50 dark:bg-black/20 backdrop-blur-xl border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-black uppercase tracking-tight text-slate-800 dark:text-white">Carrito Actual</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-0">{totalItems}</Badge>
                    </div>

                    {/* Item List (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted opacity-50 dark:opacity-40 space-y-2">
                                <ShoppingCart className="w-12 h-12" />
                                <p className="text-sm">Carrito Vacío</p>
                            </div>
                        ) : (

                            cart.map((item, idx) => (
                                <div key={`${item.product.id}-${idx}`} className="bg-slate-50/50 dark:bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-border flex gap-6 group relative hover:bg-white dark:hover:bg-white/10 transition-all items-center shadow-sm dark:shadow-none">

                                    {/* Product Info & Serials */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                                        <p className="font-black text-lg text-slate-800 dark:text-slate-100 uppercase tracking-tight truncate leading-tight">{item.product.name}</p>

                                        {/* Visible Serials List */}
                                        {item.serials && item.serials.length > 0 ? (
                                            <div className="flex flex-col gap-2 mt-1">
                                                <div className="flex flex-wrap gap-2">
                                                    {item.serials.map(s => (
                                                        <span key={s} className="text-xs font-mono text-muted bg-surface border border-border px-2 py-1 rounded-md flex items-center gap-2 group/serial cursor-pointer hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30 hover:text-red-500 dark:hover:text-red-400 transition-colors shadow-sm dark:shadow-none"
                                                            onClick={(e) => { e.stopPropagation(); removeSerialFromItem(idx, s); }}
                                                            title="Clic para eliminar serial"
                                                        >
                                                            <Hash className="w-3 h-3 opacity-50" /> {s}
                                                        </span>
                                                    ))}
                                                    <button
                                                        onClick={() => openSerialModal(item.product, idx)}
                                                        className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors font-bold border border-blue-100 dark:border-blue-500/20"
                                                    >
                                                        + SER
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const text = item.serials.join(", ");
                                                        if (navigator.clipboard && navigator.clipboard.writeText) {
                                                            navigator.clipboard.writeText(text).then(() => {
                                                                alert("Seriales copiados al portapapeles");
                                                            }).catch(() => {
                                                                // Fallback if promise fails
                                                                const textArea = document.createElement("textarea");
                                                                textArea.value = text;
                                                                document.body.appendChild(textArea);
                                                                textArea.select();
                                                                document.execCommand("copy");
                                                                document.body.removeChild(textArea);
                                                                alert("Seriales copiados al portapapeles");
                                                            });
                                                        } else {
                                                            // Fallback for non-secure contexts (e.g. HTTP on LAN)
                                                            const textArea = document.createElement("textarea");
                                                            textArea.value = text;
                                                            textArea.style.position = "fixed"; // Avoid scrolling to bottom
                                                            textArea.style.left = "-9999px";
                                                            document.body.appendChild(textArea);
                                                            textArea.focus();
                                                            textArea.select();
                                                            try {
                                                                document.execCommand('copy');
                                                                alert("Seriales copiados al portapapeles");
                                                            } catch (err) {
                                                                console.error('Fallback error', err);
                                                                alert("No se pudo copiar automáticamente");
                                                            }
                                                            document.body.removeChild(textArea);
                                                        }
                                                    }}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-600 w-fit transition-colors"
                                                >
                                                    <Copy className="w-3 h-3" /> COPIAR SERIALES
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => openSerialModal(item.product, idx)}
                                                className="self-start text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors uppercase mt-1"
                                            >
                                                Asignar Serial
                                            </button>
                                        )}
                                    </div>

                                    {/* Editable Price & Quantity */}
                                    <div className="flex flex-col items-end gap-3">
                                        <div className="relative group/price">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-lg">$</span>
                                            <input
                                                type="text"
                                                value={new Intl.NumberFormat('es-CO').format(item.salePrice || 0)}
                                                onChange={e => {
                                                    // Remove dots (thousands) and ensure only numbers
                                                    const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '');
                                                    const numericValue = rawValue === '' ? 0 : Number(rawValue);
                                                    if (!isNaN(numericValue)) {
                                                        updatePrice(idx, numericValue);
                                                    }
                                                }}
                                                className="w-48 pl-8 pr-4 py-3 bg-white dark:bg-black/40 border-2 border-border rounded-xl text-right font-black text-xl text-foreground focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all shadow-sm dark:shadow-none group-hover/price:border-blue-200 dark:group-hover/price:border-blue-500/50"
                                            />
                                        </div>

                                        {/* Simple Quantity Display/Control */}
                                        <div className="flex items-center gap-3 text-sm text-muted font-bold">
                                            {(!item.serials || item.serials.length === 0) ? (
                                                <div className="flex items-center bg-surface rounded-lg border border-border shadow-sm dark:shadow-none p-1">
                                                    <button onClick={() => updateQuantity(idx, -1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-md transition-colors"><Minus className="w-4 h-4" /></button>
                                                    <span className="w-8 text-center text-foreground font-black text-base">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(idx, 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-md transition-colors"><Plus className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <span className="bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg border border-border text-foreground">x{item.quantity}</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(idx)}
                                        className="absolute -top-3 -right-3 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-all p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )
                        }
                    </div>

                    {/* Summary Footer */}
                    <div className="p-6 bg-slate-50/80 dark:bg-[#101214]/80 backdrop-blur-xl border-t border-border space-y-6">
                        <div className="space-y-4">
                            {/* Privacy Margin - Hidden by default */}
                            <div className="flex justify-between text-xs text-muted group cursor-help select-none">
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                                    <Lock className="w-3 h-3 text-amber-500" />
                                    <span className="font-mono text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded">
                                        Util: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(profit)}
                                    </span>
                                </div>
                                <span className="opacity-0">Hidden</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-black text-muted uppercase tracking-widest pl-1">
                                    <StickyNote className="w-4 h-4" /> Notas / Observaciones
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full bg-white dark:bg-black/20 border-2 border-border rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-300 font-medium resize-none focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-500"
                                    placeholder="Agregar notas a la factura..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-between text-3xl font-black text-foreground pt-2 border-t border-border">
                                <span>Total</span>
                                <span>${finalTotal.toLocaleString()}</span>
                            </div>



                            {/* Single Action Button (Pending Debt) */}
                            <button
                                onClick={() => handleCheckout()}
                                disabled={isProcessing || cart.length === 0}
                                className="hidden md:flex w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg transition-all items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {isProcessing ? "Procesando..." : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5" />
                                        GUARDAR FACTURA
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE FOOTER (Sticky) */}
            <div className="md:hidden flex-none bg-surface border-t border-border p-4 sticky bottom-0 z-50 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-none">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <p className="text-xs font-bold text-muted uppercase">Total a Pagar</p>
                        <p className="text-3xl font-black text-foreground">${finalTotal.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-bold text-muted">{cart.length} Productos</p>
                    </div>
                </div>

                {viewMode === 'CATALOG' ? (
                    <button
                        onClick={() => setViewMode('CART')}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ShoppingCart className="w-5 h-5" /> Ver Carrito / Pagar
                    </button>
                ) : (
                    <button
                        onClick={() => handleCheckout()}
                        disabled={isProcessing || cart.length === 0}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-5 h-5" /> Confirmar Venta
                    </button>
                )}

                {/* Back to Catalog Button if in Cart */}
                {viewMode === 'CART' && (
                    <button onClick={() => setViewMode('CATALOG')} className="mt-3 w-full py-2 text-slate-400 font-bold text-xs uppercase hover:text-slate-600">
                        Seguir Comprando
                    </button>
                )}
            </div>

            {/* Serial Selection Modal */}
            <SerialSelectionModal
                product={selectedProductForSerial}
                isOpen={isSerialModalOpen}
                onClose={() => { setIsSerialModalOpen(false); setConvertingCartIndex(null); }}
                onSelect={handleSerialSelected}
            />

            {/* New Customer Form (Moved to Root for Layering) */}
            <CreateCustomerModal
                isOpen={showNewCustomerForm}
                onClose={() => {
                    setShowNewCustomerForm(false);
                    setCustomerToEdit(null);
                }}
                onSuccess={(c) => {
                    setCustomer(c);
                }}
                customerToEdit={customerToEdit}
                initialName={customerSearch}
            />

            {/* Pin Validation Modal (Dual Identity) */}
            {/* Pin Modal for Dual Identity / Signing */}
            <PinSignatureModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={handleSignatureSuccess}
                actionName="Autorizar Venta"
            />
        </div>
    );
}
