import { PricingSection } from '@/components/ui/PricingSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-background-dark font-body selection:bg-primary/30 antialiased">
            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-background-dark/80 backdrop-blur-sm">
                <nav className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded shadow-hard">
                            <span className="material-symbols-outlined text-white">bolt</span>
                        </div>
                        <span className="text-2xl font-display font-bold tracking-widest uppercase text-white">KilatOS</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/chat" className="text-sm font-display font-semibold text-slate-400 hover:text-white transition-colors tracking-wide">
                            Back to Console
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="pt-32 pb-20">
                <div className="container mx-auto px-6 mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-display text-white">
                        Upgrade Your Intelligence
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        Scale your workforce with professional-grade models, higher memory limits, and priority processing.
                    </p>
                </div>

                {/* Reuse existing Pricing Component */}
                <PricingSection />
            </main>
        </div>
    );
}
