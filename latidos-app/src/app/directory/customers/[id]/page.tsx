import { prisma } from "@/lib/prisma";
import CustomerProfileForm from "./CustomerProfileForm";
import CustomerFinancialTabs from "./CustomerFinancialTabs";
import CreditHistoryTable from "./CreditHistoryTable";
import { Users, AlertTriangle } from "lucide-react";
import { auth } from "@/auth";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;

    if (!orgId) {
        notFound();
    }

    const customer = await prisma.customer.findFirst({
        where: { id: params.id, organizationId: orgId },
        include: {
            sales: {
                orderBy: { date: 'desc' },
                include: {
                    payments: true // Fetch payments linked to sales
                }
            }
        }
    });

    // Fetch Credit History
    const creditDeposits = await prisma.transaction.findMany({
        where: {
            category: "Depósitos Cliente",
            payment: {
                sale: {
                    customerId: params.id
                }
            }
        }
    });

    const creditUsages = await prisma.payment.findMany({
        where: {
            method: "SALDO A FAVOR",
            sale: {
                customerId: params.id
            }
        }
    });

    const creditHistory = [
        ...creditDeposits.map(t => ({
            id: t.id,
            date: t.date.toISOString(),
            type: 'IN' as const,
            amount: t.amount.toNumber(),
            description: t.description,
            referenceId: t.paymentId || undefined
        })),
        ...creditUsages.map(p => ({
            id: p.id,
            date: p.date.toISOString(),
            type: 'OUT' as const,
            amount: p.amount.toNumber(),
            description: p.notes || "Pago con Saldo a Favor",
            referenceId: p.saleId
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ... Credit History Fetching remains ... 

    // Aggregate all payments for the tabs
    // We want all payments linked to these sales
    // Since we included them in sales, we can extract them.
    // ALSO we want stray payments? Usually payments are linked to sales.

    if (!customer) {
        // ... (Error UI kept same)
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0E0F11] flex items-center justify-center p-6">
                <div className="bg-surface p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-border">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-black text-foreground mb-2">Cliente no encontrado</h1>
                    <p className="text-muted font-medium mb-6">El cliente que buscas no existe o ha sido eliminado.</p>
                    <a href="/directory/customers" className="block w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                        VOLVER AL DIRECTORIO
                    </a>
                </div>
            </div>
        );
    }

    const allPayments = customer.sales.flatMap(s => s.payments.map(p => ({
        ...p,
        sale: {
            invoiceNumber: s.invoiceNumber,
            total: s.total.toNumber()
        }
    })));

    // Serialize
    const serializedCustomer = {
        ...customer,
        creditBalance: customer.creditBalance?.toNumber() || 0,
        createdAt: customer.createdAt?.toISOString(),
        updatedAt: customer.updatedAt?.toISOString(),
        sales: customer.sales.map(s => ({
            ...s,
            total: s.total.toNumber(),
            amountPaid: s.amountPaid.toNumber(),
            date: s.date.toISOString(),
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
        }))
    };

    const serializedPayments = allPayments.map(p => ({
        ...p,
        amount: p.amount.toNumber(),
        date: p.date.toISOString(),
        saleId: p.saleId,
        // sale object is already simple
    }));

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-[#0E0F11] p-6 md:p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <a href="/directory/customers" className="text-muted font-bold text-xs uppercase tracking-wider mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                    ← Volver al Directorio
                </a>
                <h1 className="text-3xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-500" />
                    GESTIÓN DE CLIENTE
                </h1>
                <p className="text-muted font-medium ml-11">Visualiza y actualiza la información del comprador.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Profile Form & Credit History */}
                <div className="lg:col-span-5 h-full space-y-8">
                    {/* @ts-ignore */}
                    <CustomerProfileForm customer={serializedCustomer} />

                    <CreditHistoryTable transactions={creditHistory} />
                </div>

                {/* Right Column: Financial Tabs */}
                <div className="lg:col-span-7 h-full">
                    <CustomerFinancialTabs
                        sales={serializedCustomer.sales}
                        payments={serializedPayments}
                    />
                </div>
            </div>
        </div>
    );
}
