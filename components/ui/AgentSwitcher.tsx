'use client';
/**
 * AgentSwitcher - Quick switch between agents for same project
 * 
 * Shows which agents have data and allows navigation.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { useCrossAgentContext, AGENT_NAMES, AGENT_ICONS, AGENT_COLORS, AGENT_ROUTES } from '@/hooks/useCrossAgentContext';

interface AgentSwitcherProps {
    projectId: string;
    currentAgent: keyof typeof AGENT_ROUTES;
}

export function AgentSwitcher({ projectId, currentAgent }: AgentSwitcherProps) {
    const { context, loading, sendToAgent, getActiveAgents } = useCrossAgentContext(projectId);

    if (loading) return null;

    const activeAgents = getActiveAgents();
    const allAgents = Object.keys(AGENT_ROUTES) as Array<keyof typeof AGENT_ROUTES>;

    return (
        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
            <span className="text-xs text-slate-500 mr-2">Switch:</span>
            {allAgents.map(agent => {
                const isActive = activeAgents.includes(agent);
                const isCurrent = agent === currentAgent;
                const color = AGENT_COLORS[agent];

                return (
                    <button
                        key={agent}
                        onClick={() => !isCurrent && sendToAgent(agent)}
                        disabled={isCurrent}
                        title={`${AGENT_NAMES[agent]}${isActive ? ' (has data)' : ''}`}
                        className={`
                            w-8 h-8 rounded-lg flex items-center justify-center transition-all
                            ${isCurrent
                                ? `bg-${color}-500/30 text-${color}-400 ring-2 ring-${color}-500`
                                : isActive
                                    ? `bg-${color}-500/10 text-${color}-400 hover:bg-${color}-500/20`
                                    : 'bg-white/5 text-slate-500 hover:bg-white/10'
                            }
                        `}
                    >
                        <span className="material-symbols-outlined text-sm">{AGENT_ICONS[agent]}</span>
                    </button>
                );
            })}
        </div>
    );
}

// Compact version for header
export function AgentSwitcherCompact({ projectId, currentAgent }: AgentSwitcherProps) {
    const { sendToAgent, getActiveAgents } = useCrossAgentContext(projectId);
    const activeAgents = getActiveAgents();

    return (
        <div className="relative group overflow-visible shrink-0">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-lg text-xs text-slate-300 hover:bg-white/10 transition border border-white/5">
                <span className="material-symbols-outlined text-sm text-primary">{AGENT_ICONS[currentAgent]}</span>
                <span className="font-medium truncate max-w-[80px]">{AGENT_NAMES[currentAgent]}</span>
                <span className="material-symbols-outlined text-sm text-slate-500">expand_more</span>
            </button>

            <div className="absolute top-full left-0 mt-1 w-56 bg-[#0d0d12] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] max-h-[320px] overflow-y-auto py-1">
                {(Object.keys(AGENT_ROUTES) as Array<keyof typeof AGENT_ROUTES>).map(agent => {
                    const isActive = activeAgents.includes(agent);
                    const isCurrent = agent === currentAgent;

                    return (
                        <button
                            key={agent}
                            onClick={() => !isCurrent && sendToAgent(agent)}
                            disabled={isCurrent}
                            className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm hover:bg-white/5 transition ${isCurrent ? 'bg-primary/10 text-primary' : 'text-slate-300'}`}
                        >
                            <span className="material-symbols-outlined text-lg" style={{ color: `var(--${AGENT_COLORS[agent]}-400, #8b5cf6)` }}>
                                {AGENT_ICONS[agent]}
                            </span>
                            <span className="flex-1 font-medium">{AGENT_NAMES[agent]}</span>
                            {isActive && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Has data" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
