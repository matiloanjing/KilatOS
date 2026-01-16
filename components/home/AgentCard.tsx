'use client';

import Link from 'next/link';
import { Agent } from '@/lib/data/agents';

interface AgentCardProps {
    agent: Agent;
    index: number;
}

export default function AgentCard({ agent, index }: AgentCardProps) {
    const delay = index * 100; // Stagger animation

    return (
        <div
            className="backdrop-blur-xl bg-[rgba(20,20,25,0.6)] border border-white/10 p-6 rounded-xl hover:border-opacity-50 transition-all duration-300 group hover:-translate-y-1"
            style={{
                borderColor: `${agent.colorHex}33`,
                animationDelay: `${delay}ms`
            }}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="p-3 rounded-lg flex items-center justify-center transition-colors"
                    style={{
                        backgroundColor: `${agent.colorHex}20`,
                        color: agent.colorHex
                    }}
                >
                    <span className="material-symbols-outlined text-2xl">{agent.icon}</span>
                </div>
                <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-gray-400 border border-white/5">
                    {agent.category}
                </span>
            </div>

            <h3
                className="text-xl font-bold text-white mb-2 group-hover:transition-colors"
                style={{
                    color: 'white'
                }}
            >
                {agent.displayName}
            </h3>

            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                {agent.description}
            </p>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500">v{agent.version}</span>
                <Link
                    href={`/agents/${agent.id}`}
                    className="text-sm font-medium text-white flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                    Deploy Agent <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
            </div>
        </div>
    );
}
