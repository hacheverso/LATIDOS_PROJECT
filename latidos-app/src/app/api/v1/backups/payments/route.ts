import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("apiKey");

        if (!apiKey) {
            return NextResponse.json({ error: "Unauthorized: Missing API Key" }, { status: 401 });
        }

        const targetProfile = await prisma.organizationProfile.findFirst({
            where: { backupApiKey: apiKey }
        });

        if (!targetProfile) {
            return NextResponse.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
        }

        const orgId = targetProfile.organizationId;

        const sinceParam = req.nextUrl.searchParams.get("since");
        let dateFilter: any = {};

        if (sinceParam) {
            const parts = sinceParam.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);
                const startDate = new Date(year, month, day, 0, 0, 0, 0);

                if (!isNaN(startDate.getTime())) {
                    dateFilter = {
                        date: { gte: startDate }
                    };
                }
            }
        }

        const payments = await prisma.salePayment.findMany({
            where: {
                ...dateFilter,
                sale: {
                    organizationId: orgId
                }
            },
            include: {
                sale: {
                    include: {
                        customer: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        const rows = payments.map(p => ({
            ID_PAGO: p.id,
            FECHA: p.date.toISOString().split('T')[0],
            MONTO: Number(p.amount) || 0,
            METODO: p.method,
            FACTURA: p.sale.invoiceNumber || p.sale.id,
            CLIENTE: p.sale.customer.name,
            REFERENCIA: p.reference || ""
        }));

        return NextResponse.json(rows);

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
