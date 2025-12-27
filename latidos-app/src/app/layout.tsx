import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LATIDOS by Hacheverso",
  description: "ERP Specialized in Technology",
};

import { auth } from "@/auth";

// ...

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers session={session}>
          <div className="flex bg-gradient-to-br from-slate-100 to-slate-300 min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto h-screen p-8 relative">
              {/* Ambient Background Glow */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-400/20 rounded-full blur-[100px]" />
                <div className="absolute top-[40%] -left-[10%] w-[50vw] h-[50vw] bg-purple-400/20 rounded-full blur-[100px]" />
              </div>

              <div className="relative z-10">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
