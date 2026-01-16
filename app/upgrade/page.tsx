'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Check, Globe, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function UpgradePage() {
    const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

    const pricing = {
        pro: {
            IDR: { monthly: 150000, yearly: 1500000 },
            USD: { monthly: 10, yearly: 100 }
        },
        enterprise: {
            IDR: { monthly: 1500000, yearly: 15000000 },
            USD: { monthly: 100, yearly: 1000 }
        }
    };

    const formatPrice = (amount: number, curr: 'IDR' | 'USD') => {
        return curr === 'IDR'
            ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
            : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="min-h-screen bg-background-dark font-sans text-slate-200">
            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-background-dark/80 backdrop-blur-sm p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href="/pricing" className="text-sm text-slate-400 hover:text-white">← Back to Plans</Link>
                    <div className="flex bg-black/30 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setCurrency('IDR')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${currency === 'IDR' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            🇮🇩 IDR (Local)
                        </button>
                        <button
                            onClick={() => setCurrency('USD')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${currency === 'USD' ? 'bg-primary text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            🌎 USD (Global)
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-24 pb-20 container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-display font-bold mb-4">Complete Your Upgrade</h1>
                    <p className="text-slate-400">Secure checkout via {currency === 'IDR' ? 'Midtrans (QRIS/Bank)' : 'Lemon Squeezy (International)'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Order Summary */}
                    <GlassCard className="h-fit">
                        <h3 className="font-bold text-lg mb-6 border-b border-white/10 pb-4">Order Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">KilatOS Pro Plan</p>
                                    <p className="text-xs text-slate-400 capitalize">{billing} Subscription</p>
                                </div>
                                <p className="font-mono text-primary font-bold">
                                    {formatPrice(pricing.pro[currency][billing], currency)}
                                </p>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                                <p>Tax / VAT</p>
                                <p>Calculate at checkout</p>
                            </div>
                            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                                <p className="font-bold">Total</p>
                                <p className="font-display font-bold text-xl text-white">
                                    {formatPrice(pricing.pro[currency][billing], currency)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 space-y-3">
                            <button
                                onClick={async () => {
                                    if (currency === 'IDR') {
                                        alert('Redirecting to Midtrans Snap (Simulator)...');
                                        // Real implementation: const { url } = await PaymentService.createMidtransCheckout(...)
                                        // window.location.href = url;
                                    } else {
                                        alert('Redirecting to Lemon Squeezy Checkout...');
                                        // Real implementation: const { url } = await PaymentService.createLemonSqueezyCheckout(...)
                                        // window.location.href = url;
                                    }
                                }}
                                className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <CreditCard className="w-4 h-4" />
                                {currency === 'IDR' ? 'Pay with QRIS / Bank Transfer' : 'Pay with Card / PayPal'}
                            </button>
                            <p className="text-xs text-center text-slate-500">
                                {currency === 'IDR'
                                    ? 'Processed locally by Midtrans. Instant activation.'
                                    : 'Processed globally by Lemon Squeezy as Merchant of Record.'}
                            </p>
                            <p className="text-[10px] text-center text-slate-600 font-mono">
                                [DEV MODE] Payment Gateways are currently in Simulator Mode.
                            </p>
                        </div>
                    </GlassCard>

                    {/* Features Recap */}
                    <div className="space-y-6">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                            <Globe className="w-8 h-8 text-primary mb-4" />
                            <h3 className="font-bold text-lg mb-2">Why we split payments?</h3>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                To ensure the best experience for everyone, we use local banking rails for Indonesia (0% fx fees) and global merchant standards for international customers.
                            </p>
                        </div>

                        <h4 className="font-bold text-sm uppercase text-slate-500 tracking-wider">What you get</h4>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-sm text-slate-300">
                                <span className="bg-green-500/20 text-green-400 rounded-full p-0.5"><Check className="w-3 h-3" /></span>
                                Unlimited AI Generations
                            </li>
                            <li className="flex gap-3 text-sm text-slate-300">
                                <span className="bg-green-500/20 text-green-400 rounded-full p-0.5"><Check className="w-3 h-3" /></span>
                                Access to GPT-4 & Claude 3 Opus
                            </li>
                            <li className="flex gap-3 text-sm text-slate-300">
                                <span className="bg-green-500/20 text-green-400 rounded-full p-0.5"><Check className="w-3 h-3" /></span>
                                Private Knowledge Base RAG
                            </li>
                            <li className="flex gap-3 text-sm text-slate-300">
                                <span className="bg-green-500/20 text-green-400 rounded-full p-0.5"><Check className="w-3 h-3" /></span>
                                Priority Support Response
                            </li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
