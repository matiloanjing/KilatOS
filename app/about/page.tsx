import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Bolt, Users, Globe, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background-dark font-body selection:bg-primary/30 antialiased pt-24 pb-20">
            <div className="container mx-auto px-6 max-w-4xl">
                <PageHeader
                    title="Orchestrating the Digital Future"
                    subtitle="KilatOS is building the world's first truly integrated multi-agent operating system for developers."
                    icon={<Bolt className="w-8 h-8 text-primary animate-pulse" />}
                />

                <div className="space-y-12">
                    {/* Mission Section */}
                    <section>
                        <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-full"></span>
                            Our Mission
                        </h2>
                        <div className="text-lg text-slate-300 leading-relaxed text-justify space-y-4">
                            <p>
                                Software development is becoming increasingly complex. Developers today juggle dozens of tools,
                                contexts, and languages just to ship a single feature. We believe the future isn't just about
                                "faster coding"—it's about <strong>intelligent orchestration</strong>.
                            </p>
                            <p>
                                KilatOS was born from a simple question: <em>What if you had a team of 9 specialized experts
                                    working in perfect harmony, available 24/7?</em>
                            </p>
                        </div>
                    </section>

                    {/* The Team of Agents */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GlassCard className="hover:bg-white/5 transition-colors">
                            <Users className="w-8 h-8 text-secondary mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">9 Specialized Minds</h3>
                            <p className="text-slate-400">
                                Unlike generic LLMs, our agents are specialists. KilatCode handles syntax,
                                KilatSolve handles math, and KilatResearch handles facts.
                            </p>
                        </GlassCard>
                        <GlassCard className="hover:bg-white/5 transition-colors">
                            <Globe className="w-8 h-8 text-accent-green mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">Universal Access</h3>
                            <p className="text-slate-400">
                                Built on open standards and accessible via a unified console.
                                No complex setups, just pure intelligence on demand.
                            </p>
                        </GlassCard>
                    </section>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-8 border-y border-white/10 py-8 text-center">
                        <div>
                            <div className="text-3xl font-display font-bold text-white mb-1">10M+</div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Tasks Processed</div>
                        </div>
                        <div>
                            <div className="text-3xl font-display font-bold text-white mb-1">99.9%</div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Uptime SLA</div>
                        </div>
                        <div>
                            <div className="text-3xl font-display font-bold text-white mb-1">24/7</div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Agent Availability</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
