import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login - KilatOS',
    description: 'Sign in to access your AI Multi-Agent Platform',
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
