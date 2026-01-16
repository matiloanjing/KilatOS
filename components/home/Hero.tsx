'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0f0f12] to-[#0f0f12]" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px] animate-pulse-slow" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[128px] animate-pulse-slow delay-700" />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in-up">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">Now with 9 Specialized Agents</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight animate-fade-in-up delay-100">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                        Orchestrate Your
                    </span>
                    <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899]">
                        Digital Workforce
                    </span>
                </h1>

                <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
                    KilatOS is the advanced AI platform that coordinates 9 specialized agents
                    to handle code, content, data, and learning tasks simultaneously.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                    <Link
                        href="/auth/signup"
                        className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
                    >
                        Start For Free
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        href="/agents"
                        className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors backdrop-blur-sm"
                    >
                        View Agents
                    </Link>
                </div>
            </div>
        </section>
    );
}
