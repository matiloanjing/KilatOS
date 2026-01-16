'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OAuthButton from '@/components/auth/OAuthButton';
import { useAuth } from '@/lib/auth/AuthProvider';

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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="w-full max-w-md p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">KilatOS</h1>
                    <p className="text-gray-400">AI-Powered Code Generation</p>
                </div>

                {/* Login Card */}
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
                    <h2 className="text-xl font-semibold text-white text-center mb-6">
                        Sign in to continue
                    </h2>

                    <div className="space-y-4">
                        <OAuthButton provider="github" />
                        <OAuthButton provider="google" />
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            By signing in, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </div>
                </div>

                {/* Benefits */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-xl bg-gray-800/30">
                        <div className="text-2xl mb-2">⚡</div>
                        <p className="text-xs text-gray-400">Fast AI Code Gen</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-800/30">
                        <div className="text-2xl mb-2">📊</div>
                        <p className="text-xs text-gray-400">Usage Analytics</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-800/30">
                        <div className="text-2xl mb-2">🔒</div>
                        <p className="text-xs text-gray-400">Secure Auth</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
