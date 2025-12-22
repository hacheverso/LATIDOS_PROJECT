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
    Grid,
    Plus,
    Minus,
    Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { searchCustomers, createCustomer, getInstanceBySerial, processSale } from "../actions";
import { ProductCatalog } from "@/components/sales/ProductCatalog";
import { SerialSelectionModal } from "@/components/sales/SerialSelectionModal";

// Interface for Cart Items
interface CartItem {
    product: any;
    quantity: number;
    serial?: string; // If present, it's a specific instance. If undefined, it's a general stock item.
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

    // Processing
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [isProcessing, setIsProcessing] = useState(false);
    const [saleSuccess, setSaleSuccess] = useState(false);

    // --- Customer Logic ---
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (customerSearch.length > 2) {
                const results = await searchCustomers(customerSearch);
                setFoundCustomers(results);
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
            if (cart.some(item => item.serial === scanInput)) {
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

                addToCart(product, 1, fullInstance.serialNumber);
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
    const addToCart = (product: any, quantity: number = 1, serial?: string) => {
        setCart(prev => {
            // Case A: Adding a Specific Serial
            if (serial) {
                // Check dupes
                if (prev.some(i => i.serial === serial)) return prev;
                return [...prev, { product, quantity: 1, serial }];
            }

            // Case B: Adding General Stock
            // Check if we already have a General row for this product
            const existingIndex = prev.findIndex(i => i.product.id === product.id && !i.serial);

            if (existingIndex >= 0) {
                // Update existing quantity
                const newCart = [...prev];
                const newQty = newCart[existingIndex].quantity + quantity;

                // Optional: Check against max general stock?
                if (newQty > product.generalStock) {
                    // alert(`Solo hay ${product.generalStock} unidades generales disponibles.`);
                    // Just cap it or let validation fail later? Let's cap it for UX if we knew generalStock... 
                    // Prop 'product' comes from Catalog, so it has .generalStock
                    if (newQty > (product.generalStock || 999)) {
                        alert("Stock general insuficiente.");
                        return prev;
                    }
                }
                newCart[existingIndex].quantity = newQty;
                return newCart;
            } else {
                // Remove check for stock > 0 here to allow "forced" adding? No, better safe.
                if (product.generalStock === 0 && !serial) {
                    // Try to auto-open modal? Or just alert?
                    // alert("No hay stock general. Seleccione un serial.");
                    // This case handles clicks from Catalog.
                    return prev;
                }
                return [...prev, { product, quantity, serial }];
            }
        });
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            const newQty = item.quantity + delta;

            if (newQty < 1) return prev; // Don't go below 1
            // Check max stock if available
            if (delta > 0 && item.product.generalStock && newQty > item.product.generalStock) {
                return prev;
            }

            item.quantity = newQty;
            return newCart;
        });
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    // --- Catalog Interactions ---
    const handleProductClick = (product: any) => {
        // Logic:
        // 1. If General Stock > 0, add 1 General Unit.
        // 2. If General Stock == 0 (Only unique serials), open Modal.

        if (product.generalStock > 0) {
            addToCart(product, 1);
        } else {
            // Must select serial
            openSerialModal(product);
        }
    };

    const openSerialModal = (product: any, cartIndexToConvert: number | null = null) => {
        setSelectedProductForSerial(product);
        setConvertingCartIndex(cartIndexToConvert);
        setIsSerialModalOpen(true);
    };

    const handleSerialSelected = (instance: any) => {
        // formatting
        const serial = instance.serialNumber;
        const product = instance.product;

        if (convertingCartIndex !== null) {
            // We are converting a General Item row to a Specific Serial row
            // Actually, we should probably DECREASE the general row by 1 and ADD a new Specific row?
            // Or if qty was 1, just replace it.
            setCart(prev => {
                const newCart = [...prev];
                const generalItem = newCart[convertingCartIndex];

                // If general item has > 1 qty, decrement it
                if (generalItem.quantity > 1) {
                    generalItem.quantity -= 1;
                    // Check if serial already exists
                    if (newCart.some(i => i.serial === serial)) return newCart; // Should not happen if filtered correctly
                    newCart.push({ product, quantity: 1, serial });
                } else {
                    // Replace entirely
                    newCart[convertingCartIndex] = { product, quantity: 1, serial };
                }
                return newCart;
            });
        } else {
            // Fresh selection
            addToCart(product, 1, serial);
        }
        setConvertingCartIndex(null);
    };

    // --- Cart Totals ---
    const total = cart.reduce((acc, item) => acc + (Number(item.product.basePrice) * item.quantity), 0);
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
            // Map cart to backend payload
            // Backend expects: items: { productId, quantity, serial? }[]
            const payloadItems = cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                serial: item.serial
            }));

            await processSale({
                customerId: customer.id,
                items: payloadItems,
                total: total,
                paymentMethod
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
            {/* LEFT PANEL (Catalog & Search) (2/3) */}
            <div className="flex-[2] flex flex-col gap-6 overflow-hidden">

                {/* 1. Header & Scanner Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center flex-none">
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
                    <ProductCatalog onProductSelect={handleProductClick} />
                </div>
            </div>

            {/* RIGHT PANEL (Cart & Customer) (1/3) */}
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
                            </div>
                            <button onClick={() => setCustomer(null)} className="text-[10px] font-bold text-red-500 hover:text-red-700 whitespace-nowrap ml-2">
                                CAMBIAR
                            </button>
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
                                    {foundCustomers.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-60 overflow-y-auto">
                                            {foundCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    onClick={() => { setCustomer(c); setCustomerSearch(""); setFoundCustomers([]); }}
                                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                >
                                                    <p className="text-sm font-bold text-slate-900">{c.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{c.taxId}</p>
                                                </div>
                                            ))}
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

                    {/* New Customer Form (Overlay) */}
                    {showNewCustomerForm && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 absolute top-full left-0 right-0 shadow-2xl z-50">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase">Nuevo Cliente</h3>
                                <button onClick={() => setShowNewCustomerForm(false)}><Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" /></button>
                            </div>

                            <div className="space-y-3">
                                <input placeholder="Nombre" className="w-full p-2 text-sm rounded border font-bold" value={newCustomerData.name} onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })} />
                                <input placeholder="Documento" className="w-full p-2 text-sm rounded border font-bold" value={newCustomerData.taxId} onChange={e => setNewCustomerData({ ...newCustomerData, taxId: e.target.value })} />
                                <div className="grid grid-cols-2 gap-2">
                                    <input placeholder="Tel" className="w-full p-2 text-sm rounded border" value={newCustomerData.phone} onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })} />
                                    <input placeholder="Email" className="w-full p-2 text-sm rounded border" value={newCustomerData.email} onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })} />
                                </div>
                                <input placeholder="Dirección" className="w-full p-2 text-sm rounded border" value={newCustomerData.address} onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })} />
                                <button onClick={handleCreateCustomer} className="w-full bg-slate-900 text-white py-2 rounded font-bold text-xs">GUARDAR</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart & Total Section (Combined) */}
                <div className="flex-1 bg-slate-900 text-white rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-5 bg-slate-950/50 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-blue-400" />
                            <span className="font-black uppercase tracking-tight">Carrito Actual</span>
                        </div>
                        <Badge className="bg-blue-600 text-white border-0">{totalItems}</Badge>
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
                                <div key={`${item.product.id}-${idx}`} className="bg-white/5 rounded-xl p-3 border border-white/5 flex gap-3 group relative hover:bg-white/10 transition-colors items-center">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-200 truncate">{item.product.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {item.serial ? (
                                                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <Hash className="w-3 h-3" /> {item.serial}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => openSerialModal(item.product, idx)}
                                                    className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded hover:bg-blue-500/40 transition-colors uppercase"
                                                >
                                                    Asignar Serial
                                                </button>
                                            )}
                                            <span className="text-xs text-slate-300 font-bold ml-auto">${Number(item.product.basePrice * item.quantity).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Quantity Controls (Only for General Items) */}
                                    {!item.serial && (
                                        <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                                            <button onClick={() => updateQuantity(idx, -1)} className="p-1 hover:bg-white/10 rounded"><Minus className="w-3 h-3 text-white" /></button>
                                            <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(idx, 1)} className="p-1 hover:bg-white/10 rounded"><Plus className="w-3 h-3 text-white" /></button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => removeFromCart(idx)}
                                        className="text-slate-500 hover:text-red-400 transition-colors p-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary Footer */}
                    <div className="p-5 bg-slate-800/50 border-t border-white/10 space-y-4">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-400">
                                <span>Subtotal</span>
                                <span>${total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-black text-white">
                                <span>Total</span>
                                <span>${total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setPaymentMethod("CASH")} className={cn("p-2 rounded text-[10px] font-bold uppercase border flex items-center justify-center gap-1", paymentMethod === "CASH" ? "bg-white text-black border-white" : "border-slate-700 text-slate-400")}>
                                <Banknote className="w-3 h-3" /> Efec
                            </button>
                            <button onClick={() => setPaymentMethod("CARD")} className={cn("p-2 rounded text-[10px] font-bold uppercase border flex items-center justify-center gap-1", paymentMethod === "CARD" ? "bg-white text-black border-white" : "border-slate-700 text-slate-400")}>
                                <CreditCard className="w-3 h-3" /> Tarj
                            </button>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={isProcessing || cart.length === 0}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isProcessing ? "Procesando..." : (
                                <>
                                    Cobrar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
