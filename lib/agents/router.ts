/**
 * Agent Router - Cross-Agent Communication Infrastructure
 * 
 * Enables any agent to call other agents programmatically.
 * Supports: Auto, Recommended, Manual modes.
 * 
 * Copyright © 2026 KilatCode Studio
 */

// Import all agent orchestrators
import { research } from '@/lib/agents/research/orchestrator';
import { coWrite, type CoWriterParams } from '@/lib/agents/cowriter/orchestrator';
import { solve } from '@/lib/agents/solve/orchestrator';
import { generateQuestions, type QuestionParams } from '@/lib/agents/question/orchestrator';
import { guide as runGuide, type GuideParams } from '@/lib/agents/guide/orchestrator';
import { generateIdeas } from '@/lib/agents/ideagen/orchestrator';
import { KilatCrawler } from '@/lib/agents/crawl/kilatcrawl';
import { generateImages, type ImageGenParams } from '@/lib/agents/imagegen/orchestrator';
import { quotaManager } from '@/lib/quota/quota-manager';
import { fireAndForget } from '@/lib/utils/non-blocking-db';

// Types
export type AgentType =
    | 'codegen' | 'imagegen' | 'kilatimage' | 'audit' | 'docs'
    | 'research' | 'cowriter' | 'solve' | 'question'
    | 'guide' | 'ideagen' | 'crawl' | 'chat';

export type AgentMode = 'auto' | 'recommended' | 'manual';

export interface AgentCall {
    from: AgentType;
    to: AgentType;
    reason: string;
    context: any;
    priority: 'low' | 'medium' | 'high';
    sessionId?: string;
    userId?: string;
}

export interface AgentResult {
    success: boolean;
    agent: AgentType;
    data: any;
    error?: string;
    tokens_used?: number;
    duration_ms: number;
}

// Agent name mapping
export const AGENT_NAMES: Record<AgentType, string> = {
    codegen: 'KilatCode',
    imagegen: 'KilatDesign', // UI/UX Designer
    kilatimage: 'KilatImage', // Dedicated Image Generator
    audit: 'KilatAudit',
    docs: 'KilatDocs',
    research: 'KilatResearch',
    cowriter: 'KilatWrite',
    solve: 'KilatSolve',
    question: 'KilatQuestion',
    guide: 'KilatGuide',
    ideagen: 'KilatIdea',
    crawl: 'KilatCrawl',
    chat: 'KilatChat',
};

/**
 * Call a single agent programmatically
 */
