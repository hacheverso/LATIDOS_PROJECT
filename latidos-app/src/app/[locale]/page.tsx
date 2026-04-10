import { auth } from "@/auth";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LayoutDashboard, ShieldCheck, Zap } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from 'next-intl/server';

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await auth();
  const t = await getTranslations("Landing");

  // If logged in, redirect to dashboard immediately
  if (session?.user) {
    // @ts-ignore
    const role = session.user.role;
    if (role === 'LOGISTICA') {
      redirect("/logistics");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-card text-primary font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navbar */}
      <nav className="border-b border-border flex items-center justify-between px-6 py-4 lg:px-12 sticky top-0 bg-card backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 dark:bg-white/10 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <span className="text-subheading tracking-tighter">LATIDOS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold text-secondary hover:text-primary transition-colors">
            {t("login")}
          </Link>
          <Link href="/register" className="px-5 py-2.5 bg-slate-900 dark:bg-white/10 text-white text-sm font-bold rounded-full hover:bg-slate-800 dark:hover:bg-white/20 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            {t("register")}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="relative isolate px-4 sm:px-6 pt-4 sm:pt-6 lg:px-8">
          <div className="mx-auto max-w-4xl py-4 sm:py-8 lg:py-10 text-center">
            <div className="hidden sm:mb-8 sm:flex sm:justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-secondary ring-1 ring-slate-900/10 hover:ring-slate-900/20 bg-header">
                {t("badge_text")} <span className="font-semibold text-blue-600">{t("badge_version")} 1.0</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-primary mb-3 sm:mb-4 uppercase">
              {t("title_main")} <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t("title_gradient")}</span>
            </h1>

            <p className="mt-3 sm:mt-4 text-sm sm:text-lg leading-6 sm:leading-8 text-secondary max-w-2xl mx-auto">
              {t("subtitle")}
            </p>

            <div className="mt-6 sm:mt-8 flex items-center justify-center gap-x-4 sm:gap-x-6">
              <Link href="/register" className="px-5 py-2.5 sm:px-8 sm:py-4 bg-blue-600 text-white font-bold text-sm sm:text-lg rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-none flex items-center gap-2">
                {t("start_now")} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link href="/login" className="text-xs sm:text-sm font-bold leading-6 text-primary hover:underline underline-offset-4">
                {t("already_have_account")} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
            <div className="mx-auto mt-2 sm:mt-6 lg:mt-8 max-w-2xl lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-4 sm:gap-y-6 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-primary">
                    <LayoutDashboard className="h-5 w-5 flex-none text-blue-600" />
                    {t("feature1_title")}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-secondary">
                    <p className="flex-auto">{t("feature1_desc")}</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-primary">
                    <Zap className="h-5 w-5 flex-none text-blue-600" />
                    {t("feature2_title")}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-secondary">
                    <p className="flex-auto">{t("feature2_desc")}</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-primary">
                    <ShieldCheck className="h-5 w-5 flex-none text-blue-600" />
                    {t("feature3_title")}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-secondary">
                    <p className="flex-auto">{t("feature3_desc")}</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-header border-t border-border py-6 text-center text-sm text-secondary">
        <p>&copy; 2026 Hacheverso. {t("footer_rights")}</p>
      </footer>
    </div>
  );
}
