'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const email = formData.get('email');
        const password = formData.get('password');

        console.log("Attempting login for:", email);

        await signIn('credentials', {
            email,
            password,
            redirectTo: '/dashboard'
        });
    } catch (error) {
        console.error("Login Error:", error);
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciales inválidas.';
                default:
                    return 'Algo salió mal.';
            }
        }
        throw error;
    }
}

export async function handleSignOut() {
    await signOut();
}
