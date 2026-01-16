'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import {
    Code,
    Calculator,
    Search,
    PenTool,
    HelpCircle,
    BookOpen,
    Lightbulb,
    Image as ImageIcon,
    Globe
} from 'lucide-react';

const AGENTS = [
    {
        name: 'KilatCode',
        role: 'Code Generation',
        description: 'Full-stack code generation in 20+ languages.',
        icon: <Code className="w-6 h-6 text-blue-400" />,
        gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
        name: 'KilatSolve',
        role: 'Math & Physics',
        description: 'Solves complex STEM problems step-by-step.',
        icon: <Calculator className="w-6 h-6 text-green-400" />,
        gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
        name: 'KilatResearch',
        role: 'Deep Research',
        description: 'Analyzes papers, web data, and citations.',
        icon: <Search className="w-6 h-6 text-purple-400" />,
        gradient: 'from-purple-500/20 to-indigo-500/20'
    },
    {
        name: 'KilatWrite',
        role: 'Content Engine',
        description: 'SEO blogs, copy, and technical documentation.',
        icon: <PenTool className="w-6 h-6 text-pink-400" />,
        gradient: 'from-pink-500/20 to-rose-500/20'
    },
    {
        name: 'KilatQuestion',
        role: 'Quiz Generator',
        description: 'Creates educational assessments instantly.',
        icon: <HelpCircle className="w-6 h-6 text-yellow-400" />,
        gradient: 'from-yellow-500/20 to-orange-500/20'
    },
    {
        name: 'KilatGuide',
        role: 'Tutorials',
        description: 'Step-by-step guides and walkthroughs.',
        icon: <BookOpen className="w-6 h-6 text-teal-400" />,
        gradient: 'from-teal-500/20 to-cyan-500/20'
    },
    {
        name: 'KilatIdea',
        role: 'Brainstorming',
        description: 'Creative direction and feature ideation.',
        icon: <Lightbulb className="w-6 h-6 text-amber-400" />,
        gradient: 'from-amber-500/20 to-yellow-500/20'
    },
    {
        name: 'KilatImage',
        role: 'Visual Arts',
        description: 'Generates assets, UI mocks, and diagrams.',
        icon: <ImageIcon className="w-6 h-6 text-fuchsia-400" />,
        gradient: 'from-fuchsia-500/20 to-purple-500/20'
    },
    {
        name: 'KilatCrawl',
        role: 'Web Scraping',
        description: 'Extracts data from complex web sources.',
        icon: <Globe className="w-6 h-6 text-indigo-400" />,
        gradient: 'from-indigo-500/20 to-blue-500/20'
    }
];

export default function AgentsGrid() {
    return (
        <section className="py-24 bg-[#0a0118] relative">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Meet the Squad
                    </h2>
                    <p className="text-xl text-gray-400">
                        9 Specialized Agents working in perfect harmony.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {AGENTS.map((agent) => (
                        <GlassCard key={agent.name} hoverEffect={true} className="group cursor-pointer">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5`}>
                                {agent.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
                                {agent.name}
                            </h3>
                            <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                                {agent.role}
                            </p>
                            <p className="text-gray-400">
                                {agent.description}
                            </p>
                        </GlassCard>
                    ))}
                </div>
            </div>
        </section>
    );
}
