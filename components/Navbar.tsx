'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-0 w-full z-50 transition-all duration-300 border-b border-white/5 bg-[#0f0f12]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#4f52c9] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-xl">bolt</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">KilatOS</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/agents" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                            Agents
                        </Link>
                        <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/library" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                            Library
                        </Link>
                        <Link href="/pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                            Pricing
                        </Link>
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-white hover:text-[#6366f1] transition-colors">
                            Log In
                        </Link>
                        <Link
                            href="/signup"
                            className="bg-[#6366f1] hover:bg-[#4f52c9] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-[0_0_15px_rgba(100,103,242,0.3)] hover:shadow-[0_0_25px_rgba(100,103,242,0.5)]"
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-gray-300 hover:text-white"
                    >
                        <span className="material-symbols-outlined">
                            {isOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden pb-4 border-t border-white/5 mt-2 pt-4">
                        <div className="flex flex-col gap-4">
                            <Link href="/agents" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                Agents
                            </Link>
                            <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/library" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                Library
                            </Link>
                            <Link href="/pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                                Pricing
                            </Link>
                            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                                <Link href="/login" className="text-sm font-medium text-white hover:text-[#6366f1] transition-colors">
                                    Log In
                                </Link>
                                <Link
                                    href="/signup"
                                    className="bg-[#6366f1] hover:bg-[#4f52c9] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all text-center"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
