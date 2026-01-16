'use client';
/**
 * CrossAgentPanel - Shows related data from other agents
 * 
 * Displays what other agents have contributed to this project.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { useCrossAgentContext, AGENT_NAMES, AGENT_ICONS, AGENT_COLORS, AGENT_ROUTES } from '@/hooks/useCrossAgentContext';

interface CrossAgentPanelProps {
    projectId: string;
    currentAgent: keyof typeof AGENT_ROUTES;
    onSendTo?: (agent: keyof typeof AGENT_ROUTES) => void;
}

export function CrossAgentPanel({ projectId, currentAgent, onSendTo }: CrossAgentPanelProps) {
    const { context, loading, sendToAgent, getActiveAgents } = useCrossAgentContext(projectId);

    if (loading) {
        return (
            <div className="p-4 bg-white/5 rounded-lg animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-white/10 rounded w-3/4"></div>
            </div>
        );
    }

    const activeAgents = getActiveAgents().filter(a => a !== currentAgent);

    if (activeAgents.length === 0) {
        return (
            <div className="p-4 bg-white/5 rounded-lg text-center text-slate-500">
                <span className="material-symbols-outlined text-2xl mb-2">hub</span>
                <p className="text-sm">No other agents have worked on this project yet.</p>
                <p className="text-xs mt-1">Start by creating something here!</p>
            </div>
        );
    }

    const handleSendTo = (agent: keyof typeof AGENT_ROUTES) => {
        if (onSendTo) onSendTo(agent);
        sendToAgent(agent);
    };

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">hub</span>
                Connected Agents
            </h4>

            {activeAgents.map(agent => {
                const data = context?.agents?.[agent];
                const color = AGENT_COLORS[agent];

                return (
                    <div
                        key={agent}
                        className={`p-3 rounded-lg border border-${color}-500/20 bg-${color}-500/5 hover:bg-${color}-500/10 transition-colors cursor-pointer`}
                        onClick={() => handleSendTo(agent)}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`material-symbols-outlined text-${color}-400`}>
                                {AGENT_ICONS[agent]}
                            </span>
                            <span className="font-medium text-sm">{AGENT_NAMES[agent]}</span>
                            {data?.hasOutput && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    {data.outputType}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400">
                            {data?.messageCount || 0} messages
                            {data?.lastUpdate && (
                                <span className="ml-2 text-slate-500">
                                    • {new Date(data.lastUpdate).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}

            <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-slate-500 text-center">
                    Click to continue in another agent
                </p>
            </div>
        </div>
    );
}

// Simple badge showing connected agents count
export function ConnectedAgentsBadge({ projectId, currentAgent }: { projectId: string; currentAgent: keyof typeof AGENT_ROUTES }) {
    const { getActiveAgents } = useCrossAgentContext(projectId);
    const activeAgents = getActiveAgents().filter(a => a !== currentAgent);

    if (activeAgents.length === 0) return null;

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
            <span className="material-symbols-outlined text-xs">hub</span>
            {activeAgents.length} connected
        </span>
    );
}
