import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // KilatOS Agent Theme
                'primary': '#8B5CF6', // Royal Purple (Updated)
                'primary-dark': '#7c3aed',
                'background-light': '#F8FAFC',
                'background-dark': '#0A0A0B', // Deep Obsidian (Updated)
                'card-dark': '#161618', // New
                'obsidian': '#121212',
                'panel-border': '#2d1b3d',
                'accent-purple': '#A855F7', // Updated
                'accent-cyan': '#22D3EE', // New
                'border-dark': '#333', // New
                'charcoal': '#0F1115',
                'charcoal-light': '#18181b',
                'border-premium': '#2d1b3d',
                'glass-border': 'rgba(255, 255, 255, 0.08)',
                // Legacy KilatCode Brand Colors (keep for compatibility)
                secondary: {
                    50: '#fdf4ff',
                    100: '#fae8ff',
                    200: '#f5d0fe',
                    300: '#f0abfc',
                    400: '#e879f9',
                    500: '#d946ef',
                    600: '#c026d3',
                    700: '#a21caf',
                    800: '#86198f',
                    900: '#701a75',
                    950: '#4a044e',
                },
                accent: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'var(--font-inter)', 'system-ui', 'sans-serif'],
                body: ['Inter', 'var(--font-inter)', 'system-ui', 'sans-serif'],
                display: ['Space Mono', 'var(--font-space-mono)', 'monospace'], // New
                mono: ['JetBrains Mono', 'var(--font-jetbrains-mono)', 'monospace'],
            },
            boxShadow: {
                'glow-purple': '0 0 20px rgba(139, 92, 246, 0.15)',
                'glow-sm': '0 0 10px rgba(139, 92, 246, 0.1)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'hard': '4px 4px 0px rgba(139, 92, 246, 0.5)',
                'hard-secondary': '4px 4px 0px rgba(6, 182, 212, 0.5)',
                'hard-hover': '6px 6px 0px rgba(139, 92, 246, 0.7)',
            },
            animation: {
                'fade-in': 'fadeIn 1s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'gradient-primary': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                'premium-sheen': 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
    ],
}

export default config
