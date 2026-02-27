import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const session = await auth();
        // @ts-ignore
        const orgId = session?.user?.organizationId;
        if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        // Delete the draft, cascading to items
        await prisma.auditDraft.deleteMany({
            where: { organizationId: orgId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Audit Reset Error:", error);
        return NextResponse.json({ error: "Error resetting draft" }, { status: 500 });
    }
}
