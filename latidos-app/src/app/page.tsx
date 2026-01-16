import { auth } from "@/auth";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LayoutDashboard, ShieldCheck, Zap } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await auth();

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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navbar */}
      <nav className="border-b border-slate-100 flex items-center justify-between px-6 py-4 lg:px-12 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <span className="text-xl font-black tracking-tighter">LATIDOS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/register" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            Crear Cuenta
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main>
        <div className="relative isolate px-6 pt-14 lg:px-8">
          <div className="mx-auto max-w-4xl py-24 sm:py-32 lg:py-40 text-center">
            <div className="hidden sm:mb-8 sm:flex sm:justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-slate-600 ring-1 ring-slate-900/10 hover:ring-slate-900/20 bg-slate-50">
                La plataforma todo en uno para tu negocio. <span className="font-semibold text-blue-600">Versión 1.0</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 uppercase">
              Gestiona tu negocio <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">con Latidos</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
              Controla inventario, ventas, logística y finanzas desde un solo lugar.
              Simplifica tus operaciones y toma el control total de tu crecimiento.
            </p>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/register" className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-full hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2">
                Comenzar Ahora <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="text-sm font-bold leading-6 text-slate-900 hover:underline underline-offset-4">
                Ya tengo cuenta <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Features Preview */}
          <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                    <LayoutDashboard className="h-5 w-5 flex-none text-blue-600" />
                    Control Total
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">Dashboard ejecutivo con métricas en tiempo real. Visualiza tus ventas, deudas y flujo de caja al instante.</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                    <Zap className="h-5 w-5 flex-none text-blue-600" />
                    Velocidad Operativa
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">Punto de venta optimizado, inventario sincronizado y logística integrada para entregas más rápidas.</p>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                    <ShieldCheck className="h-5 w-5 flex-none text-blue-600" />
                    Seguro y Escalable
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                    <p className="flex-auto">Tus datos están protegidos. Crea múltiples usuarios, asigna roles y crece sin límites.</p>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-100 py-12 text-center text-sm text-slate-500">
        <p>&copy; 2026 Hacheverso. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
