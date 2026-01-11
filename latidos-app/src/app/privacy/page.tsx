export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white p-8 md:p-16 max-w-4xl mx-auto font-sans text-slate-800">
            <h1 className="text-3xl font-black mb-6">Política de Privacidad</h1>
            <p className="mb-4">
                <strong>Última actualización:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">1. Introducción</h2>
                <p>
                    Bienvenido a <strong>LATIDOS</strong>. Nos comprometemos a proteger su información personal y su derecho a la privacidad.
                    Si tiene alguna pregunta o inquietud sobre nuestra política o nuestras prácticas con respecto a su información personal,
                    comuníquese con nosotros.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">2. Información que recopilamos</h2>
                <p className="mb-2">
                    Recopilamos información personal que usted nos proporciona voluntariamente al registrarse en el Servicio,
                    como su nombre, dirección de correo electrónico y foto de perfil (a través de Google/Apple).
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Nombres y Apellidos</li>
                    <li>Direcciones de correo electrónico</li>
                    <li>Imágenes de perfil (si utiliza inicio de sesión social)</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">3. Cómo utilizamos su información</h2>
                <p>
                    Utilizamos la información recopilada para crear y gestionar su cuenta de organización en LATIDOS,
                    permitirle iniciar sesión de forma segura y proporcionarle acceso a las funcionalidades del ERP.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-bold mb-3">4. Compartir información</h2>
                <p>
                    No compartimos, vendemos ni alquilamos su información personal a terceros con fines promocionales.
                    Solo compartimos información con proveedores de servicios (como Google o Apple para autenticación)
                    en la medida necesaria para proporcionar el Servicio.
                </p>
            </section>

            <section className="border-t pt-8 text-sm text-slate-500">
                <p>
                    Latidos - ERP System.
                </p>
            </section>
        </div>
    );
}
