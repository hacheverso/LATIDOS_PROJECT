"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export async function loginWithGoogle() {
    await signIn("google", { redirectTo: "/" });
}

export async function loginWithApple() {
    await signIn("apple", { redirectTo: "/" });
}

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/dashboard', // Explicit redirect to Dashboard
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciales incorrectas.'; // Clear error message
                default:
                    return 'Algo salió mal. Intenta de nuevo.';
            }
        }
        throw error;
    }
}

export async function handleSignOut() {
    await signOut();
}
