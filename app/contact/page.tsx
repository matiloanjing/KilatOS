import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Mail, MessageSquare, Twitter, Github } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-background-dark font-body selection:bg-primary/30 antialiased pt-24 pb-20">
            <div className="container mx-auto px-6 max-w-4xl">
                <PageHeader
                    title="Get in Touch"
                    subtitle="Our team (and agents) are always ready to help. Reach out for support, partnerships, or just to say hi."
                    icon={<MessageSquare className="w-8 h-8 text-secondary" />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Support Channels */}
                    <div className="space-y-6">
                        <section>
                            <h2 className="text-xl font-display font-bold text-white mb-4">Support Channels</h2>
                            <div className="space-y-4">
                                <GlassCard className="flex items-center gap-4 hover:border-primary/50 transition-colors">
                                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <Mail className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Email Support</h3>
                                        <p className="text-sm text-slate-400">support@kilatos.ai</p>
                                        <p className="text-xs text-slate-500 mt-1">Response time: &lt; 24 hrs</p>
                                    </div>
                                </GlassCard>

                                <GlassCard className="flex items-center gap-4 hover:border-secondary/50 transition-colors">
                                    <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                                        <Twitter className="w-6 h-6 text-secondary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">Twitter / X</h3>
                                        <p className="text-sm text-slate-400">@KilatOS_AI</p>
                                        <p className="text-xs text-slate-500 mt-1">Daily updates & tips</p>
                                    </div>
                                </GlassCard>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-display font-bold text-white mb-4">Enterprise</h2>
                            <p className="text-slate-400 text-sm mb-4">
                                Need custom SLA, private deployment, or dedicated agents?
                            </p>
                            <Link href="/pricing" className="btn-secondary w-full flex items-center justify-center">
                                Contact Enterprise Sales
                            </Link>
                        </section>
                    </div>

                    {/* Contact Form */}
                    <GlassCard>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Subject</label>
                                <select className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors">
                                    <option>General Inquiry</option>
                                    <option>Technical Support</option>
                                    <option>Billing Issue</option>
                                    <option>Feature Request</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Message</label>
                                <textarea
                                    className="w-full bg-background-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[150px]"
                                    placeholder="How can we help you?"
                                ></textarea>
                            </div>
                            <button className="btn-primary w-full py-3 font-bold">
                                Send Message
                            </button>
                        </form>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
