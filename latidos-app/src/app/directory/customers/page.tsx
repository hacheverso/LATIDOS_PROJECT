
import { getCustomersWithMetrics } from "@/app/sales/actions";
import CustomerDirectoryClient from "./CustomerDirectoryClient";

export const dynamic = 'force-dynamic';

export default async function CustomersDirectoryPage() {
    const data = await getCustomersWithMetrics();

    return (
        <CustomerDirectoryClient
            initialCustomers={data.customers}
            metrics={data.metrics}
        />
    );
}
