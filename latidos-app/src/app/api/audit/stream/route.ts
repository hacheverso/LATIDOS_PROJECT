import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const session = await auth();
    // @ts-ignore
    const orgId = session?.user?.organizationId;
    if (!orgId) return new Response("Unauthorized", { status: 401 });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {

            // Auto-close after 1 hour to prevent runaway connections
            const timeout = setTimeout(() => {
                controller.close();
            }, 3600000);

            // Send initial connection successful
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

            // Setup polling loop for SSE (Prisma doesn't easily support Postgres listen/notify natively without raw queries, so we poll for simplicity but quickly)
            let isClosed = false;
            let lastUpdate = new Date(0);

            // Fetch the draft ID first to optimize polling
            let draft = await prisma.auditDraft.findUnique({
                where: { organizationId: orgId }
            });

            const pollInterval = setInterval(async () => {
                try {
                    if (isClosed) {
                        clearInterval(pollInterval);
                        return;
                    }

                    if (!draft) {
                        draft = await prisma.auditDraft.findUnique({
                            where: { organizationId: orgId }
                        });
                        if (!draft) return; // Still no draft, do nothing
                    }

                    // Get items updated since last poll
                    const updatedItems = await prisma.auditDraftItem.findMany({
                        where: {
                            draftId: draft.id,
                            updatedAt: { gt: lastUpdate }
                        }
                    });

                    if (updatedItems.length > 0) {
                        // Update our high-water mark
                        lastUpdate = new Date(Math.max(...updatedItems.map(i => i.updatedAt.getTime())));

                        // Push to client
                        const payload = JSON.stringify({
                            type: "update",
                            items: updatedItems.map(item => ({
                                productId: item.productId,
                                lockedByUserId: item.lockedByUserId,
                                contributions: item.contributions
                            }))
                        });

                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                    }
                } catch (e) {
                    console.error("SSE Polling Error", e);
                }
            }, 1000); // 1 second polling for real-time feel

            req.signal.addEventListener("abort", () => {
                isClosed = true;
                clearInterval(pollInterval);
                clearTimeout(timeout);
                // Also clean up stale locks from this user if possible? 
                // That's tricky in a stateless abort. We might just rely on heartbeat or manual unlocks.
            });
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive"
        }
    });
}
