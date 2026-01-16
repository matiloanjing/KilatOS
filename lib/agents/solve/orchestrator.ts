/**
 * Solve Agent Orchestrator (Stateless)
 * Dual-loop problem solver: Investigate → Solve
 * Model: perplexity-reasoning (reasoning + web search) → fallback: claude-fast
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletionWithFallback } from '@/lib/ai/pollination-client';
import { getModelForAgent, getFallbackModel } from '@/lib/config/models';
import { vectorSearch, formatRAGContext } from '@/lib/tools/rag';
import { webSearch, formatSearchContext } from '@/lib/tools/web-search';
import { executeCode, formatCodeExecutionContext } from '@/lib/tools/code-executor';
import { addCitation, formatCitationsMarkdown, type Citation } from '@/lib/utils/citation-manager';
import { getPrompt } from '@/lib/prompts/templates';
import {
    createSession,
    saveAgentState,
    loadAgentState,
    addMessage,
    completeSession,
    failSession,
} from '@/lib/db/session-manager';

// Get optimal model for Solve Agent
const SOLVE_PRIMARY_MODEL = getModelForAgent('solve');
const SOLVE_FALLBACK_MODEL = getFallbackModel('solve');


export interface SolveParams {
    question: string;
    kbName: string;
    userId?: string;
    locale?: 'en' | 'id';
}

export interface SolveStepResult {
    sessionId: string;
    step: number;
    stepType: string;
    status: 'investigating' | 'solving' | 'completed' | 'failed';
    partialResult?: string;
    finalAnswer?: string;
    citations?: Citation[];
}

/**
 * Start solve process
 * Step 1: Investigate - analyze question and determine needed tools
 */
export async function startSolve(params: SolveParams): Promise<SolveStepResult> {
    const { question, kbName, userId, locale = 'en' } = params;

    // Create new session
    const session = await createSession({
        agent_type: 'solve',
        kb_name: kbName,
        user_id: userId,
        metadata: { question, locale },
    });

    // Add user message
    await addMessage(session.id, 'user', question);

    // Step 1: Investigate
    const investigatePrompt = getPrompt('solve_investigate', locale);
    const systemMessage = { role: 'system' as const, content: investigatePrompt };
    const userMessage = { role: 'user' as const, content: question };

    // Use perplexity-reasoning for deep logical analysis
    const investigationPlan = await chatCompletionWithFallback(
        [systemMessage, userMessage],
        SOLVE_PRIMARY_MODEL,
        SOLVE_FALLBACK_MODEL,
        {
            temperature: 0.3,
            maxTokens: 500,
        }
    );

    // Parse investigation plan (should be JSON)
    let plan: any;
    try {
        plan = JSON.parse(investigationPlan);
    } catch (e) {
        // If not valid JSON, create a simple plan
        plan = {
            understanding: question,
            required_tools: ['rag'],
            reasoning: 'Using knowledge base search',
        };
    }

    // Save investigation state
    await saveAgentState(session.id, 1, 'investigate', {
        question,
        plan,
        understanding: plan.understanding,
        required_tools: plan.required_tools,
    });

    return {
        sessionId: session.id,
        step: 1,
        stepType: 'investigate',
        status: 'investigating',
        partialResult: `Investigation complete. Tools needed: ${plan.required_tools.join(', ')}`,
    };
}

/**
 * Continue solve process
 * Step 2: Execute tools and gather context
 */
export async function continueSolve(sessionId: string): Promise<SolveStepResult> {
    // Load previous state
    const currentState = await loadAgentState(sessionId, 1);
    if (!currentState) {
        throw new Error('Investigation state not found');
    }

    const { question, plan } = currentState.state_data as any;
    const citations: Citation[] = [];

    // Execute required tools
    let context = '';

    // RAG search
    if (plan.required_tools.includes('rag')) {
        const ragResults = await vectorSearch(question, currentState.session_id, 5);
        ragResults.forEach((result) => {
            const citation = addCitation(citations, {
                type: 'rag',
                source: 'Knowledge Base',
                content: result.text,
            });
            context += `[${citation.ref_number}] ${result.text}\n\n`;
        });
    }

    // Web search
    if (plan.required_tools.includes('web')) {
        const webResults = await webSearch(question, 3);
        webResults.forEach((result) => {
            const citation = addCitation(citations, {
                type: 'web',
                source: result.title,
                content: result.snippet,
                url: result.url,
            });
            context += `[${citation.ref_number}] ${result.title}\n${result.snippet}\n\n`;
        });
    }

    // Save tool execution state
    await saveAgentState(
        sessionId,
        2,
        'execute_tools',
        {
            question,
            context,
        },
        citations
    );


    return {
        sessionId,
        step: 2,
        stepType: 'execute_tools',
        status: 'solving',
        partialResult: `Gathered context from ${plan.required_tools.length} tools`,
        citations,
    };

}

/**
 * Final step: Generate comprehensive answer
 */
export async function completeSolve(sessionId: string, locale: 'en' | 'id' = 'en'): Promise<SolveStepResult> {
    // Load context state
    const contextState = await loadAgentState(sessionId, 2);
    if (!contextState) {
        throw new Error('Context state not found');
    }

    const { question, context } = contextState.state_data as any;
    const citations = contextState.citations || [];

    // Generate final answer using perplexity-reasoning
    const answerPrompt = getPrompt('solve_answer', locale, {
        context,
        question,
    });

    const systemMessage = { role: 'system' as const, content: answerPrompt };
    const finalAnswer = await chatCompletionWithFallback(
        [systemMessage],
        SOLVE_PRIMARY_MODEL,
        SOLVE_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 2048,
        }
    );

    // Format final answer with citations
    const citationsArray = Array.isArray(citations) ? citations as unknown as Citation[] : [];
    const citationsMarkdown = formatCitationsMarkdown(citationsArray);
    const fullAnswer = `${finalAnswer}\n\n---\n\n${citationsMarkdown}`;

    // Save final state
    await saveAgentState(
        sessionId,
        3,
        'final_answer',
        {
            question,
            answer: finalAnswer,
            citations: citationsArray,
        },
        citationsArray
    );

    // Add assistant message
    await addMessage(sessionId, 'assistant', fullAnswer);

    // Mark session as completed
    await completeSession(sessionId);

    return {
        sessionId,
        step: 3,
        stepType: 'final_answer',
        status: 'completed',
        finalAnswer: fullAnswer,
        citations: citationsArray,
    };
}

/**
 * Full solve workflow (all steps)
 */
export async function solve(params: SolveParams): Promise<SolveStepResult> {
    try {
        // Step 1: Investigate
        const step1 = await startSolve(params);

        // Step 2: Execute tools
        const step2 = await continueSolve(step1.sessionId);

        // Step 3: Generate answer
        const step3 = await completeSolve(step1.sessionId, params.locale);

        return step3;
    } catch (error) {
        // Mark session as failed if it exists
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Solve process failed');
    }
}


