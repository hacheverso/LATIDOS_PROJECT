"use client";

import { useState, useRef, useEffect } from "react";
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
    MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchCustomers, createCustomer, getInstanceBySerial, processSale, checkCustomerStatus } from "../actions";
import { ProductCatalog } from "@/components/sales/ProductCatalog";
import { SerialSelectionModal } from "@/components/sales/SerialSelectionModal";
import CreateCustomerModal from "../components/CreateCustomerModal";

// Interface for Cart Items
interface CartItem {
    product: any;
    quantity: number;
    serials: string[]; // List of specific serials. Empty if General Stock.
    salePrice: number;
    unitCost?: number;
}

export default function SalesPage() {
    // State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customer, setCustomer] = useState<any | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [foundCustomers, setFoundCustomers] = useState<any[]>([]);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

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
    const [deliveryMethod, setDeliveryMethod] = useState("DELIVERY"); // Default to Delivery
    const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
    const [isProcessing, setIsProcessing] = useState(false);
    const [saleSuccess, setSaleSuccess] = useState(false);
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
    const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && scanInput) {
            e.preventDefault();
            setScanError("");

            // 1. Check if input is a known Serial already in cart
            if (cart.some(item => item.serials && item.serials.includes(scanInput))) {
                setScanError("Este serial ya está en el carrito.");
                setScanInput("");
                return;
            }

            try {
                // Try to find instance by Serial
                const instance = await getInstanceBySerial(scanInput);

                // If found, add as proper Serialized Item
                // Transform instance to match needed format
                const product = instance.product;
                const fullInstance = { ...instance };

                // Use the cost returned from the server (which is now a number)
                // @ts-ignore
                const cost = instance.cost || 0;

                addToCart(product, 1, fullInstance.serialNumber ? [fullInstance.serialNumber] : [], cost);
                setScanInput("");

            } catch (e) {
                // If serial not found, maybe it's a UPC/SKU? 
                // For now, let's keep it simple: Error implies not found serial.
                // TODO: Implement Product Lookup by UPC here to add General Stock.
                setScanError((e as Error).message);
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
    const handleCheckout = async () => {
        if (!customer) {
            alert("Selecciona un cliente");
            return;
        }
        if (cart.length === 0) {
            alert("Carrito vacío");
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

            await processSale({
                customerId: customer.id,
                items: payloadItems,
                total: total,
                amountPaid: amountPaid,
                paymentMethod,
                deliveryMethod,
                urgency: deliveryMethod === "DELIVERY" ? urgency : undefined,
                notes
            });
            setSaleSuccess(true);
            setCart([]);
            setCustomer(null);
        } catch (e) {
            alert("Error al procesar venta: " + (e as Error).message);
        } finally {
            setIsProcessing(false);
        }
    };

    if (saleSuccess) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-6 animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                    <CheckCircle2 className="w-12 h-12" />
                </div>
                <h1 className="text-4xl font-black text-slate-900 uppercase">¡Venta Exitosa!</h1>
                <p className="text-slate-500">La factura ha sido generada y el inventario actualizado.</p>
                <button
                    onClick={() => setSaleSuccess(false)}
                    className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition"
                >
                    Nueva Venta
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-2rem)] gap-6 overflow-hidden">
            {/* LEFT PANEL (Catalog & Search) (1/2) */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">

                {/* 1. Header & Scanner Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center flex-none sticky top-0 z-40">
                    <div className="relative flex-1">
                        <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                        <input
                            ref={scanInputRef}
                            type="text"
                            placeholder="ESCANEAR SERIAL O UPC..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 focus:ring-0 text-lg font-black tracking-widest uppercase text-slate-800 transition-all"
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
                    <div className="mb-4 flex items-center gap-2 text-slate-400">
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
            <div className="flex-1 flex flex-col gap-4 h-full min-w-[380px]">

                {/* Customer Section */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-none z-20 relative">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Cliente Asignado
                    </h2>

                    {customer ? (
                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <div className="overflow-hidden">
                                <p className="font-black text-slate-800 uppercase truncate">{customer.name}</p>
                                <p className="text-xs font-mono text-slate-500">{customer.taxId}</p>
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
                                <button onClick={() => setCustomer(null)} className="p-1.5 bg-white text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors shadow-sm border border-red-100" title="Cambiar Cliente">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar Cliente..."
                                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm"
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        onFocus={() => setFoundCustomers([])}
                                    />
                                    {/* Results Dropdown */}
                                    {foundCustomers.length > 0 ? (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-60 overflow-y-auto">
                                            {foundCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={async () => {
                                                        // Check for blocking status
                                                        const status = await checkCustomerStatus(c.id);
                                                        if (status.blocked) {
                                                            alert(`⛔ BLOQUEO DE CARTERA ⛔\n\nEste cliente tiene ${status.reason}\nFactura más antigua: ${status.oldestInvoice} (${status.daysOverdue} días de mora).\n\nNo se pueden realizar nuevas ventas hasta que se registre un abono.`);
                                                            return;
                                                        }

                                                        setCustomer(c);
                                                        setCustomerSearch("");
                                                        setFoundCustomers([]);
                                                    }}
                                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                >
                                                    <p className="text-sm font-bold text-slate-900">{c.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{c.taxId}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : customerSearch.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-3">
                                            <p className="text-xs text-slate-400 font-medium text-center">No se encontraron clientes</p>
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

                    {/* New Customer Form (Modal Integration) */}
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
                    />
                </div>

                {/* Cart & Total Section (Combined) */}
                <div className="flex-1 bg-white text-slate-900 rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                    {/* Header */}
                    <div className="p-5 bg-slate-50/50 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <span className="font-black uppercase tracking-tight text-slate-800">Carrito Actual</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-0">{totalItems}</Badge>
                    </div>

                    {/* Item List (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 space-y-2">
                                <ShoppingCart className="w-12 h-12" />
                                <p className="text-sm">Carrito Vacío</p>
                            </div>
                        ) : (

                            cart.map((item, idx) => (
                                <div key={`${item.product.id}-${idx}`} className="bg-slate-50/50 backdrop-blur-md rounded-xl p-4 border border-slate-100 flex gap-4 group relative hover:bg-white transition-all items-start shadow-sm">

                                    {/* Product Info & Serials */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <p className="font-black text-base text-slate-800 uppercase tracking-tight truncate">{item.product.name}</p>

                                        {/* Visible Serials List */}
                                        {item.serials && item.serials.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {item.serials.map(s => (
                                                    <span key={s} className="text-[10px] font-mono text-slate-400 bg-black/20 px-1.5 py-0.5 rounded flex items-center gap-1 group/serial cursor-pointer hover:bg-red-500/20 hover:text-red-300 transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); removeSerialFromItem(idx, s); }}
                                                        title="Clic para eliminar serial"
                                                    >
                                                        <Hash className="w-3 h-3 opacity-50" /> {s}
                                                    </span>
                                                ))}
                                                <button
                                                    onClick={() => openSerialModal(item.product, idx)}
                                                    className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors font-bold"
                                                >
                                                    + SER
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => openSerialModal(item.product, idx)}
                                                className="self-start text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors uppercase mt-1"
                                            >
                                                Asignar Serial
                                            </button>
                                        )}
                                    </div>

                                    {/* Editable Price & Quantity */}
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="relative group/price">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                value={item.salePrice || 0}
                                                onChange={e => updatePrice(idx, Number(e.target.value))}
                                                className="w-28 pl-5 pr-2 py-1 bg-white border border-slate-200 rounded text-right font-black text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                            />
                                        </div>

                                        {/* Simple Quantity Display/Control */}
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                            {(!item.serials || item.serials.length === 0) ? (
                                                <div className="flex items-center bg-slate-100 rounded border border-slate-200">
                                                    <button onClick={() => updateQuantity(idx, -1)} className="p-1 hover:bg-slate-200 text-slate-600"><Minus className="w-3 h-3" /></button>
                                                    <span className="w-6 text-center text-slate-800">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(idx, 1)} className="p-1 hover:bg-slate-200 text-slate-600"><Plus className="w-3 h-3" /></button>
                                                </div>
                                            ) : (
                                                <span>x{item.quantity}</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(idx)}
                                        className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )
                        }
                    </div>

                    {/* Summary Footer */}
                    <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
                        <div className="space-y-1">
                            {/* Privacy Margin - Hidden by default */}
                            <div className="flex justify-between text-xs text-slate-400 group cursor-help select-none">
                                <div className="flex items-center gap-1.5 opacity-20 group-hover:opacity-100 transition-opacity duration-300">
                                    <Lock className="w-3 h-3 text-amber-500" />
                                    <span className="font-mono text-amber-600">
                                        Util: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(profit)}
                                    </span>
                                </div>
                                <span className="opacity-0">Hidden</span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <StickyNote className="w-4 h-4" /> Notas / Observaciones
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-800 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Agregar notas a la factura..."
                                    rows={2}
                                />
                            </div>

                            {/* Delivery Method Toggle */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    <Truck className="w-4 h-4" /> Método de Entrega
                                </div>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-white border border-slate-200 rounded-lg">
                                    <button
                                        onClick={() => setDeliveryMethod("DELIVERY")}
                                        className={cn(
                                            "py-2 rounded-md text-xs font-black uppercase transition-all flex items-center justify-center gap-2",
                                            deliveryMethod === "DELIVERY" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Truck className="w-3 h-3" /> Domicilio
                                    </button>
                                    <button
                                        onClick={() => setDeliveryMethod("PICKUP")}
                                        className={cn(
                                            "py-2 rounded-md text-xs font-black uppercase transition-all flex items-center justify-center gap-2",
                                            deliveryMethod === "PICKUP" ? "bg-orange-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        <Store className="w-3 h-3" /> Recogida
                                    </button>
                                </div>
                            </div>

                            {/* Urgency Selector (Only for Delivery) */}
                            {deliveryMethod === "DELIVERY" && (
                                <div className="space-y-2 animate-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        <Hash className="w-4 h-4" /> Prioridad de Entrega
                                    </div>
                                    <Select value={urgency} onValueChange={(v: any) => setUrgency(v)}>
                                        <SelectTrigger className="w-full bg-white border-slate-200 text-slate-800 font-bold h-10">
                                            <SelectValue placeholder="Seleccionar Prioridad" />
                                        </SelectTrigger>
                                        <SelectContent className="z-[500] bg-white border-slate-200 text-slate-800">
                                            <SelectItem value="LOW">⚪ Baja (Sin Prisa)</SelectItem>
                                            <SelectItem value="MEDIUM">🔵 Media (Estándar)</SelectItem>
                                            <SelectItem value="HIGH">🟠 Alta (Prioritaria)</SelectItem>
                                            <SelectItem value="CRITICAL">🔴 Crítica (Urgente)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="flex justify-between text-3xl font-black text-slate-900 pt-2 border-t border-slate-200">
                                <span>Total</span>
                                <span>${finalTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Initial Payment Input */}
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                                <Banknote className="w-4 h-4" /> Pago Inicial
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={amountPaid === 0 ? '' : amountPaid}
                                    placeholder="0"
                                    onChange={e => setAmountPaid(Number(e.target.value))}
                                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                                    PENDIENTE: ${(finalTotal - amountPaid).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Single Action Button (Pending Debt) */}
                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing || cart.length === 0}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
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

            {/* Serial Selection Modal */}
            <SerialSelectionModal
                product={selectedProductForSerial}
                isOpen={isSerialModalOpen}
                onClose={() => { setIsSerialModalOpen(false); setConvertingCartIndex(null); }}
                onSelect={handleSerialSelected}
            />
        </div>
    );
}
