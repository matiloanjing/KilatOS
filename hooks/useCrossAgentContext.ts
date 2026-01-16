/**
 * useCrossAgentContext - Hook for loading cross-agent project context
 * 
 * Enables any agent to see what other agents have done on the same project.
 * 
 * Usage:
 * const { context, loading, sendToAgent } = useCrossAgentContext(projectId);
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface AgentData {
    lastUpdate: string;
    messageCount: number;
    hasOutput: boolean;
    outputType?: string;
    summary?: string;
}

export interface ProjectContext {
    projectId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    agents: {
        code?: AgentData;
        design?: AgentData;
        audit?: AgentData;
        docs?: AgentData;
        research?: AgentData;
        write?: AgentData;
        solve?: AgentData;
        question?: AgentData;
        guide?: AgentData;
        idea?: AgentData;
        crawl?: AgentData;
    };
    messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
        agent?: string;
    }>;
    files: Record<string, string>;
}

// Agent route mapping
export const AGENT_ROUTES = {
    code: '/kilatcode',
    design: '/kilatdesign',
    audit: '/kilataudit',
    docs: '/kilatdocs',
    research: '/kilatresearch',
    write: '/kilatwrite',
    solve: '/kilatsolve',
    question: '/kilatquestion',
    guide: '/kilatguide',
    idea: '/kilatidea',
    crawl: '/kilatcrawl',
} as const;

// Map agentType (from pages) to AGENT_ROUTES key
export const AGENT_TYPE_TO_CATEGORY: Record<string, keyof typeof AGENT_ROUTES> = {
    'codegen': 'code',
    'imagegen': 'design',
    'audit': 'audit',
    'docs': 'docs',
    'research': 'research',
    'cowriter': 'write',
    'solve': 'solve',
    'question': 'question',
    'guide': 'guide',
    'ideagen': 'idea',
    'crawl': 'crawl',
    'chat': 'code', // fallback for /chat
};

export const AGENT_NAMES = {
    code: 'KilatCode',
    design: 'KilatDesign',
    audit: 'KilatAudit',
    docs: 'KilatDocs',
    research: 'KilatResearch',
    write: 'KilatWrite',
    solve: 'KilatSolve',
    question: 'KilatQuestion',
    guide: 'KilatGuide',
    idea: 'KilatIdea',
    crawl: 'KilatCrawl',
} as const;

export const AGENT_ICONS = {
    code: 'code',
    design: 'palette',
    audit: 'bug_report',
    docs: 'menu_book',
    research: 'search',
    write: 'edit_note',
    solve: 'calculate',
    question: 'quiz',
    guide: 'auto_stories',
    idea: 'lightbulb',
    crawl: 'language',
} as const;

export const AGENT_COLORS = {
    code: 'blue',
    design: 'indigo',
    audit: 'orange',
    docs: 'cyan',
    research: 'purple',
    write: 'pink',
    solve: 'green',
    question: 'amber',
    guide: 'teal',
    idea: 'yellow',
    crawl: 'red',
} as const;

type AgentType = keyof typeof AGENT_ROUTES;

export function useCrossAgentContext(projectId: string) {
    const router = useRouter();
    const [context, setContext] = useState<ProjectContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load project context
    const loadContext = useCallback(async () => {
        if (!projectId) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/kilat/project/${projectId}/context`);
            const data = await res.json();

            if (data.success) {
                setContext(data.context);
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError('Failed to load project context');
            console.error('[CrossAgent] Load error:', e);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Navigate to another agent with same project
    const sendToAgent = useCallback((agentType: AgentType) => {
        const route = AGENT_ROUTES[agentType];
        router.push(`${route}/c/${projectId}`);
    }, [projectId, router]);

    // Update context with new data
    const updateContext = useCallback(async (agentType: string, data: any) => {
        try {
            await fetch(`/api/kilat/project/${projectId}/context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentType, data }),
            });
            // Reload context
            await loadContext();
        } catch (e) {
            console.error('[CrossAgent] Update error:', e);
        }
    }, [projectId, loadContext]);

    // Get active agents (agents that have done work)
    const getActiveAgents = useCallback((): AgentType[] => {
        if (!context?.agents) return [];
        return Object.entries(context.agents)
            .filter(([_, data]) => data && data.messageCount > 0)
            .map(([type]) => type as AgentType);
    }, [context]);

    // Check if another agent has output
    const hasAgentOutput = useCallback((agentType: AgentType): boolean => {
        return context?.agents?.[agentType]?.hasOutput ?? false;
    }, [context]);

    // Load on mount
    useEffect(() => {
        loadContext();
    }, [loadContext]);

    return {
        context,
        loading,
        error,
        sendToAgent,
        updateContext,
        getActiveAgents,
        hasAgentOutput,
        reload: loadContext,
    };
}
