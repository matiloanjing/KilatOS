/**
 * Research Agent Orchestrator (Stateless)
 * DR-in-KG: Deep Research in Knowledge Graph
 * Phases: Planning → Researching → Reporting
 * Model: gemini-search (search + long context) → fallback: perplexity-fast
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletionWithFallback } from '@/lib/ai/pollination-client';
import { getModelForAgent, getFallbackModel } from '@/lib/config/models';
import { vectorSearch } from '@/lib/tools/rag';
import { webSearch } from '@/lib/tools/web-search';
import { searchPapers } from '@/lib/tools/arxiv';
import { addCitation, formatCitationsMarkdown, type Citation } from '@/lib/utils/citation-manager';
import { getPrompt } from '@/lib/prompts/templates';
import {
    createSession,
    saveAgentState,
    loadAgentState,
    addMessage,
    completeSession,
} from '@/lib/db/session-manager';

// Get optimal model for Research Agent
const RESEARCH_PRIMARY_MODEL = getModelForAgent('research');
const RESEARCH_FALLBACK_MODEL = getFallbackModel('research');

export interface ResearchParams {
    topic: string;
    preset?: 'quick' | 'medium' | 'deep';
    kbName: string;
    userId?: string;
    locale?: 'en' | 'id';
}

export interface ResearchSubtopic {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'researching' | 'completed';
    notes?: string;
}

export interface ResearchResult {
    sessionId: string;
    topic: string;
    subtopics: ResearchSubtopic[];
    report?: string;
    citations?: Citation[];
    status: 'planning' | 'researching' | 'completed';
}

/**
 * Step 1: Planning - Decompose topic into subtopics
 */
export async function startResearch(params: ResearchParams): Promise<ResearchResult> {
    const { topic, preset = 'medium', kbName, userId, locale = 'en' } = params;

    // Create session
    const session = await createSession({
        agent_type: 'research',
        kb_name: kbName,
        user_id: userId,
        metadata: { topic, preset },
    });

    // Determine number of subtopics based on preset
    const subtopicCounts = {
        quick: 3,
        medium: 5,
        deep: 8,
    };
    const subtopicCount = subtopicCounts[preset];

    // Decompose topic into subtopics using gemini-search
    const decomposePrompt = getPrompt('research_decompose', locale, {
        topic,
    });

    const response = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: decomposePrompt }],
        RESEARCH_PRIMARY_MODEL,
        RESEARCH_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 1000,
        }
    );

    // Parse subtopics (expect JSON)
    let subtopics: ResearchSubtopic[];
    try {
        const { safeParseJSON } = await import('@/lib/utils/json-sanitizer');
        const parsed = safeParseJSON(response);
        subtopics = (parsed.subtopics || []).slice(0, subtopicCount).map((st: any, idx: number) => ({
            id: `${idx + 1}`,
            title: st.title || `Subtopic ${idx + 1}`,
            description: st.description || '',
            status: 'pending' as const,
        }));
    } catch (e) {
        // Fallback: create simple subtopics
        subtopics = Array.from({ length: 3 }, (_, i) => ({
            id: `${i + 1}`,
            title: `Aspect ${i + 1} of ${topic}`,
            description: `Explore this aspect of the research topic`,
            status: 'pending' as const,
        }));
    }

    // Save planning state
    await saveAgentState(session.id, 1, 'planning', {
        topic,
        preset,
        subtopics,
    });

    return {
        sessionId: session.id,
        topic,
        subtopics,
        status: 'planning',
    };
}

/**
 * Step 2: Researching - Research each subtopic in parallel
 */
