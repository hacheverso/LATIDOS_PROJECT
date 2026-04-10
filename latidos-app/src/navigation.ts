// Fallback for Next-intl 3/4 versions
import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'es'] as const;

export const { Link, redirect, usePathname, useRouter } = createNavigation({
    locales,
    defaultLocale: 'en'
} as any);
