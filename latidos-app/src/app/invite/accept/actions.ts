'use server';

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";

export async function acceptInvitation(token: string, formData: FormData) {
    const password = formData.get("password") as string;
    const pin = formData.get("pin") as string;

    // Validate Token
    const user = await prisma.user.findUnique({
        where: { invitationToken: token }
    });

    if (!user) {
        throw new Error("Invitación inválida o expirada.");
    }

    if (user.invitationExpires && user.invitationExpires < new Date()) {
        throw new Error("Esta invitación ha expirado. Contacta al administrador.");
    }

    // Update User Credentials
    const hashedPassword = await hash(password, 10);
    const hashedPin = await hash(pin, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            securityPin: hashedPin,
            status: 'ACTIVE',
            invitationToken: null, // Consume token
            invitationExpires: null
        }
    });

    redirect("/login?success=true");
}

export async function checkInvitationWarning(token: string) {
    const user = await prisma.user.findUnique({ where: { invitationToken: token } });
    if (!user) return "Invitación no encontrada.";
    if (user.invitationExpires && user.invitationExpires < new Date()) return "Invitación expirada.";
    return null;
}
