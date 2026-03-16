"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSaleDetails } from "../../payment-actions";
import { getSettings } from "@/app/settings/actions";
import { Printer, Share2, AlertCircle } from "lucide-react";

export default function InvoicePage() {
    const { id } = useParams();
    const [sale, setSale] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getSaleDetails(id as string),
            getSettings()
        ]).then(([saleData, settingsData]) => {
            setSale(saleData);
            setSettings(settingsData);
            setLoading(false);
        });
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        if (!sale?.customer?.phone) return;

        const message = `Hola ${sale.customer.name}, te enviamos tu recibo de compra de MR MOBILE. Gracias por tu confianza!`;
        const url = `https://wa.me/57${sale.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    if (loading) return <div className="flex items-center justify-center h-screen text-secondary font-bold animate-pulse">Cargando Recibo...</div>;
    if (!sale) return <div>Venta no encontrada</div>;

    const orgName = settings?.name || "MR MOBILE";
    const orgAddress = settings?.address || "Medellín";
    const logoUrl = settings?.logoUrl;
    const hasPhone = !!sale.customer.phone;

    return (
        <div className="min-h-screen bg-header flex flex-col items-center py-8 print:bg-card print:p-0">
            <style jsx global>{`
                @media print {
                    /* Reset Standard Page Settings */
                    @page {
                        size: A4;
                        margin: 0;
                    }

                    /* 
                       CRITICAL: Hide everything in the body by default using visibility.
                       Display: none can break React layout calculations or remove elements we need.
                       Visibility: hidden keeps them in DOM but makes them invisible.
                    */
                    body * {
                        visibility: hidden;
                    }

                    /* 
                       EXPLICITLY SHOW the invoice content and all its children.
                       We must target children too because 'visibility' inherits but can be overridden.
                    */
                    #invoice-content, 
                    #invoice-content * {
                        visibility: visible;
                    }

                    /* 
                       Position the invoice container absolutely to cover the entire page.
                       Using fixed positioning ensures it sits on top of everything else (like sidebar).
                    */
                    #invoice-content {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 210mm;
                        height: 297mm;
                        margin: 0;
                        padding: 40px !important; /* Internal padding for the paper */
                        background: white;
                        z-index: 99999; /* Ensure it's on top of everything */
                        
                        /* Remove shadows/borders for print */
                        box-shadow: none !important;
                        border: none !important;
                    }

                    /* Hide floating buttons specifically */
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>

            {/* INVOICE CONTAINER (A4 Aspect Ratio) */}
            <div
                id="invoice-content"
                className="bg-card text-primary w-full max-w-[210mm] min-h-[297mm] p-12 shadow-2xl relative flex flex-col justify-between"
                style={{ aspectRatio: '210/297' }}
            >
                <div>
                    {/* Header: Clean & Minimal */}
                    <div className="flex justify-between items-start mb-16">
                        <div className="flex gap-6 items-center">
                            {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain" />
                            ) : (
                                <div className="w-20 h-20 bg-card text-white flex items-center justify-center rounded-xl font-black text-2xl">
                                    {orgName.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h1 className="text-heading uppercase tracking-tighter text-primary leading-none mb-1">{orgName}</h1>
                                {/* Only City/Address shown as requested */}
                                {orgAddress && <p className="text-sm font-bold text-secondary uppercase tracking-wide">{orgAddress}</p>}
                            </div>
                        </div>

                        <div className="text-right">
                            <h2 className="text-4xl font-thin text-slate-200 uppercase tracking-widest mb-2 leading-none">
                                RECIBO DE <br />
                                <span className="font-black text-slate-300">COMPRA</span>
                            </h2>
                            <div className="text-subheading text-primary tracking-tight">#{sale.invoiceNumber || sale.id.slice(0, 8).toUpperCase()}</div>
                            <div className="mt-2">
                                <p className="text-[10px] font-black uppercase text-secondary tracking-widest">Fecha de Emisión</p>
                                <p className="font-bold text-base text-primary">{new Date(sale.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info Row - Removed Payment Status Badge */}
                    <div className="flex justify-between items-end border-b-2 border-border pb-8 mb-12">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">Facturar a</p>
                            <div className="font-black text-2xl text-primary uppercase">
                                {sale.customer.name} {sale.customer.companyName ? `(${sale.customer.companyName})` : ''}
                            </div>
                            <div className="text-sm text-secondary font-medium mt-1">
                                {sale.customer.taxId}
                                {sale.customer.address ? ` • ${sale.customer.address}` : ''}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-12">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left">
                                    <th className="py-4 font-black uppercase text-[10px] tracking-widest text-secondary border-b border-border w-[50%]">Descripción / Producto</th>
                                    <th className="py-4 font-black uppercase text-[10px] tracking-widest text-secondary border-b border-border text-center">Cant.</th>
                                    <th className="py-4 font-black uppercase text-[10px] tracking-widest text-secondary border-b border-border text-right">Precio Unit.</th>
                                    <th className="py-4 font-black uppercase text-[10px] tracking-widest text-secondary border-b border-border text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sale.instances.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="py-5 pr-4">
                                            <div className="font-bold text-primary text-base uppercase mb-1">{item.product.name}</div>
                                            <div className="text-xs font-mono text-secondary mt-1">
                                                {item.serialNumber !== "N/A" ? `SN: ${item.serialNumber}` : `SKU: ${item.product.sku}`}
                                            </div>
                                        </td>
                                        <td className="py-5 text-center font-bold text-secondary">1</td>
                                        <td className="py-5 text-right font-medium text-secondary">
                                            ${(item.soldPrice || item.product.basePrice).toLocaleString()}
                                        </td>
                                        <td className="py-5 text-right font-black text-primary">
                                            ${(item.soldPrice || item.product.basePrice).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex justify-end mb-20">
                        <div className="w-72 p-6">
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-secondary">Subtotal</span>
                                    <span className="font-bold text-primary">${sale.total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-secondary">Impuestos</span>
                                    <span className="font-bold text-primary">$0.00</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-2xl border-t-2 border-dashed border-border pt-4">
                                <span className="font-black text-primary">TOTAL</span>
                                <span className="font-black text-primary">${sale.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Message */}
                <div className="text-center pt-8 border-t border-border">
                    <p className="text-secondary font-medium text-sm leading-relaxed max-w-lg mx-auto">
                        {settings?.footerMsg || "Gracias por elegir a MR MOBILE como tu aliado tecnológico."}
                        <br />
                        <span className="text-secondary text-xs text-center block mt-1">mr.mobile.contacto@gmail.com</span>
                    </p>
                </div>
            </div>

            {/* ACTION BUTTONS (Floating or fixed bottom) */}
            <div className="fixed bottom-0 left-0 right-0 bg-card backdrop-blur-md border-t border-border p-4 shadow-2xl print:hidden flex justify-center gap-4 z-50">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-card text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl text-sm"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir / Guardar PDF
                </button>

                {hasPhone ? (
                    <button
                        onClick={handleWhatsAppShare}
                        className="flex items-center gap-2 bg-[#25D366] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#20bd5a] transition-all shadow-lg hover:shadow-xl hover:shadow-green-500/20 text-sm"
                    >
                        <Share2 className="w-4 h-4" />
                        Enviar por WhatsApp
                    </button>
                ) : (
                    <div className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-header text-secondary cursor-not-allowed text-sm" title="El cliente no tiene teléfono registrado">
                        <AlertCircle className="w-4 h-4" />
                        WhatsApp No Disponible
                    </div>
                )}
            </div>

            {/* Spacer for bottom bar */}
            <div className="h-24 print:hidden"></div>
        </div>
    );
}
