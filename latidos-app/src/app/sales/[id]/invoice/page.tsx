"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSaleDetails } from "../../payment-actions";
import { getSettings } from "@/app/settings/actions";
import { Printer, Download, ArrowLeft } from "lucide-react";

export default function InvoicePage() {
    const { id } = useParams();
    const router = useRouter();
    const [sale, setSale] = useState<any>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [docType, setDocType] = useState<"invoice" | "packing-slip">("invoice");

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

    const handlePrint = () => window.print();


    if (loading) return (
        <div className="flex items-center justify-center h-screen text-secondary font-bold animate-pulse">
            Cargando Factura...
        </div>
    );
    if (!sale) return <div className="p-8 text-center">Venta no encontrada</div>;

    const orgName = settings?.name || "Mi Negocio";
    const orgAddress = settings?.address || "";
    const orgPhone = settings?.phone || "";
    const orgEmail = settings?.email || "";
    const orgNit = settings?.nit || "";
    const orgWebsite = settings?.website || "";
    const logoUrl = settings?.logoUrl;
    const footerMsg = settings?.footerMsg || "Gracias por su compra.";

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(value);

    const invoiceNumber = sale.invoiceNumber || sale.id.slice(0, 8).toUpperCase();
    const invoiceDate = new Date(sale.date).toLocaleDateString("es-CO", {
        year: "numeric", month: "long", day: "numeric"
    });

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-transparent flex flex-col items-center py-6 md:py-8 print:bg-white print:p-0 print:block w-full">
            
            {/* ── Screen-only Top Navigation ── */}
            <div className="no-print w-full max-w-[8.5in] flex justify-between items-center mb-6 px-4 md:px-0">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-secondary hover:text-primary transition-colors font-bold text-sm bg-card hover:bg-hover px-4 py-2 rounded-xl border border-border shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </button>
                <div className="no-print flex bg-slate-200 dark:bg-slate-900 p-1 rounded-xl shadow-inner border border-slate-300 dark:border-slate-800">
                    <button
                        onClick={() => setDocType("invoice")}
                        className={`text-xs font-black uppercase tracking-widest px-6 py-2 rounded-lg transition-all duration-300 ${docType === "invoice" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                        Factura
                    </button>
                    <button
                        onClick={() => setDocType("packing-slip")}
                        className={`text-xs font-black uppercase tracking-widest px-6 py-2 rounded-lg transition-all duration-300 ${docType === "packing-slip" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                    >
                        Packing Slip
                    </button>
                </div>
            </div>
            {/* ── Print Styles ── */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <style>{`
                @media print {
                    @page {
                        size: letter portrait;
                        margin: 0 !important; /* Forces Chromium/Safari to hide their native URLs and Dates */
                    }

                    /* Hide screen-only UI */
                    .no-print {
                        display: none !important;
                    }

                    /* Let the invoice flow naturally so browser paginates */
                    #invoice-root {
                        display: flex !important;
                        flex-direction: column !important;
                        width: 100% !important;
                        min-height: 100vh !important;
                        margin: 0 !important;
                        padding: 15mm 0 !important; /* Safe padding for content avoiding physical paper edges */
                        box-shadow: none !important;
                        background: white !important;
                    }

                    /* Repeat header on every page */
                    .invoice-header {
                        display: table-header-group;
                    }

                    /* Repeat footer on every page */
                    .invoice-footer {
                        display: table-footer-group;
                    }

                    /* Keep rows together — avoid breaking mid-row */
                    tr {
                        page-break-inside: avoid;
                    }

                    /* Prevent orphan totals block */
                    .totals-block {
                        page-break-inside: avoid;
                    }
                }
            `}</style>

            {/* ── Invoice Sheet ── */}
            <div
                id="invoice-root"
                className="bg-white w-full max-w-[8.5in] min-h-[11in] flex flex-col shadow-2xl print:shadow-none print:max-w-none print:min-h-[9.5in]"
                style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
            >
                {/* ══ HEADER ══ */}
                <div className="px-12 pt-10 pb-6 border-b-2 border-slate-900 flex justify-between items-start">
                    {/* Left: Brand */}
                    <div className="flex items-center gap-4">
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                        ) : (
                            <div className="w-14 h-14 bg-slate-900 text-white flex items-center justify-center rounded-lg font-black text-2xl">
                                {orgName.charAt(0)}
                            </div>
                        )}
                        <div>
                            <p className="font-black text-xl text-slate-900 uppercase tracking-tight leading-tight">
                                {orgName}
                            </p>
                            {orgAddress && <p className="text-xs text-slate-500 mt-0.5">{orgAddress}</p>}
                            {orgPhone && <p className="text-xs text-slate-500">Tel: {orgPhone}</p>}
                            {orgEmail && <p className="text-xs text-slate-500">{orgEmail}</p>}
                        </div>
                    </div>

                    {/* Right: Invoice info */}
                    <div className="text-right">
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                            {docType === "invoice" ? "FACTURA" : "PACKING SLIP"}
                        </h1>
                        <p className="text-sm font-mono text-slate-500 mt-1">#{invoiceNumber}</p>
                        <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                            <p><span className="font-bold text-slate-700">Fecha:</span> {invoiceDate}</p>
                        </div>
                    </div>
                </div>

                {/* ══ CLIENT INFO ══ */}
                <div className="px-12 py-6 bg-slate-50 border-b border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        {docType === "invoice" ? "Facturar a" : "Enviar a"}
                    </p>
                    <p className="text-lg font-black text-slate-900 uppercase">
                        {sale.customer.name}
                        {sale.customer.companyName ? ` · ${sale.customer.companyName}` : ""}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-slate-500">
                        {sale.customer.taxId && <span>CC/NIT: {sale.customer.taxId}</span>}
                        {sale.customer.address && <span>{sale.customer.address}</span>}
                        {sale.customer.phone && <span>Tel: {sale.customer.phone}</span>}
                    </div>
                </div>

                {/* ══ ITEMS TABLE ══ */}
                <div className="px-12 py-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="py-3 text-left font-black text-[10px] uppercase tracking-widest text-slate-500">
                                    Descripción / Producto
                                </th>
                                <th className="py-3 text-center font-black text-[10px] uppercase tracking-widest text-slate-500 w-14">
                                    Cant.
                                </th>
                                {docType === "invoice" && (
                                    <>
                                        <th className="py-3 text-right font-black text-[10px] uppercase tracking-widest text-slate-500 w-28">
                                            Precio Unit.
                                        </th>
                                        <th className="py-3 text-right font-black text-[10px] uppercase tracking-widest text-slate-500 w-28">
                                            Total
                                        </th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                // Group instances by product id — same product = one row
                                const groups: Record<string, {
                                    name: string;
                                    unitPrice: number;
                                    quantity: number;
                                    serials: string[];
                                }> = {};

                                sale.instances.forEach((item: any) => {
                                    const productId = item.product?.id || item.product?.name || "unknown";
                                    const price = Number(item.soldPrice || item.product?.basePrice || 0);
                                    const serial = item.serialNumber && item.serialNumber !== "N/A"
                                        ? item.serialNumber
                                        : null;

                                    if (!groups[productId]) {
                                        groups[productId] = {
                                            name: item.product?.name || "Producto",
                                            unitPrice: price,
                                            quantity: 0,
                                            serials: []
                                        };
                                    }
                                    groups[productId].quantity += 1;
                                    if (serial) groups[productId].serials.push(serial);
                                });

                                return Object.values(groups).map((group, idx) => (
                                    <tr
                                        key={idx}
                                        className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                                        style={{ pageBreakInside: "avoid" }}
                                    >
                                        <td className="py-3 pr-4">
                                            <p className="font-bold text-slate-900">{group.name}</p>
                                            {docType === "invoice" && group.serials.length > 0 && (
                                                <div className="mt-1 flex flex-col gap-0.5">
                                                    {group.serials.map((sn, i) => (
                                                        <p key={i} className="font-mono text-xs text-slate-400">S/N: {sn}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 text-center font-bold text-slate-600">{group.quantity}</td>
                                        {docType === "invoice" && (
                                            <>
                                                <td className="py-3 text-right text-slate-600">{formatCurrency(group.unitPrice)}</td>
                                                <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(group.unitPrice * group.quantity)}</td>
                                            </>
                                        )}
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* ══ TOTALS OR SIGNATURE ══ */}
                {docType === "invoice" ? (
                    <div className="px-12 pb-8 flex justify-end totals-block">
                        <div className="w-64">
                            <div className="flex justify-between text-sm py-2 border-b border-slate-200">
                                <span className="text-slate-500 font-medium">Subtotal</span>
                                <span className="font-bold text-slate-800">{formatCurrency(sale.total)}</span>
                            </div>
                            {sale.amountPaid > 0 && (
                                <div className="flex justify-between text-sm py-2 border-b border-slate-200">
                                    <span className="text-slate-500 font-medium">Pagado</span>
                                    <span className="font-bold text-green-600">−{formatCurrency(sale.amountPaid)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base py-3 mt-1 border-t-2 border-slate-900">
                                <span className="font-black text-slate-900">TOTAL</span>
                                <span className="font-black text-slate-900">{formatCurrency(sale.total)}</span>
                            </div>
                            {sale.amountPaid > 0 && sale.total - sale.amountPaid > 0 && (
                                <div className="flex justify-between text-sm py-2 bg-red-50 px-3 rounded mt-1">
                                    <span className="font-bold text-red-700">Saldo Pendiente</span>
                                    <span className="font-black text-red-700">
                                        {formatCurrency(sale.total - sale.amountPaid)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="px-12 pt-8 pb-12 flex justify-between totals-block mt-8 gap-12">
                        <div className="w-1/2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10">Nombre de quien recibe:</p>
                            <div className="border-b-2 border-slate-300 w-full"></div>
                        </div>
                        <div className="w-1/2">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10">Firma:</p>
                            <div className="border-b-2 border-slate-300 w-full"></div>
                        </div>
                    </div>
                )}

                {/* ══ NOTES (if any) ══ */}
                {sale.notes && (
                    <div className="px-12 pb-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Notas</p>
                        <p className="text-sm text-slate-600 border border-slate-200 rounded p-3 bg-slate-50">
                            {sale.notes}
                        </p>
                    </div>
                )}

                {/* ══ FOOTER ══ */}
                <div className="px-12 py-6 border-t border-slate-200 mt-auto">
                    <p className="text-center text-xs text-slate-400">{footerMsg}</p>
                    {orgWebsite && (
                        <p className="text-center text-xs text-slate-400 mt-1">{orgWebsite}</p>
                    )}
                </div>
            </div>

            {/* ── Screen-only action bar ── */}
            <div className="no-print fixed bottom-16 md:bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-slate-200 dark:border-border p-4 shadow-2xl shadow-black/50 flex justify-center gap-4 z-50 transition-colors">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-700 transition-all shadow-lg text-sm"
                >
                    <Printer className="w-4 h-4" />
                    Imprimir
                </button>

                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-500 transition-all shadow-lg text-sm"
                >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                </button>
            </div>

            {/* Spacer for bottom bar */}
            <div className="no-print h-24" />
        </div>
    );
}
