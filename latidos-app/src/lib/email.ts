import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123_dev_placeholder');

export async function sendInvitationEmail(email: string, token: string, name: string) {
    if (!process.env.RESEND_API_KEY) {
        console.log(`[DEV MODE] Email to ${email} suppressed.Token: ${token} `);
        return;
    }

    const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'} /invite/accept ? token = ${token} `;

    try {
        await resend.emails.send({
            from: 'LATIDOS <onboarding@resend.dev>', // Use resend.dev for testing if domain not verified
            to: email,
            subject: 'Invitación a unirte al equipo de LATIDOS',
            html: `
    < div >
    <h1>Hola, ${name} !</h1>
        < p > Has sido invitado a unirte a la plataforma de administración de < strong > LATIDOS < /strong>.</p >
            <p>Para aceptar la invitación y configurar tu acceso, haz clic en el siguiente enlace: </p>
                < a href = "${link}" style = "padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;" >
                    Aceptar Invitación
                        </a>
                        < p > Este enlace expirará en 48 horas.</p>
                            < p style = "font-size: 12px; color: #666;" > Si no esperabas este correo, puedes ignorarlo.</p>
                                </div>
                                    `
        });
    } catch (error) {
        console.error("Failed to send email:", error);
        // Don't throw to prevent blocking the UI, but log it.
    }
}
