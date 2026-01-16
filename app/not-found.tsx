'use client';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-charcoal text-white font-sans flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md text-center space-y-8">
                {/* Animated Error Graphic */}
                <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-4 border-white/5 rounded-full animate-ping delay-700"></div>
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 flex items-center justify-center bg-charcoal-light rounded-full border border-white/10 shadow-2xl">
                        <span className="text-4xl font-mono text-primary rotate-12">404</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-display font-bold tracking-tight">
                        Page Not Found
                    </h1>
                    <p className="text-slate-400">
                        The neural pathway you are looking for has been disconnected or does not exist.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/chat"
                        className="px-6 py-3 bg-primary text-charcoal font-bold rounded-xl hover:bg-primary-light transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-icons-round text-lg">chat</span>
                        Back to Chat
                    </Link>

                    <Link
                        href="/"
                        className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-icons-round text-lg">home</span>
                        Home
                    </Link>
                </div>

                <div className="pt-12 text-xs font-mono text-slate-600">
                    ERROR_CODE: NEURAL_LINK_BROKEN
                </div>
            </div>
        </div>
    );
}
