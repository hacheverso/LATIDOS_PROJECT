import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatCompactCurrency(amount: number) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
        notation: "compact", // "5.1M" or similar
        compactDisplay: "short"
    }).format(amount);
}

export function formatDate(date: string | Date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("es-CO", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}