export async function callAgent(call: AgentCall): Promise<AgentResult> {
    const startTime = Date.now();

    try {
        let data: any;

        switch (call.to) {
            case 'research':
                data = await research({
                    topic: call.context.topic || call.context.query,
                    preset: call.context.preset || 'quick',
                    kbName: call.context.kbName || 'default',
                    userId: call.userId,
                    locale: call.context.locale || 'en',
                });
                break;

            case 'cowriter':
                // CoWriterParams: operation, content, instruction, userId, locale
                const cowriterParams: CoWriterParams = {
                    operation: call.context.operation || 'rewrite',
                    content: call.context.content,
                    instruction: call.context.instruction,
                    userId: call.userId,
                    locale: call.context.locale || 'en',
                };
                data = await coWrite(cowriterParams);
                break;

            case 'solve':
                // SolveParams: question, kbName, userId, locale
                data = await solve({
                    question: call.context.question || call.context.query,
                    kbName: call.context.kbName || 'default',
                    userId: call.userId,
                    locale: call.context.locale || 'en',
                });
                break;

            case 'question':
                // QuestionParams: mode, requirements, kbName, count, difficulty, questionType, userId, locale
                const questionParams: QuestionParams = {
                    mode: call.context.mode || 'custom',
                    requirements: call.context.requirements || call.context.topic,
                    kbName: call.context.kbName || 'default',
                    count: call.context.count || 5,
                    difficulty: call.context.difficulty || 'medium',
                    questionType: call.context.questionType || 'multiple-choice',
                    userId: call.userId,
                    locale: call.context.locale || 'en',
                };
                data = await generateQuestions(questionParams);
                break;

            case 'guide':
                // GuideParams: notebooks, kbName, userId, locale
                const guideParams: GuideParams = {
                    notebooks: call.context.notebooks || [call.context.topic || 'default'],
                    kbName: call.context.kbName || 'default',
                    userId: call.userId,
                    locale: call.context.locale || 'en',
                };
                data = await runGuide(guideParams);
                break;

            case 'ideagen':
                data = await generateIdeas({
                    topic: call.context.topic,
                    count: call.context.count || 5,
                    kbName: call.context.kbName || 'default',
                    userId: call.userId,
                });
                break;

            case 'crawl':
                const crawler = new KilatCrawler();
                data = await crawler.crawl({
                    url: call.context.url,
                    mode: call.context.mode || 'light',
                    maxPages: call.context.maxPages || 1,
                    summarize: call.context.summarize ?? true,
                    userId: call.userId, // Pass userId for tier detection
                    model: call.context.model, // Pass user's selected model
                });
                await crawler.cleanup();
                break;

            case 'imagegen':
                // KilatDesign: UI/UX Mockups (Stitch style)
                const designParams: ImageGenParams = {
                    mode: 'ui-mockup',
                    prompt: call.context.prompt,
                    userId: call.userId
                };
                data = await generateImages(designParams);
                break;

            case 'kilatimage':
                // KilatImage: Pure Image Generation
                // ImageGenParams: mode, prompt, style, quality, options, userId
                const imageParams: ImageGenParams = {
                    mode: call.context.mode || 'text2image',
                    prompt: call.context.prompt,
                    style: call.context.style || 'realistic',
                    quality: call.context.quality || 'standard',
                    userId: call.userId,
                };
                data = await generateImages(imageParams);
                break;

            case 'audit':
                // analyzeRepository(githubClient, owner, repo, options) - requires GitHubClient
                // For cross-agent calls, return error - must use dedicated audit endpoint
                throw new Error('Audit agent requires GitHub OAuth. Use /kilataudit endpoint directly.');

            case 'docs':
                // generateDocumentation requires Blueprint - complex dependency
                // For cross-agent calls, return simple docs generation placeholder
                throw new Error('Docs agent requires codebase context. Use /kilatdocs endpoint directly.');

            case 'codegen':
            case 'chat':
                // These are handled by main orchestrator, not directly routable
                throw new Error(`Agent ${call.to} is not directly routable via callAgent. Use main orchestrator.`);

            default:
                throw new Error(`Unknown agent type: ${call.to}`);
        }

        // Track usage for all cross-agent calls (NON-BLOCKING)
        if (call.userId) {
            fireAndForget(() => quotaManager.incrementUsage(call.userId!, call.to));
        }

        return {
            success: true,
            agent: call.to,
            data,
            duration_ms: Date.now() - startTime,
        };

    } catch (error) {
        return {
            success: false,
            agent: call.to,
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration_ms: Date.now() - startTime,
        };
    }
}

/**
 * Call multiple agents in parallel
 */
export async function callAgents(calls: AgentCall[]): Promise<AgentResult[]> {
    return Promise.all(calls.map(call => callAgent(call)));
}

/**
 * Call multiple agents sequentially (for dependent tasks)
 */
export async function callAgentsSequential(calls: AgentCall[]): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    for (const call of calls) {
        const result = await callAgent(call);
        results.push(result);

        // Stop on failure for sequential calls
        if (!result.success) {
            break;
        }
    }

    return results;
}

// Export agent routable info for recommendations
// ROUTABLE = Can be suggested to user for switching
// NON_ROUTABLE = Internal only (shadow agents) or require special access
export const ROUTABLE_AGENTS: AgentType[] = [
    'research', 'cowriter', 'solve', 'question',
    'guide', 'ideagen', 'crawl', 'imagegen'  // imagegen = KilatDesign (UI mockups)
];

export const NON_ROUTABLE_AGENTS: AgentType[] = [
    'codegen', 'chat', 'audit', 'docs', 'kilatimage'  // kilatimage = Shadow agent (internal image gen)
];
