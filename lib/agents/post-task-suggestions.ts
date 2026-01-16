/**
 * Post-Task Suggestions - CLIENT SAFE
 * 
 * This file contains ONLY the workflow suggestion logic, 
 * NO server-side imports. Safe to use in 'use client' components.
 * 
 * Copyright © 2026 KilatCode Studio
 */

// Agent type definition (duplicated to avoid server import chain)
export type AgentType = 'research' | 'crawl' | 'imagegen' | 'kilatimage' | 'codegen' | 'audit' | 'docs' | 'cowriter' | 'solve' | 'question' | 'guide' | 'ideagen' | 'chat';

// Agent display names
const AGENT_NAMES: Record<AgentType, string> = {
    research: 'KilatResearch',
    crawl: 'KilatCrawl',
    imagegen: 'KilatDesign',
    kilatimage: 'KilatImage',
    codegen: 'KilatCode',
    audit: 'KilatAudit',
    docs: 'KilatDocs',
    cowriter: 'KilatWrite',
    solve: 'KilatSolve',
    question: 'KilatQuestion',
    guide: 'KilatGuide',
    ideagen: 'KilatIdea',
    chat: 'KilatChat',
};

// Route map for navigation
export const AGENT_ROUTES: Record<string, string> = {
    codegen: 'kilatcode',
    imagegen: 'kilatdesign',
    kilatimage: 'kilatdesign',
    audit: 'kilataudit',
    docs: 'kilatdocs',
    research: 'kilatresearch',
    cowriter: 'kilatwrite',
    solve: 'kilatsolve',
    question: 'kilatquestion',
    guide: 'kilatguide',
    ideagen: 'kilatidea',
    crawl: 'kilatcrawl',
    chat: 'chat',
};

export interface AgentSuggestion {
    agent: AgentType;
    name: string;
    reason: string;
    confidence: number;
    priority: number;
    estimated_tokens: number;
    auto_allowed: boolean;
}

/**
 * Workflow map: After completing agent X, suggest these agents
 */
export const POST_TASK_FLOW: Record<AgentType, { agent: AgentType, reason: string }[]> = {
    ideagen: [
        { agent: 'codegen', reason: '🚀 Implementasi ide dengan KilatCode' },
        { agent: 'research', reason: '📚 Riset lebih dalam tentang konsep ini' },
    ],
    codegen: [
        { agent: 'imagegen', reason: '🎨 Buat mockup UI dengan KilatDesign' },
        { agent: 'audit', reason: '🛡️ Audit keamanan kode dengan KilatAudit' },
        { agent: 'docs', reason: '📖 Generate dokumentasi dengan KilatDocs' },
    ],
    imagegen: [
        { agent: 'codegen', reason: '💻 Implementasi desain ke kode' },
    ],
    research: [
        { agent: 'ideagen', reason: '💡 Brainstorm ide berdasarkan temuan' },
        { agent: 'codegen', reason: '🚀 Build berdasarkan hasil riset' },
    ],
    audit: [
        { agent: 'codegen', reason: '🔧 Perbaiki masalah di KilatCode' },
    ],
    docs: [],
    cowriter: [
        { agent: 'docs', reason: '📖 Format sebagai dokumentasi' },
    ],
    solve: [
        { agent: 'guide', reason: '📝 Buat tutorial dari solusi ini' },
    ],
    question: [
        { agent: 'guide', reason: '📝 Buat tutorial pendukung' },
    ],
    guide: [
        { agent: 'question', reason: '❓ Buat kuis untuk menguji pemahaman' },
    ],
    crawl: [
        { agent: 'codegen', reason: '🚀 Build berdasarkan data scraping' },
        { agent: 'research', reason: '📚 Analisis data lebih dalam' },
    ],
    chat: [],
    kilatimage: [],
};

/**
 * Get post-task suggestions based on completed agent
 * CLIENT-SAFE: No server imports
 */
export function getPostTaskSuggestions(completedAgent: AgentType): AgentSuggestion[] {
    const flows = POST_TASK_FLOW[completedAgent] || [];

    return flows.map((flow, index) => ({
        agent: flow.agent,
        name: AGENT_NAMES[flow.agent],
        reason: flow.reason,
        confidence: 0.85 - (index * 0.05),
        priority: index + 1,
        estimated_tokens: 500,
        auto_allowed: false,
    }));
}
