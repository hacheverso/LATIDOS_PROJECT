import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNavBar } from "@/components/layout/MobileNavBar";
import { Providers } from "@/components/Providers";
import { GlobalScrollBlocker } from "@/components/GlobalScrollBlocker";
import { ThemeProvider } from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers session={session}>
            <GlobalScrollBlocker />
            <div className="flex bg-gradient-to-br from-slate-100 to-slate-200 dark:from-background dark:to-background dark:bg-background min-h-screen transition-colors duration-300">
              <div className="hidden md:block">
                <Sidebar />
              </div>
              <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 relative pb-24 md:pb-8">
                {/* Ambient Background Glow */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                  <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-400/20 dark:bg-blue-900/5 rounded-full blur-[100px]" />
                  <div className="absolute top-[40%] -left-[10%] w-[50vw] h-[50vw] bg-purple-400/20 dark:bg-purple-900/5 rounded-full blur-[100px]" />
                </div>

                <div className="relative z-10 w-full max-w-[100vw] overflow-x-hidden">
                  {children}
                </div>
              </main>
              <MobileNavBar />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
