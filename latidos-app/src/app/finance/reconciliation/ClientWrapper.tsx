"use client";

import { ClientSelector } from "@/app/sales/collections/ClientSelector";
import { useRouter, useSearchParams } from "next/navigation";

export default function ClientWrapper() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSelect = (customer: any) => {
        const params = new URLSearchParams(searchParams);
        if (customer) {
            params.set("clientId", customer.id);
        } else {
            params.delete("clientId");
        }
        router.push(`?${params.toString()}`);
    };

    return (
        <ClientSelector onSelect={handleSelect} />
    );
}
