'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OAuthButton from '@/components/auth/OAuthButton';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LoadingKilat } from '@/components/ui/LoadingKilat';

export default function LoginPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (!loading && user) {
            router.push('/chat');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-obsidian">
                <div className="flex flex-col items-center gap-4">
                    <LoadingKilat />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 opacity-60">
                    <div className="absolute inset-0" style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(100, 103, 242, 0.15) 0%, rgba(15, 15, 18, 0) 50%)'
                    }}></div>
                </div>
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236467f2' fill-opacity='0.05' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")"
                }}></div>

                {/* Glowing orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6366f1]/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#06b6d4]/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="backdrop-blur-xl bg-[rgba(20,20,25,0.6)] border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-primary shadow-hard flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">bolt</span>
                        </div>
                        <span className="text-2xl font-display font-bold tracking-widest uppercase text-white">KilatOS</span>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-display font-bold text-white mb-2 uppercase tracking-wide">
                            Access Terminal
                        </h1>
                        <p className="text-gray-400">
                            Sign in to access your AI agents
                        </p>
                    </div>

                    {/* OAuth Buttons */}
                    <div className="space-y-3">
                        <OAuthButton provider="github" />
                        <OAuthButton provider="google" />
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>
                            By signing in, you agree to our{' '}
                            <Link href="/terms" className="text-[#6366f1] hover:underline">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="text-[#6366f1] hover:underline">
                                Privacy Policy
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Bottom Text */}
                <p className="text-center mt-6 text-gray-400 text-sm">
                    New to KilatOS?{' '}
                    <Link href="/" className="text-[#6366f1] hover:underline font-semibold">
                        Learn more
                    </Link>
                </p>
            </div>
        </div>
    );
}
