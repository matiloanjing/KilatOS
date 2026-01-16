import Link from 'next/link';
import Image from 'next/image';
import { PricingSection } from '@/components/ui/PricingSection';

export default function Home() {
    return (
        <div className="bg-background-dark text-slate-100 font-body selection:bg-primary/30 antialiased min-h-screen flex flex-col relative overflow-x-hidden">
            {/* Background Grid */}
            <div className="fixed inset-0 pointer-events-none z-0" style={{
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
                               linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)`,
                backgroundSize: '25px 25px',
            }} />

            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-background-dark/80 backdrop-blur-sm">
                <nav className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded shadow-hard">
                            <span className="material-symbols-outlined text-white">bolt</span>
                        </div>
                        <span className="text-2xl font-display font-bold tracking-widest uppercase">KilatOS</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-display font-medium text-slate-400 tracking-wide">
                        <Link className="hover:text-primary transition-colors" href="/about">Agents</Link>
                        <Link className="hover:text-primary transition-colors" href="/dashboard">Workspace</Link>
                        <Link className="hover:text-primary transition-colors" href="/pricing">Pricing</Link>
                        <Link className="hover:text-primary transition-colors" href="/faq">Docs</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm font-display font-semibold hover:text-primary transition-colors tracking-wide">
                            Log in
                        </Link>
                        <Link href="/chat" className="btn-primary px-5 py-2.5 text-sm font-display tracking-wide flex items-center">
                            Launch Console
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="flex-1 relative z-10 text-white">
                <section className="relative pt-40 pb-20 overflow-hidden">
                    <div className="hero-line-purple"></div>
                    <div className="hero-line-cyan"></div>
                    <div className="hero-line-cross-purple"></div>
                    <div className="hero-line-cross-cyan"></div>

                    <div className="container mx-auto px-6 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded panel mb-8 animate-fade-in">
                            <span className="w-2 h-2 rounded-full bg-primary/80"></span>
                            <span className="text-xs font-display font-bold tracking-widest uppercase text-slate-400">Now with 12 Specialized Agents</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold mb-8 tracking-display leading-[1.1]">
                            Orchestrate Your <br />
                            <span className="text-gradient">Digital Workforce</span>
                        </h1>

                        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-12 leading-relaxed tracking-body-tight">
                            KilatOS is the professional-grade AI development platform that coordinates 9 specialized agents to handle code, research, data, and complex logic simultaneously.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                            <Link href="/chat" className="btn-primary w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-2 group font-display tracking-wide">
                                Start Building For Free
                                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </Link>
                            <Link href="/about" className="btn-secondary w-full sm:w-auto px-8 py-4 flex items-center justify-center gap-2 hover:bg-white/5 font-display tracking-wide">
                                Explore Agents
                            </Link>
                        </div>

                        <div className="max-w-5xl mx-auto panel rounded p-8 grid grid-cols-1 md:grid-cols-3 gap-8 md:divide-x divide-border-dark">
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-green-400 mb-2 text-3xl">check_circle</span>
                                <div className="text-3xl md:text-4xl font-display font-bold mb-1 tracking-wide">99.9%</div>
                                <div className="text-sm font-display font-medium text-slate-500 uppercase tracking-widest">Total Uptime</div>
                                <div className="mt-2 text-xs text-green-400 font-display font-semibold tracking-wide">Guaranteed SLA</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-secondary mb-2 text-3xl">query_stats</span>
                                <div className="text-3xl md:text-4xl font-display font-bold mb-1 tracking-wide">10M+</div>
                                <div className="text-sm font-display font-medium text-slate-500 uppercase tracking-widest">Tasks Processed</div>
                                <div className="mt-2 text-xs text-secondary font-display font-semibold tracking-wide">+25% This Week</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="material-symbols-outlined text-primary mb-2 text-3xl">groups</span>
                                <div className="text-3xl md:text-4xl font-display font-bold mb-1 tracking-wide">50k+</div>
                                <div className="text-sm font-display font-medium text-slate-500 uppercase tracking-widest">Active Developers</div>
                                <div className="mt-2 text-xs text-primary font-display font-semibold tracking-wide">Global Community</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-24 relative">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-display uppercase">Meet the Squad</h2>
                            <p className="text-slate-400 max-w-xl mx-auto leading-relaxed tracking-body-tight">12 Specialized Agents working in perfect harmony to accelerate your development lifecycle.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {/* KilatCode */}
                            <Link href="/kilatcode" className="agent-card group hover:border-blue-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-blue-400 text-3xl">code</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-blue-400 transition-colors">KilatCode</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-blue-400/80 mb-4">Code Generation</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Full-stack code generation in 20+ languages with enterprise security standards.</p>
                            </Link>

                            {/* KilatDesign (renamed from KilatImage) */}
                            <Link href="/kilatdesign" className="agent-card group hover:border-indigo-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-indigo-400 text-3xl">palette</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-indigo-400 transition-colors">KilatDesign</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-indigo-400/80 mb-4">UI Design Studio</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Generates UI designs, mockups, and visual assets like Google Stitch.</p>
                            </Link>

                            {/* KilatAudit (NEW) */}
                            <Link href="/kilataudit" className="agent-card group hover:border-orange-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-orange-400 text-3xl">bug_report</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-orange-400 transition-colors">KilatAudit</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-orange-400/80 mb-4">Code Audit</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">GitHub repo auditing for security, quality, and best practices like Jules.</p>
                            </Link>

                            {/* KilatDocs (NEW) */}
                            <Link href="/kilatdocs" className="agent-card group hover:border-cyan-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-cyan-400 text-3xl">menu_book</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-cyan-400 transition-colors">KilatDocs</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-cyan-400/80 mb-4">Documentation</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Auto-generate README, API docs, and code wikis from your codebase.</p>
                            </Link>

                            {/* KilatResearch */}
                            <Link href="/kilatresearch" className="agent-card group hover:border-purple-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-purple-400 text-3xl">search</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-purple-400 transition-colors">KilatResearch</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-purple-400/80 mb-4">Deep Research</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Analyzes whitepapers, web data, and citations like Perplexity.</p>
                            </Link>

                            {/* KilatWrite */}
                            <Link href="/kilatwrite" className="agent-card group hover:border-pink-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-pink-400 text-3xl">edit_note</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-pink-400 transition-colors">KilatWrite</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-pink-400/80 mb-4">Content Engine</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">SEO blogs, technical documentation, and brand-aligned copy at scale.</p>
                            </Link>

                            {/* KilatSolve */}
                            <Link href="/kilatsolve" className="agent-card group hover:border-green-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-green-400 text-3xl">calculate</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-green-400 transition-colors">KilatSolve</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-green-400/80 mb-4">Math & Physics</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Solves complex STEM problems step-by-step like Wolfram Alpha.</p>
                            </Link>

                            {/* KilatQuestion */}
                            <Link href="/kilatquestion" className="agent-card group hover:border-amber-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-amber-400 text-3xl">quiz</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-amber-400 transition-colors">KilatQuestion</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-amber-400/80 mb-4">Quiz Generator</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Creates educational assessments, flashcards, and technical tests.</p>
                            </Link>

                            {/* KilatGuide */}
                            <Link href="/kilatguide" className="agent-card group hover:border-teal-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-teal-400 text-3xl">auto_stories</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-teal-400 transition-colors">KilatGuide</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-teal-400/80 mb-4">Tutorials</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Interactive step-by-step guides and walkthroughs like Scribe.</p>
                            </Link>

                            {/* KilatIdea */}
                            <Link href="/kilatidea" className="agent-card group hover:border-yellow-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-yellow-400 text-3xl">lightbulb</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-yellow-400 transition-colors">KilatIdea</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-yellow-400/80 mb-4">Brainstorming</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Creative direction, feature ideation, and mindmaps like Miro.</p>
                            </Link>

                            {/* KilatCrawl */}
                            <Link href="/kilatcrawl" className="agent-card group hover:border-red-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-red-400 text-3xl">language</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-red-400 transition-colors">KilatCrawl</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-red-400/80 mb-4">Web Scraping</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Extracts structured data from complex web sources like Apify.</p>
                            </Link>

                            {/* KilatChat - General AI Assistant */}
                            <Link href="/chat" className="agent-card group hover:border-emerald-500/50 transition-colors">
                                <div className="agent-icon-container">
                                    <span className="material-symbols-outlined text-emerald-400 text-3xl">chat</span>
                                </div>
                                <h3 className="text-xl font-display font-bold mb-1 tracking-wide group-hover:text-emerald-400 transition-colors">KilatChat</h3>
                                <p className="text-[10px] font-display font-bold tracking-widest uppercase text-emerald-400/80 mb-4">AI Assistant</p>
                                <p className="text-slate-400 text-sm leading-relaxed tracking-body-tight">Your intelligent companion for any task. Think, reason, and create together.</p>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Dynamic Pricing Section */}
                <PricingSection />
            </main>

            <footer className="bg-[#050505] border-t border-border-dark pt-20 pb-10 z-10 relative">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-primary flex items-center justify-center rounded shadow-hard">
                                    <span className="material-symbols-outlined text-white text-sm">bolt</span>
                                </div>
                                <span className="text-xl font-display font-bold tracking-widest uppercase">KilatOS</span>
                            </div>
                            <p className="text-slate-400 text-sm max-w-xs mb-8 tracking-body-tight">
                                Empowering the next generation of builders with specialized, high-performance AI intelligence.
                            </p>
                            <div className="flex gap-4">
                                <Link className="w-10 h-10 bg-card-dark border border-border-dark rounded flex items-center justify-center hover:text-primary transition-colors shadow-hard-secondary hover:shadow-hard" href="#">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path></svg>
                                </Link>
                                <Link className="w-10 h-10 bg-card-dark border border-border-dark rounded flex items-center justify-center hover:text-primary transition-colors shadow-hard-secondary hover:shadow-hard" href="#">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>
                                </Link>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-display font-bold text-sm mb-6 uppercase tracking-widest">Platform</h4>
                            <ul className="space-y-4 text-sm text-slate-400 tracking-body-tight">
                                <li><Link className="hover:text-primary transition-colors" href="/about">Agents Library</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/roadmap">Integrations</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/pricing">Pricing</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/roadmap">Roadmap</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-display font-bold text-sm mb-6 uppercase tracking-widest">Resources</h4>
                            <ul className="space-y-4 text-sm text-slate-400 tracking-body-tight">
                                <li><Link className="hover:text-primary transition-colors" href="/faq">Documentation</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/faq">API Reference</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/contact">Community</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/contact">Help Center</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-display font-bold text-sm mb-6 uppercase tracking-widest">Company</h4>
                            <ul className="space-y-4 text-sm text-slate-400 tracking-body-tight">
                                <li><Link className="hover:text-primary transition-colors" href="/about">About</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/roadmap">Blog</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/about">Careers</Link></li>
                                <li><Link className="hover:text-primary transition-colors" href="/contact">Contact</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-border-dark flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 tracking-body-tight">
                        <p>© 2026 KilatOS AI Platform. All rights reserved.</p>
                        <div className="flex gap-6">
                            <Link className="hover:text-slate-300" href="/privacy">Privacy Policy</Link>
                            <Link className="hover:text-slate-300" href="/terms">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
