import { getFinanceMetrics } from "./actions";
import FinanceDashboard from "./FinanceDashboard";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
    const { accounts, recentTransactions } = await getFinanceMetrics();

    return (
        <FinanceDashboard
            accounts={accounts}
            recentTransactions={recentTransactions}
        />
    );
}
