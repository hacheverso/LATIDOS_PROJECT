import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const session = await auth();
        // @ts-ignore
        const orgId = session?.user?.organizationId;
        const userId = session?.user?.id;
        const userName = session?.user?.name || "Usuario";

        if (!orgId || !userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await req.json();
        const { updates } = body as {
            updates: {
                productId: string;
                physicalCount?: number | "";
                observations?: string;
                isFocused?: boolean;
            }[];
        };

        if (!updates || updates.length === 0) return NextResponse.json({ success: true });

        // 1. Get or Create the Draft for the Organization
        let draft = await prisma.auditDraft.findUnique({
            where: { organizationId: orgId }
        });

        if (!draft) {
            draft = await prisma.auditDraft.create({
                data: { organizationId: orgId, status: "ACTIVE" }
            });
        }

        // 2. Process each update
        for (const update of updates) {
            // Upsert the DraftItem
            const existingItem = await prisma.auditDraftItem.findUnique({
                where: { draftId_productId: { draftId: draft.id, productId: update.productId } }
            });

            const currentContributions = existingItem && existingItem.contributions ? existingItem.contributions as any[] : [];

            // If user provides a count or observation, update their contribution
            if (update.physicalCount !== undefined || update.observations !== undefined) {
                const myIndex = currentContributions.findIndex((c: any) => c.userId === userId);

                const myContribution = {
                    userId,
                    userName,
                    count: update.physicalCount,
                    observations: update.observations
                };

                if (myIndex >= 0) {
                    currentContributions[myIndex] = { ...currentContributions[myIndex], ...myContribution };
                } else {
                    currentContributions.push(myContribution);
                }
            }

            // Determine Locks
            let lockedByUserId = existingItem?.lockedByUserId;
            let lockedAt = existingItem?.lockedAt;

            if (update.isFocused === true) {
                // I am trying to lock
                lockedByUserId = userId;
                lockedAt = new Date();
            } else if (update.isFocused === false && lockedByUserId === userId) {
                // I am releasing my lock
                lockedByUserId = null;
                lockedAt = null;
            }

            // Save back
            await prisma.auditDraftItem.upsert({
                where: { draftId_productId: { draftId: draft.id, productId: update.productId } },
                create: {
                    draftId: draft.id,
                    productId: update.productId,
                    contributions: currentContributions as any,
                    lockedByUserId,
                    lockedAt
                },
                update: {
                    contributions: currentContributions as any,
                    lockedByUserId,
                    lockedAt
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Audit Sync Error:", error);
        return NextResponse.json({ error: "Error syncing draft" }, { status: 500 });
    }
}
