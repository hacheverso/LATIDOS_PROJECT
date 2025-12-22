import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Force rebuild
export async function GET() {
    try {
        const products = await prisma.product.findMany({
            include: {
                instances: {
                    select: { status: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const csvRows = [
            // Header
            ["name", "category", "state", "upc", "sku", "imageUrl", "stock"].join(",")
        ];

        for (const p of products) {
            const stock = p.instances.filter(i => i.status === "IN_STOCK").length;

            // Escape values to handle commas in text
            const escape = (val: string | number | boolean | null | undefined) => {
                if (val === null || val === undefined) return "";
                const stringVal = String(val);
                if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
                    return `"${stringVal.replace(/"/g, '""')}"`;
                }
                return stringVal;
            };

            const row = [
                escape(p.name),
                escape(p.category),
                escape(p.state),
                escape(p.upc),
                escape(p.sku),
                escape(p.imageUrl),
                escape(stock)
            ].join(",");

            csvRows.push(row);
        }

        const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="inventario-${new Date().toISOString().split('T')[0]}.csv"`,
            }
        });

    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
    }
}
