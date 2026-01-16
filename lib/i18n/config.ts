import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'id'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
    en: 'English',
    id: 'Bahasa Indonesia',
};

export const localeFlags: Record<Locale, string> = {
    en: '🇬🇧',
    id: '🇮🇩',
};

export default getRequestConfig(async ({ locale }) => ({
    messages: (await import(`./messages/${locale}.json`)).default,
}));
