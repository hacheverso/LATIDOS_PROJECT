import { useState, useEffect, useRef } from "react";
import { X, Search, User, Trash2, ScanBarcode, History, RotateCcw, MessageCircle, Printer, Hash, AlertCircle, ChevronDown, ChevronUp, Pencil, Calendar, Settings, CheckCircle2, Package, ArrowRight, Minus, Plus, Loader2, FileText } from "lucide-react";
import { updateSale, searchCustomers, getAvailableProducts, getInstanceBySerial } from "@/app/sales/actions";
import { deletePayment, updatePayment, getSaleDetails } from "@/app/sales/payment-actions";
import { getPaymentAccounts } from "@/app/finance/actions";
import { formatCurrency, cn } from "@/lib/utils";
import { PinSignatureModal } from "@/components/auth/PinSignatureModal";

interface EditSaleModalProps {
    sale: any;
    onClose: () => void;
}

export default function EditSaleModal({ sale, onClose }: EditSaleModalProps) {
    // Auth & Audit
    const [showPinModal, setShowPinModal] = useState(false);
    const [auditReason, setAuditReason] = useState("");
    const [pendingAction, setPendingAction] = useState<{ type: 'SAVE' | 'DELETE_PAYMENT' | 'EDIT_PAYMENT', payload?: any } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [customerId, setCustomerId] = useState(sale.customer?.id || "");
    const [customerName, setCustomerName] = useState(sale.customer?.name || "");
    const [customerTaxId, setCustomerTaxId] = useState(sale.customer?.taxId || "");
    const [items, setItems] = useState<any[]>([]);
    const [initialItems, setInitialItems] = useState<any[]>([]);
    const [amountPaid, setAmountPaid] = useState(Number(sale.amountPaid || 0));
    const [payments, setPayments] = useState<any[]>([]);

    // Customer Search State
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState("");
    const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);

    // Payment Edit State
    const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
    const [editingPayment, setEditingPayment] = useState<any | null>(null);

    // Product Search / Scanner State
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [scanSuccess, setScanSuccess] = useState<string | null>(null); // Product Name or null
    const [scanError, setScanError] = useState<string | null>(null);
    const [lastScannedSerial, setLastScannedSerial] = useState<string | null>(null);
    const [highlightedItemIndex, setHighlightedItemIndex] = useState<number | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // --- Initialization ---
    useEffect(() => {
        getPaymentAccounts().then(setPaymentAccounts).catch(console.error);
        // Load Products for Client-Side Search (Scanner Optimization)
        getAvailableProducts().then(setAllProducts).catch(console.error);
    }, []);

    // Filter products when searchTerm changes
    useEffect(() => {
        const term = searchTerm.trim().toUpperCase();
        if (!term || term.length < 2) {
            setSearchResults([]);
            return;
        }
        const matches = allProducts.filter(p =>
            p.name.toUpperCase().includes(term) ||
            (p.sku && p.sku.toUpperCase().includes(term)) ||
            (p.upc && p.upc.toUpperCase().includes(term))
        ).slice(0, 5); // Limit to 5
        setSearchResults(matches);
    }, [searchTerm, allProducts]);

    useEffect(() => {
        // Group instances by product
        const grouped: any = {};
        if (sale.instances) {
            sale.instances.forEach((inst: any) => {
                if (!inst.product) return; // SAFEGUARD

                const prodId = inst.productId;
                if (!grouped[prodId]) {
                    const initialPrice = inst.soldPrice ? Number(inst.soldPrice) : Number(inst.product.basePrice || 0);

                    grouped[prodId] = {
                        productId: prodId,
                        productName: inst.product.name,
                        sku: inst.product.sku,
                        quantity: 0,
                        price: initialPrice,
                        serials: [],
                        isCollapsed: true,
                        bulkSerialInput: "",
                        isBulkEditing: false,
                        product: inst.product
                    };
                }
                grouped[prodId].quantity++;
                if (inst.serialNumber && inst.serialNumber !== "N/A") {
                    grouped[prodId].serials.push(inst.serialNumber);
                }
            });
        }
        const loadedItems = Object.values(grouped);
        setItems(loadedItems);
        setInitialItems(JSON.parse(JSON.stringify(loadedItems)));

        getSaleDetails(sale.id).then(details => {
            if (details.payments) setPayments(details.payments);
            if (details.amountPaid !== undefined) setAmountPaid(details.amountPaid);
        }).catch(console.error);

    }, [sale]);

    // Focus on mount
    useEffect(() => {
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }, []);

    const total = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    // SAFELY parse total
    const oldTotal = Number(sale.total || 0);
    const difference = total - oldTotal;

    // --- Core Logic ---

    const handleAddProduct = (product: any, specificSerial: string | null = null) => {
        setItems(prev => {
            const existingIdx = prev.findIndex(i => i.productId === product.id);
            if (existingIdx >= 0) {
                const newItems = [...prev];
                const item = { ...newItems[existingIdx] };
                item.quantity += 1;
                if (specificSerial) {
                    item.serials = [...item.serials, specificSerial];
                }
                newItems[existingIdx] = item;
                return newItems;
            } else {
                return [{
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    quantity: 1,
                    price: Number(product.basePrice || 0),
                    serials: specificSerial ? [specificSerial] : [],
                    isCollapsed: false,
                    bulkSerialInput: "",
                    isBulkEditing: false,
                    product: product
                }, ...prev]; // Add to top
            }
        });

        // Feedback
        setScanSuccess(product.name);
        setTimeout(() => setScanSuccess(null), 2000);
    };



    const flashItem = (index: number) => {
        setHighlightedItemIndex(index);
        setTimeout(() => setHighlightedItemIndex(null), 2000);
    };

    const handleScanOrSearch = async () => {
        const term = searchTerm.trim().toUpperCase();
        if (!term) return;

        setScanError(null);
        setScanSuccess(null);

        // 1. Check Local Items (Duplicate Serial prevention)
        for (let i = 0; i < items.length; i++) {
            if (items[i].serials && items[i].serials.includes(term)) {
                setScanSuccess(`Serial ${term} ya agregado`);
                setSearchTerm("");
                flashItem(i);
                return;
            }
        }

        // 2. Check Server for Serial (Smart Search)
        try {
            // Check Server (Status doesn't matter yet, logic handles it)
            const instance = await getInstanceBySerial(term, { includeSold: true });

            if (instance) {
                // Case A: SOLD - Check if sold in THIS sale
                if (instance.status === 'SOLD') {
                    if (instance.saleId === sale.id) {
                        // It is in this sale, but maybe not in local state? (e.g. reload)
                        // Or we just re-scanned it.
                        // Check if we already have it in items (covered by step 1 usually, but if not found there...)
                        // If not found in step 1, it means we don't have it in local state but it IS in the DB for this sale.
                        // We should add it.
                    } else {
                        // Sold in another sale
                        setScanError(`Error: Serial ${term} vendido en otra venta.`);
                        return;
                    }
                }

                // Case B: IN_STOCK or (SOLD in THIS sale)
                // Add to items
                handleAddProduct(instance.product, instance.serialNumber);
                setSearchTerm("");
                return;
            }
        } catch (e: any) {
            // Not a serial, or error.
            // If error is specific (like "Sold elsewhere"), we might want to show it.
            // But getInstanceBySerial throws generic "Not found" or specific "Not available".
            // We only care if it Was a serial but failed logic.
            if (e.message && e.message.includes("vendido") && !e.message.includes("no encontrado")) {
                setScanError(e.message);
                return;
            }
            // Continue to generic search
        }

        // 3. Generic Product Search (Name/SKU)
        const productMatch = allProducts.find(p =>
            (p.sku && p.sku.toUpperCase() === term) ||
            (p.name.toUpperCase() === term) ||
            (p.upc && p.upc.toUpperCase() === term)
        );

        if (productMatch) {
            handleAddProduct(productMatch);
            setSearchTerm("");
            return;
        }

        // 4. Fallback: Not Found
        alert("Serial no reconocido. ¿Deseas agregarlo como producto genérico o revisar el inventario?");
    };

    const handleRemoveItem = (index: number) => {
        if (confirm("¿Eliminar este producto de la venta?")) {
            setItems(prev => prev.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, updates: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], ...updates };
            return newItems;
        });
    };

    const handleQuantityChange = (index: number, newQty: number) => {
        if (newQty < 0) return;
        if (newQty === 0) return;
        updateItem(index, { quantity: newQty });
    };

    // --- Serial Logic ---
    const handleRemoveSerial = (index: number, serial: string) => {
        // Ask: Return to Stock OR Mark Defective?
        // Simple prompt approach for now, custom modal would be better but keeping it contained.
        // We will default to "Remove" if just X is clicked, BUT we need to capture intent.

        const action = prompt(`Destino del serial ${serial}:\nEscribe '1' para Retorno a Inventario (Usado)\nEscribe '2' para Baja/Garantía (Dañado)`, "1");

        if (action === null) return; // Cancelled

        const warrantyActionType = action === '2' ? 'LOW' : 'INVENTORY'; // 'LOW' = Baja, 'INVENTORY' = Retorno
        const note = prompt("¿Nota para este serial? (Opcional)", "");

        // Update local state to remove serial
        setItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index] };

            // Remove from list
            item.serials = item.serials.filter((s: string) => s !== serial);
            // Decrease quantity? Usually yes if removing serial means removing item instance.
            item.quantity = Math.max(0, item.quantity - 1);

            // Store warranty action
            item.warrantyActions = {
                ...(item.warrantyActions || {}),
                [serial]: { action: warrantyActionType, note: note || undefined }
            };

            newItems[index] = item;
            return newItems;
        });
    };

    const toggleBulkEdit = (index: number) => {
        const item = items[index];
        if (item.isBulkEditing) {
            updateItem(index, { isBulkEditing: false });
        } else {
            updateItem(index, {
                isBulkEditing: true,
                bulkSerialInput: item.serials.join("\n"),
                isCollapsed: false
            });
        }
    };

    const applyBulkSerials = (index: number) => {
        const item = items[index];
        const raw = item.bulkSerialInput || "";
        const candidates = raw.split(/[\n,\t]+/).map((s: string) => s.trim().toUpperCase()).filter(Boolean);
        const uniqueCandidates = Array.from(new Set(candidates));
        if (uniqueCandidates.length !== candidates.length) {
            alert(`⚠️ Se eliminaron seriales duplicados.`);
        }
        const newQty = uniqueCandidates.length;
        updateItem(index, {
            serials: uniqueCandidates,
            quantity: newQty > 0 ? newQty : item.quantity,
            isBulkEditing: false
        });
    };

    // --- Customer Logic ---
    const handleSearchCustomer = async (term: string) => {
        setCustomerSearchTerm(term);
        if (term.length > 2) {
            setIsSearchingCustomer(true);
            const res = await searchCustomers(term);
            setCustomerSearchResults(res);
            setIsSearchingCustomer(false);
        } else {
            setCustomerSearchResults([]);
        }
    };

    const selectNewCustomer = (c: any) => {
        setCustomerId(c.id);
        setCustomerName(c.name);
        setCustomerTaxId(c.taxId);
        setCustomerSearchTerm("");
        setCustomerSearchResults([]);
        setIsEditingCustomer(false);
    };

    // --- Payment Logic ---
    const handleDeletePayment = (paymentId: string) => {
        if (!auditReason || auditReason.length < 5) {
            alert("Ingrese una razón válida.");
            return;
        }
        setPendingAction({ type: 'DELETE_PAYMENT', payload: paymentId });
        setShowPinModal(true);
    };



    // --- Final Save ---
    const handleSave = () => {
        if (!auditReason.trim()) {
            alert("Motivo requerido.");
            return;
        }
        const missingSerials = items.filter(i => i.serials && i.serials.length > 0 && i.serials.length !== i.quantity);
        if (missingSerials.length > 0) {
            if (!confirm(`⚠️ Algunos productos tienen inconsistencia en seriales. ¿Continuar?`)) return;
        }
        if (!confirm("¿Confirmar y Guardar Cambios?")) return;
        setPendingAction({ type: 'SAVE' });
        setShowPinModal(true);
    };

    const handleRevert = () => {
        if (confirm("¿Revertir todos los cambios?")) {
            setItems(JSON.parse(JSON.stringify(initialItems)));
            setAmountPaid(Number(sale.amountPaid));
            setCustomerName(sale.customer.name);
            setCustomerId(sale.customer.id);
            setAuditReason("");
        }
    };

    const handleSignatureSuccess = async (operator: any, pin: string) => {
        setIsLoading(true);
        try {
            if (pendingAction?.type === 'SAVE') {
                await updateSale(sale.id, {
                    customerId,
                    items: items.map(i => ({
                        productId: i.productId,
                        quantity: Number(i.quantity),
                        price: Number(i.price),
                        serials: i.serials,
                        warrantyActions: i.warrantyActions,
                        warrantyNote: i.warrantyNote
                    })),
                    total
                }, { pin, reason: auditReason });
                onClose();
            } else if (pendingAction?.type === 'DELETE_PAYMENT') {
                await deletePayment(pendingAction.payload, auditReason, { operatorId: operator?.id, pin });
                const details = await getSaleDetails(sale.id);
                setPayments(details.payments || []);
                setAmountPaid(details.amountPaid || 0);
            } else if (pendingAction?.type === 'EDIT_PAYMENT') {
                await updatePayment(editingPayment.id, Number(editingPayment.amount), auditReason, editingPayment.method, editingPayment.accountId, new Date(editingPayment.date), { operatorId: operator?.id, pin });
                const details = await getSaleDetails(sale.id);
                setPayments(details.payments || []);
                setAmountPaid(details.amountPaid || 0);
                setEditingPayment(null);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsLoading(false);
            setPendingAction(null);
        }
    };

    const handleSaveEditedPayment = async () => {
        if (!editingPayment) return;
        setIsLoading(true);
        try {
            await updatePayment(editingPayment.id, Number(editingPayment.amount), auditReason || "Corrección de abono", editingPayment.method, editingPayment.accountId, new Date(editingPayment.date));
            const details = await getSaleDetails(sale.id);
            setPayments(details.payments || []);
            setAmountPaid(details.amountPaid || 0);
            setEditingPayment(null);
        } catch (e: any) {
            console.error(e);
            if (e.message.includes("Firma de Operador")) {
                setPendingAction({ type: 'EDIT_PAYMENT' });
                setShowPinModal(true);
            } else {
                alert(e.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300 flex items-center justify-center p-4 md:p-8">

            {/* Main Centered Panel */}
            <div className="bg-slate-50 w-full max-w-5xl h-full md:h-[90vh] rounded-3xl shadow-2xl flex flex-col border border-white/20 relative overflow-hidden">

                {/* Header */}
                <div className="bg-white px-8 py-5 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 transition-all">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Editar Venta</h2>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-mono font-bold">#{sale.invoiceNumber || sale.id.slice(0, 8)}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">Modifique ítems, precios o asigne seriales.</div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleRevert} className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> Revertir
                        </button>
                        <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                    {/* LEFT PANEL: Items & Scanner (Flex-1) */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white relative">

                        {/* 1. Universal Search / Scanner Bar */}
                        <div className="p-6 pb-2 bg-white z-20 relative">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
                                    placeholder="Escanear código de barras, serial o buscar producto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleScanOrSearch();
                                            setSearchResults([]); // Clear dropdown on enter
                                        }
                                    }}
                                    onBlur={() => setTimeout(() => setSearchResults([]), 200)} // Delay to allow click
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    <ScanBarcode className="w-6 h-6 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                </div>

                                {/* SEARCH DROPDOWN */}
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden">
                                        {searchResults.map((product) => (
                                            <div
                                                key={product.id}
                                                onClick={() => {
                                                    handleAddProduct(product);
                                                    setSearchTerm("");
                                                    setSearchResults([]);
                                                }}
                                                className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                    {product.imageUrl ? (
                                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-slate-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-800">{product.name}</div>
                                                    <div className="text-xs text-slate-400 flex gap-2">
                                                        <span>SKU: {product.sku}</span>
                                                        <span>${product.basePrice}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* SCAN SUCCESS ANIMATION */}
                                {scanSuccess && (
                                    <div className="absolute top-full left-0 right-0 mt-2 flex justify-center animate-in slide-in-from-top-2 fade-in duration-300 z-50">
                                        <div className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            {scanSuccess.includes("Agregado") ? scanSuccess : `Listo: ${scanSuccess}`}
                                        </div>
                                    </div>
                                )}
                                {/* SCAN ERROR ANIMATION */}
                                {scanError && (
                                    <div className="absolute top-full left-0 right-0 mt-2 flex justify-center animate-in slide-in-from-top-2 fade-in duration-300 z-50">
                                        <div className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {scanError}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4 custom-scrollbar">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ítems ({items.length})</span>
                            </div>

                            {items.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                    <Package className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="font-bold text-sm">Sin productos</p>
                                    <p className="text-xs">Usa el buscador para agregar.</p>
                                </div>
                            ) : (
                                items.map((item, idx) => (
                                    <div
                                        key={`${item.productId}-${idx}`}
                                        className={cn(
                                            "bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-500 group relative overflow-hidden",
                                            highlightedItemIndex === idx ? "border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] bg-emerald-50/30 ring-2 ring-emerald-500/20" : "border-slate-200"
                                        )}
                                    >
                                        {highlightedItemIndex === idx && (
                                            <div className="absolute inset-0 bg-emerald-400/10 pointer-events-none animate-pulse" />
                                        )}

                                        {/* Main Row: Thumb | Details | Qty | Total | Delete */}
                                        <div className="flex items-center gap-4">

                                            {/* 1. Thumbnail */}
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                {item.product?.imageUrl ? (
                                                    <img src={item.product.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-6 h-6 text-slate-300" />
                                                )}
                                            </div>

                                            {/* 2. Details (Name, SKU, Unit Price) */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-800 text-sm truncate" title={item.productName}>{item.productName}</h3>

                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{item.sku}</span>

                                                    {/* Price Alignment Fix */}
                                                    <div className="flex items-baseline gap-1.5 text-[10px] text-slate-400">
                                                        <span>Unit:</span>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={e => updateItem(idx, { price: Number(e.target.value) })}
                                                            className="w-20 bg-transparent border-b border-slate-200 focus:border-blue-500 font-bold text-slate-600 outline-none px-1 text-right"
                                                        />
                                                    </div>
                                                </div>

                                                {/* WARRANTY NOTE FIELD */}
                                                <div className="mt-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nota de Garantía/Cambio..."
                                                        className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 text-slate-600 placeholder:text-slate-300"
                                                        value={item.warrantyNote || ""}
                                                        onChange={(e) => updateItem(idx, { warrantyNote: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* 3. Horizontal Quantity Selector */}
                                            <div className="flex items-center border border-slate-300 rounded-lg bg-white h-8 shrink-0 overflow-hidden shadow-sm">
                                                <button
                                                    onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                                                    className="w-8 h-full flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors border-r border-slate-200"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <input
                                                    className="w-12 text-center bg-transparent font-bold text-slate-900 text-sm outline-none px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                                                    type="number"
                                                />
                                                <button
                                                    onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                                    className="w-8 h-full flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors border-l border-slate-200"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* 4. Total Price */}
                                            <div className="text-right min-w-[80px]">
                                                <div className="font-black text-slate-900 text-sm">{formatCurrency(item.price * item.quantity)}</div>
                                            </div>

                                            {/* 5. Remove Button */}
                                            <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Row 2: Serials & Bulk Edit (If Needed) */}
                                        <div className="mt-2 pl-[52px]"> {/* Indent to align with text */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {!item.isCollapsed && item.serials.length > 0 && (
                                                    <div className="flex-1 flex flex-wrap gap-1">
                                                        {item.serials.map((s: string) => (
                                                            <div key={s} className="group/serial relative">
                                                                <span className="bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold align-middle shadow-sm cursor-default flex items-center gap-1">
                                                                    {s}
                                                                    <button
                                                                        onClick={() => handleRemoveSerial(idx, s)}
                                                                        className="hover:text-red-500 text-slate-300"
                                                                        title="Remover / Garantía"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => toggleBulkEdit(idx)}
                                                    className={cn("text-[10px] font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 ml-auto",
                                                        item.serials.length !== item.quantity ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                                    )}
                                                >
                                                    <Hash className="w-3 h-3" />
                                                    {item.serials.length}/{item.quantity} Seriales
                                                </button>
                                            </div>

                                            {/* Inline Bulk Edit */}
                                            {item.isBulkEditing && (
                                                <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-blue-200 animate-in zoom-in-95">
                                                    <textarea
                                                        autoFocus
                                                        value={item.bulkSerialInput}
                                                        onChange={e => updateItem(idx, { bulkSerialInput: e.target.value })}
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                        className="w-full h-24 text-sm font-mono font-bold text-slate-800 bg-white border-2 border-blue-200 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 mb-3 placeholder:text-slate-400 shadow-inner"
                                                        placeholder="Pegar lista de seriales (uno por línea)..."
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => toggleBulkEdit(idx)} className="text-[10px] font-bold px-3 py-1.5 bg-slate-200 rounded text-slate-600 hover:bg-slate-300">Cancelar</button>
                                                        <button onClick={() => applyBulkSerials(idx)} className="text-[10px] font-bold px-3 py-1.5 bg-blue-600 rounded text-white hover:bg-blue-700 shadow-sm">Aplicar</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>


                    {/* RIGHT PANEL: Context & Actions (Wider, e.g. 350px fixed) */}
                    <div className="w-full md:w-[350px] bg-slate-50 border-l border-slate-200 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                            {/* Customer Block */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative group">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <User className="w-3 h-3" /> Cliente
                                    </h3>
                                    {isEditingCustomer || !customerName ? (
                                        <button onClick={() => setIsEditingCustomer(false)} className={`text-[10px] font-bold text-red-600 hover:underline ${!customerName ? 'hidden' : ''}`}>Cancelar</button>
                                    ) : (
                                        <button onClick={() => { setCustomerSearchTerm(""); setIsEditingCustomer(true); }} className="text-[10px] font-bold text-blue-600 hover:underline">Cambiar</button>
                                    )}
                                </div>
                                {isEditingCustomer || !customerName || customerSearchTerm || isSearchingCustomer ? (
                                    <div className="relative">
                                        <input
                                            autoFocus
                                            className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-bold placeholder:text-slate-500"
                                            placeholder="Buscar cliente..."
                                            value={customerSearchTerm}
                                            onChange={e => handleSearchCustomer(e.target.value)}
                                        />
                                        {customerSearchResults.length > 0 && (
                                            <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded shadow-lg z-50 mt-1 max-h-40 overflow-y-auto">
                                                {customerSearchResults.map(c => (
                                                    <div key={c.id} onClick={() => selectNewCustomer(c)} className="p-2 hover:bg-blue-50/80 border-b border-slate-100 last:border-0 cursor-pointer transition-colors group">
                                                        <div className="flex justify-between items-start mb-0.5">
                                                            <div className="font-bold text-slate-800 text-xs leading-tight truncate pr-2">{c.name}</div>
                                                            {c.companyName && (
                                                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap uppercase border border-blue-100 flex-shrink-0">
                                                                    {c.companyName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400">{c.taxId}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="font-bold text-sm text-slate-800 leading-tight">{customerName}</div>
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{customerTaxId}</div>
                                    </div>
                                )}
                            </div>

                            {/* Payments List */}
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                    <History className="w-3 h-3" /> Pagos ({payments.length})
                                </h3>
                                <div className="space-y-2">
                                    {payments.map(p => (
                                        <div key={p.id} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                                            <div>
                                                <div className="font-bold text-slate-600">{formatCurrency(p.amount)} <span className="text-[9px] font-normal text-slate-400 ml-1">{p.method}</span></div>
                                                {(p.reference || (p.notes && p.notes !== "Cobro Individual" && p.notes !== "Cobro Masivo" && p.notes !== "Abono registrado")) && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5 italic flex items-center gap-1">
                                                        <FileText className="w-3 h-3" /> {p.reference || p.notes}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingPayment({ ...p, originalAmount: p.amount, date: p.date })} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500"><Pencil className="w-3 h-3" /></button>
                                                <button onClick={() => handleDeletePayment(p.id)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {payments.length === 0 && <div className="text-[10px] text-slate-400 italic">No hay pagos registrados.</div>}
                                </div>
                            </div>

                        </div>

                        {/* Footer Totals */}
                        <div className="bg-white p-6 border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                            <div className="space-y-1 mb-4">
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <span>Pagado</span>
                                    <span>{formatCurrency(amountPaid)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-600 text-sm">Total</span>
                                    <span className="font-black text-2xl text-slate-900">{formatCurrency(total)}</span>
                                </div>
                                <div className={cn("flex justify-between items-center text-xs font-bold pt-2 border-t border-dashed border-slate-100 mt-2", (total - amountPaid) > 0 ? "text-orange-600" : "text-emerald-600")}>
                                    <span>Pendiente</span>
                                    <span className="text-base">{formatCurrency(total - amountPaid)}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <textarea
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-slate-800 resize-none"
                                        placeholder="Razón del cambio (Obligatorio)..."
                                        rows={2}
                                        value={auditReason}
                                        onChange={e => setAuditReason(e.target.value)}
                                    />
                                    {!auditReason && <span className="absolute top-2 right-2 text-red-400 text-[10px]">*</span>}
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading || !auditReason.trim()}
                                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2 text-sm"
                                >
                                    {isLoading ? <span className="animate-spin">C</span> : <>Guardar Cambios <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <PinSignatureModal
                isOpen={showPinModal}
                onClose={() => { setShowPinModal(false); setPendingAction(null); }}
                onSuccess={handleSignatureSuccess}
                actionName="Autorizar Cambios"
            />

            {/* Editing Payment Modal - Simplified */}
            {/* Editing Payment Modal - Redesigned */}
            {editingPayment && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/20 ring-1 ring-black/5 transform transition-all scale-100">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-black text-xl text-slate-900">Editar Pago</h3>
                                <div className="text-xs text-slate-500 font-medium mt-1">Modifique los detalles del abono.</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máximo Permitido</div>
                                <div className="text-emerald-600 font-black text-sm">
                                    {formatCurrency((items.reduce((sum, item) => sum + (item.price * item.quantity), 0) - amountPaid) + (editingPayment.originalAmount || 0))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* 1. AMOUNT (Hero Field) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monto del Abono</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
                                    <input
                                        autoFocus
                                        type="number"
                                        value={editingPayment.amount}
                                        onChange={e => setEditingPayment({ ...editingPayment, amount: Number(e.target.value) })}
                                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-3xl font-black text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                                        placeholder="0"
                                    />
                                </div>
                                {(items.reduce((sum, i) => sum + (i.price * i.quantity), 0) - amountPaid + (editingPayment.originalAmount || 0)) < editingPayment.amount && (
                                    <div className="flex items-center gap-1 text-red-500 text-xs font-bold mt-2 animate-in slide-in-from-top-1">
                                        <AlertCircle className="w-3 h-3" />
                                        El monto excede la deuda pendiente.
                                    </div>
                                )}
                            </div>

                            {/* 2. Row: Method & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Account / Method */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cuenta / Método</label>
                                    <div className="relative">
                                        <select
                                            value={editingPayment.accountId || ""}
                                            onChange={e => {
                                                const acc = paymentAccounts.find(a => a.id === e.target.value);
                                                setEditingPayment({ ...editingPayment, accountId: e.target.value, method: acc?.name || "Efectivo" });
                                            }}
                                            className="w-full appearance-none bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl px-3 py-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {paymentAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Date Picker */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={editingPayment.date ? editingPayment.date.split('T')[0] : new Date().toISOString().split('T')[0]}
                                            onChange={e => setEditingPayment({ ...editingPayment, date: e.target.value })}
                                            className="w-full bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        {/* Calendar icon overlay for styling if needed, but native date picker usually suffices */}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setEditingPayment(null)}
                                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEditedPayment}
                                disabled={
                                    !editingPayment.amount ||
                                    editingPayment.amount <= 0 ||
                                    ((items.reduce((sum, i) => sum + (i.price * i.quantity), 0) - amountPaid + (editingPayment.originalAmount || 0)) < editingPayment.amount)
                                }
                                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-black uppercase tracking-wide transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
