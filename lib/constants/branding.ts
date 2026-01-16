/**
 * KilatCode Branding Constants
 * Copyright © 2025 KilatCode Studio
 */

export const KILATCODE_ASCII_LOGO = `
██╗  ██╗██╗██╗      █████╗ ████████╗ ██████╗ ██████╗ ██████╗ ███████╗
██║ ██╔╝██║██║     ██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
█████╔╝ ██║██║     ███████║   ██║   ██║     ██║   ██║██║  ██║█████╗  
██╔═██╗ ██║██║     ██╔══██║   ██║   ██║     ██║   ██║██║  ██║██╔══╝  
██║  ██╗██║███████╗██║  ██║   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
`;

export const BRANDING = {
    // Application
    appName: 'KilatOS',
    appTagline: 'AI-Powered Learning Assistant',

    // Studio
    studioName: 'KilatCode Studio',
    studioTagline: 'Handcrafted by KilatCode Studio',

    // Copyright
    year: '2025',
    copyright: `Copyright © 2025 KilatCode. All rights reserved.`,

    // Social
    website: 'https://kilatcode.com',
    github: 'https://github.com/kilatcode',

    // Version
    version: '1.0.0',
    buildDate: new Date().toISOString(),
} as const;

export const CONSOLE_LOGO = () => {
    console.log('\n' + KILATCODE_ASCII_LOGO);
    console.log('🚀 ' + BRANDING.appTagline);
    console.log('🌟 ' + BRANDING.studioTagline);
    console.log('📅 ' + BRANDING.copyright);
    console.log('');
};

export const BRAND_COLORS = {
    primary: {
        light: '#38bdf8',
        DEFAULT: '#0ea5e9',
        dark: '#0369a1',
    },
    secondary: {
        light: '#e879f9',
        DEFAULT: '#d946ef',
        dark: '#a21caf',
    },
    accent: {
        light: '#fb923c',
        DEFAULT: '#f97316',
        dark: '#c2410c',
    },
} as const;

export const EMOJIS = {
    rocket: '🚀',
    star: '🌟',
    lightning: '⚡',
    brain: '🧠',
    book: '📚',
    search: '🔍',
    lightbulb: '💡',
    check: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
} as const;
