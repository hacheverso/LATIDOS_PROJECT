"use client";

import { useFormState, useFormStatus } from "react-dom";
import { authenticate, loginWithGoogle } from "@/app/lib/actions";
import { Package } from "lucide-react";
import { useTranslations } from 'next-intl';

export default function LoginForm({ isFirstRun }: { isFirstRun?: boolean }) {
    const t = useTranslations("Login");
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    // Get search params for success message
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isSetupSuccess = searchParams?.get("setup") === "success";

    return (
        <div className="flex items-center justify-center min-h-screen bg-header">
            <div className="w-full max-w-md p-6 space-y-5 bg-card rounded-3xl shadow-xl border border-border">
                {isFirstRun && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                        <p className="text-blue-800 dark:text-blue-400 font-bold mb-2">{t("welcome")}</p>
                        <p className="text-sm text-blue-600 mb-3">{t("first_time")}</p>
                        <a href="/setup" className="inline-block px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            {t("setup_admin")}
                        </a>
                    </div>
                )}

                {isSetupSuccess && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                        <p className="text-green-800 dark:text-green-400 font-bold">{t("setup_success")}</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{t("now_login")}</p>
                    </div>
                )}

                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-900 dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20 mb-3">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-subheading tracking-tight text-primary">LATIDOS</h2>
                    <p className="text-secondary font-medium">{t("subtitle")}</p>
                </div>

                <div className="space-y-3">
                    {/* Google Login */}
                    <form action={loginWithGoogle}>
                        <button className="w-full flex items-center justify-center gap-3 bg-card border border-border text-primary font-bold py-3 px-4 rounded-xl hover:bg-hover hover:border-border transition-all shadow-sm">
                            <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#4285F4" }}
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#34A853" }}
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#FBBC05" }}
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    style={{ color: "#EA4335" }}
                                />
                            </svg>
                            {t("continue_google")}
                        </button>
                    </form>

                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-secondary font-bold tracking-widest">{t("or_with_email")}</span>
                    </div>
                </div>

                <form action={dispatch} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-primary ml-1" htmlFor="email">
                            {t("email")}
                        </label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-border text-primary placeholder:text-secondary font-bold focus:border-slate-900 focus:ring-0 transition-all bg-card"
                            id="email"
                            type="email"
                            name="email"
                            placeholder="nombre@ejemplo.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-primary ml-1" htmlFor="password">
                            {t("password")}
                        </label>
                        <input
                            className="w-full px-4 py-3 rounded-xl border border-border text-primary placeholder:text-secondary font-bold focus:border-slate-900 focus:ring-0 transition-all bg-card"
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <LoginButton />

                    {errorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-bold text-center">
                            {errorMessage}
                        </div>
                    )}
                </form>

                <div className="text-center text-xs text-secondary font-medium">
                    &copy; 2026 Hacheverso. {t("footer")}
                </div>
            </div>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();
    const t = useTranslations("Login");

    return (
        <button
            className="w-full py-3 bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/20 text-white font-bold rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            aria-disabled={pending}
        >
            {pending ? t("entering") : t("enter")}
        </button>
    );
}
