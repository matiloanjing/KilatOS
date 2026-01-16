import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Map, CheckCircle2, Circle, Clock } from 'lucide-react';

export default function RoadmapPage() {
    const phases = [
        {
            title: "Phase 1: Foundation",
            status: "completed",
            period: "Q4 2025",
            items: [
                "Multi-Agent Orchestration Core",
                "KilatCode (Coding Agent) v1.0",
                "KilatSolve (Math Agent) v1.0",
                "Supabase Auth & Database Integration"
            ]
        },
        {
            title: "Phase 2: Deep Integration",
            status: "active",
            period: "Q1 2026 (Now)",
            items: [
                "GitHub MCP Integration (Code Search)",
                "Filesystem Access (Local Dev)",
                "Real-time Logic Streaming",
                "Pro & Enterprise Tiers"
            ]
        },
        {
            title: "Phase 3: Visualization",
            status: "upcoming",
            period: "Q2 2026",
            items: [
                "Live Logic Flowchart Dashboard",
                "Agent Status Monitor",
                "Advanced Code Analytics",
                "Team Collaboration Features"
            ]
        },
        {
            title: "Phase 4: Autonomy",
            status: "future",
            period: "Q3 2026+",
            items: [
                "Knowledge Graphs (RAG v2)",
                "Fully Autonomous Testing Agents",
                "Self-Healing Code Pipelines",
                "On-Premise Deployment"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-background-dark font-body selection:bg-primary/30 antialiased pt-24 pb-20">
            <div className="container mx-auto px-6 max-w-4xl">
                <PageHeader
                    title="Product Roadmap"
                    subtitle="Our journey to building the ultimate AI operating system."
                    icon={<Map className="w-8 h-8 text-yellow-400" />}
                />

                <div className="relative border-l-2 border-white/10 ml-4 space-y-12">
                    {phases.map((phase, idx) => (
                        <div key={idx} className="relative pl-8">
                            {/* Timeline Dot */}
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 
                                ${phase.status === 'completed' ? 'bg-primary border-primary' :
                                    phase.status === 'active' ? 'bg-accent-green border-accent-green animate-pulse' :
                                        'bg-background-dark border-slate-500'}`}
                            ></div>

                            <div className="mb-2 flex items-center gap-3">
                                <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded
                                    ${phase.status === 'active' ? 'bg-accent-green/20 text-accent-green' : 'bg-white/5 text-slate-400'}`}>
                                    {phase.period}
                                </span>
                            </div>

                            <GlassCard className={`transition-all ${phase.status === 'active' ? 'border-primary/50 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : ''}`}>
                                <h3 className="text-xl font-display font-bold text-white mb-4">
                                    {phase.title}
                                </h3>
                                <ul className="space-y-3">
                                    {phase.items.map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                            {phase.status === 'completed' ? (
                                                <CheckCircle2 className="w-5 h-5 text-primary" />
                                            ) : phase.status === 'active' ? (
                                                <Clock className="w-5 h-5 text-accent-green" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-600" />
                                            )}
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
