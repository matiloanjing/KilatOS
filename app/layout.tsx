import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans, Space_Mono } from 'next/font/google';
import './globals.css';
import { BRANDING } from '@/lib/constants/branding';
import { AuthProvider } from '@/lib/auth/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });
const spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-space-mono' });

export const metadata: Metadata = {
    title: `${BRANDING.appName} - ${BRANDING.appTagline}`,
    description: 'AI-Powered Personalized Learning Assistant built with Next.js, Supabase, and Pollination AI. Handcrafted by KilatCode Studio.',
    keywords: ['AI tutor', 'learning assistant', 'problem solver', 'research assistant', 'question generator'],
    authors: [{ name: BRANDING.studioName }],
    creator: BRANDING.studioName,
    openGraph: {
        title: BRANDING.appName,
        description: BRANDING.appTagline,
        type: 'website',
        locale: 'en_US',
        alternateLocale: ['id_ID'],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${plusJakarta.variable} ${spaceMono.variable} dark`}>
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                    rel="stylesheet"
                />
                <link
                    href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
                    rel="stylesheet"
                />
            </head>
            <body className="bg-obsidian text-white font-sans antialiased">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}

