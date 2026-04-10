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
        
        // Return full customer list, usually small enough.
        const customers = await prisma.customer.findMany({
            where: {
                organizationId: orgId
            },
            orderBy: { name: 'asc' }
        });

        const rows = customers.map(c => ({
            ID: c.id,
            NOMBRE: c.name,
            EMPRESA: c.companyName || "",
            IDENTIFICACION: c.taxId || "",
            TELEFONO: c.phone || "",
            EMAIL: c.email || "",
            DIRECCION: c.address || "",
            SALDO_A_FAVOR: Number(c.creditBalance) || 0
        }));

        return NextResponse.json(rows);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