export async function continueResearch(sessionId: string): Promise<ResearchResult> {
    // Load planning state
    const planningState = await loadAgentState(sessionId, 1);
    if (!planningState) {
        throw new Error('Planning state not found');
    }

    const { topic, subtopics } = planningState.state_data as any;
    const citations: Citation[] = [];

    // Research each subtopic
    for (const subtopic of subtopics) {
        subtopic.status = 'researching';

        // Gather information from multiple sources
        const query = `${topic} ${subtopic.title}`;

        // 1. RAG search
        const ragResults = await vectorSearch(query, planningState.session_id, 5);
        let notes = '### Knowledge Base Findings\n\n';
        ragResults.forEach((result) => {
            const citation = addCitation(citations, {
                type: 'rag',
                source: 'Knowledge Base',
                content: result.text,
            });
            notes += `[${citation.ref_number}] ${result.text}\n\n`;
        });

        // 2. Web search
        try {
            const webResults = await webSearch(query, 3);
            notes += '\n### Web Research\n\n';
            webResults.forEach((result) => {
                const citation = addCitation(citations, {
                    type: 'web',
                    source: result.title,
                    content: result.snippet,
                    url: result.url,
                });
                notes += `[${citation.ref_number}] **${result.title}**\n${result.snippet}\n\n`;
            });
        } catch (e) {
            // Web search optional
        }

        // 3. Academic papers
        try {
            const papers = await searchPapers(query, 2);
            if (papers.length > 0) {
                notes += '\n### Academic Papers\n\n';
                papers.forEach((paper) => {
                    const citation = addCitation(citations, {
                        type: 'paper',
                        source: paper.title,
                        content: paper.abstract,
                        url: paper.url,
                    });
                    notes += `[${citation.ref_number}] **${paper.title}**\n${paper.authors.slice(0, 2).join(', ')}\n${paper.abstract.substring(0, 200)}...\n\n`;
                });
            }
        } catch (e) {
            // Arxiv search optional
        }

        // Synthesize notes using gemini-search
        const notePrompt = getPrompt('research_note', 'en', {
            subtopic: subtopic.title,
            context: notes,
        });

        const synthesizedNotes = await chatCompletionWithFallback(
            [{ role: 'system' as const, content: notePrompt }],
            RESEARCH_PRIMARY_MODEL,
            RESEARCH_FALLBACK_MODEL,
            {
                temperature: 0.6,
                maxTokens: 1000,
            }
        );

        subtopic.notes = synthesizedNotes;
        subtopic.status = 'completed';
    }

    // Save researching state
    await saveAgentState(sessionId, 2, 'researching', {
        topic,
        subtopics,
    }, citations);

    return {
        sessionId,
        topic,
        subtopics,
        citations,
        status: 'researching',
    };
}

/**
 * Step 3: Reporting - Compile final research report
 */
export async function completeResearch(
    sessionId: string,
    locale: 'en' | 'id' = 'en'
): Promise<ResearchResult> {
    // Load researching state
    const researchingState = await loadAgentState(sessionId, 2);
    if (!researchingState) {
        throw new Error('Researching state not found');
    }

    const { topic, subtopics } = researchingState.state_data as any;
    const citations = researchingState.citations || [];

    // Compile all notes
    const allNotes = subtopics
        .map((st: ResearchSubtopic, idx: number) => {
            return `## ${idx + 1}. ${st.title}\n\n${st.notes || 'No notes available'}\n\n---\n`;
        })
        .join('\n');

    // Generate final report using gemini-search
    const reportPrompt = getPrompt('research_report', locale, {
        topic,
        notes: allNotes,
    });

    const report = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: reportPrompt }],
        RESEARCH_PRIMARY_MODEL,
        RESEARCH_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 3000,
        }
    );

    // Format final report with citations
    const citationsArray = Array.isArray(citations) ? citations as unknown as Citation[] : [];
    const citationsMarkdown = formatCitationsMarkdown(citationsArray);
    const fullReport = `${report}\n\n---\n\n${citationsMarkdown}`;

    // Save final state
    await saveAgentState(sessionId, 3, 'reporting', {
        topic,
        subtopics,
        report: fullReport,
    }, citationsArray);

    await addMessage(sessionId, 'assistant', fullReport);
    await completeSession(sessionId);

    return {
        sessionId,
        topic,
        subtopics,
        report: fullReport,
        citations: citationsArray,
        status: 'completed',
    };
}

/**
 * Full research workflow (all steps)
 */
export async function research(params: ResearchParams): Promise<ResearchResult> {
    // Step 1: Planning
    const step1 = await startResearch(params);

    // Step 2: Researching
    const step2 = await continueResearch(step1.sessionId);

    // Step 3: Reporting
    const step3 = await completeResearch(step1.sessionId, params.locale);

    return step3;
}


