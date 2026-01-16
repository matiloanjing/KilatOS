'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LoadingKilat } from '@/components/ui/LoadingKilat';

interface TierData {
    tier: string;
    name: string;
    price: number;
    period: string;
    limits: {
        codeDaily: number;
        codeMonthly: number;
        imageDaily: number;
        imageMonthly: number;
        maxDailyCost: number;
    };
    features: string[];
}

export function PricingSection() {
    const [tiers, setTiers] = useState<TierData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await fetch('/api/pricing');
                if (res.ok) {
                    const data = await res.json();
                    setTiers(data.tiers || []);
                }
            } catch (err) {
                console.error('Failed to fetch pricing:', err);
                // Fallback data
                setTiers([
                    { tier: 'free', name: 'Free', price: 0, period: 'forever', limits: { codeDaily: 100, codeMonthly: 3000, imageDaily: 50, imageMonthly: 1500, maxDailyCost: 0.20 }, features: ['Basic AI agents', 'Community support', 'Standard models'] },
                    { tier: 'pro', name: 'Pro', price: 29, period: 'month', limits: { codeDaily: 500, codeMonthly: 15000, imageDaily: 500, imageMonthly: 15000, maxDailyCost: 1.0 }, features: ['All AI agents', 'Priority support', 'Premium models', 'RAG search', 'Custom knowledge base'] },
                    { tier: 'enterprise', name: 'Enterprise', price: 149, period: 'month', limits: { codeDaily: 2500, codeMonthly: 75000, imageDaily: 2000, imageMonthly: 60000, maxDailyCost: 5.0 }, features: ['Everything in Pro', 'Dedicated support', 'Enterprise models', 'Team collaboration', 'Custom integrations', 'SLA guarantee'] },
                ]);
            }
            setLoading(false);
        };
        fetchPricing();
    }, []);

    if (loading) {
        return (
            <section id="pricing" className="py-24 relative">
                <div className="container mx-auto px-6 flex justify-center">
                    <LoadingKilat />
                </div>
            </section>
        );
    }

    return (
        <section id="pricing" className="py-24 relative">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-display uppercase">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-slate-400 max-w-xl mx-auto leading-relaxed tracking-body-tight">
                        Start free forever. Upgrade when you need more power.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {tiers.map((tier, idx) => (
                        <div
                            key={tier.tier}
                            className={`panel rounded-xl p-8 flex flex-col ${tier.tier === 'pro' ? 'border-2 border-primary relative' : ''
                                }`}
                        >
                            {tier.tier === 'pro' && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-widest">
                                    Most Popular
                                </div>
                            )}

                            <h3 className="text-2xl font-display font-bold mb-2 tracking-wide">{tier.name}</h3>

                            <div className="mb-6">
                                <span className="text-5xl font-display font-bold text-gradient">
                                    ${tier.price}
                                </span>
                                <span className="text-slate-400 text-sm">/{tier.period}</span>
                            </div>

                            {/* Usage Limits */}
                            <div className="mb-6 p-4 rounded-lg bg-white/5 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Code requests</span>
                                    <span className="font-mono text-white">{tier.limits.codeDaily}/day</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Image requests</span>
                                    <span className="font-mono text-white">{tier.limits.imageDaily}/day</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Monthly total</span>
                                    <span className="font-mono text-accent-cyan">{(tier.limits.codeMonthly + tier.limits.imageMonthly).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Features */}
                            <ul className="space-y-3 mb-8 flex-1">
                                {tier.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                        <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            <Link
                                href={tier.tier === 'free' ? '/chat' : '/upgrade'}
                                className={`w-full py-3 text-center font-semibold rounded-lg transition-all ${tier.tier === 'pro'
                                    ? 'btn-primary'
                                    : 'border border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                {tier.tier === 'free' ? 'Get Started Free' : tier.tier === 'pro' ? 'Upgrade to Pro' : 'Contact Sales'}
                            </Link>
                        </div>
                    ))}
                </div>

                <p className="text-center text-slate-500 text-sm mt-8">
                    All plans include daily reset at midnight UTC. Unused quota does not carry over.
                </p>
            </div>
        </section>
    );
}

export default PricingSection;
