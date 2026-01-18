import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function FinanceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Check permissions (Admins bypass)
    // @ts-ignore
    if (session?.user?.role !== 'ADMIN') {
        // @ts-ignore
        const perms = session?.user?.permissions || {};
        if (!perms.canViewFinance) {
            redirect("/dashboard");
        }
    }

    return <>{children}</>;
}
