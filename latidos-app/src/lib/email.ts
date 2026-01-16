import nodemailer from 'nodemailer';

export async function sendInvitationEmail(email: string, token: string, name: string) {
    const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept?token=${token}`;

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.log(`[DEV MODE] Mock Email to ${email}. Link: ${link}`);
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `"LATIDOS Admin" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Invitación a unirte al equipo de LATIDOS',
            html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h1 style="color: #0f172a;">Hola, ${name}!</h1>
                <p>Has sido invitado a unirte a la plataforma de administración de <strong>LATIDOS</strong>.</p>
                <p>Para aceptar la invitación y configurar tu acceso, haz clic en el siguiente enlace:</p>
                
                <a href="${link}" style="
                    display: inline-block;
                    padding: 12px 24px; 
                    background-color: #0f172a; 
                    color: #fff; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    margin: 16px 0;
                    font-weight: bold;
                ">
                    Aceptar Invitación
                </a>

                <p>Este enlace expirará en 48 horas.</p>
                <hr style="border:0; border-top:1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Si no esperabas este correo, puedes ignorarlo.</p>
            </div>
            `,
        });

        console.log(`✅ Email sent successfully to ${email}`);

    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }
}
