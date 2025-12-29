"use client";

import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";

import { Toaster } from "sonner";

export function Providers({ children, session }: { children: React.ReactNode, session: Session | null }) {
    return (
        <SessionProvider session={session}>
            {children}
            <Toaster richColors position="top-right" />
        </SessionProvider>
    );
}
