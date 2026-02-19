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

export function stringToPastelColor(str: string) {
    if (!str) return { backgroundColor: "hsl(210, 40%, 96%)", color: "hsl(215, 16%, 47%)" };
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return {
        backgroundColor: `hsl(${hue}, 100%, 96%)`,
        color: `hsl(${hue}, 80%, 35%)`
    };
}

export function sanitizeSerial(serial: string): string {
    if (!serial) return "";
    // Remove control characters, invisible separators, and trim whitespace
    return serial.replace(/[\x00-\x1F\x7F\u200B-\u200D\uFEFF\u00A0]/g, "").trim();
}
