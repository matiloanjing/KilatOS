/**
 * CoWriter Agent Orchestrator (Stateless)
 * AI-assisted markdown editing
 * Operations: Rewrite, Expand, Shorten, Auto-annotate, Narrate
 * Model: claude-fast (writing quality) → fallback: openai
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletionWithFallback } from '@/lib/ai/pollination-client';
import { getModelForAgent, getFallbackModel } from '@/lib/config/models';
import {
    createSession,
    saveAgentState,
    addMessage,
    completeSession,
} from '@/lib/db/session-manager';

// Get optimal model for CoWriter Agent
const COWRITER_PRIMARY_MODEL = getModelForAgent('cowriter');
const COWRITER_FALLBACK_MODEL = getFallbackModel('cowriter');

export interface CoWriterParams {
    operation: 'rewrite' | 'expand' | 'shorten' | 'auto-mark' | 'narrate';
    content: string;
    instruction?: string; // Optional additional instruction
    userId?: string;
    locale?: 'en' | 'id';
}

export interface CoWriterResult {
    sessionId: string;
    operation: string;
    originalContent: string;
    modifiedContent: string;
    narration?: string; // For narrate operation
}

/**
 * Rewrite text with improved clarity and style
 */
async function rewriteText(
    content: string,
    instruction: string = '',
    locale: 'en' | 'id' = 'en'
): Promise<string> {
    const prompt = `Rewrite the following text to improve clarity, style, and engagement while preserving the core meaning.

${instruction ? `Additional instruction: ${instruction}\n\n` : ''}Original text:
${content}

Provide only the rewritten text in markdown format, no explanations.`;

    return chatCompletionWithFallback(
        [{ role: 'system' as const, content: prompt }],
        COWRITER_PRIMARY_MODEL,
        COWRITER_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 2048,
        }
    );
}

/**
 * Expand text with more details and examples
 */
async function expandText(
    content: string,
    instruction: string = '',
    locale: 'en' | 'id' = 'en'
): Promise<string> {
    const prompt = `Expand the following text by adding:
1. More detailed explanations
2. Relevant examples
3. Additional context
4. Supporting evidence

${instruction ? `Additional instruction: ${instruction}\n\n` : ''}Original text:
${content}

Provide the expanded version in markdown format.`;

    return chatCompletionWithFallback(
        [{ role: 'system' as const, content: prompt }],
        COWRITER_PRIMARY_MODEL,
        COWRITER_FALLBACK_MODEL,
        {
            temperature: 0.6,
            maxTokens: 3000,
        }
    );
}

/**
 * Shorten text while preserving key information
 */
async function shortenText(
    content: string,
    instruction: string = '',
    locale: 'en' | 'id' = 'en'
): Promise<string> {
    const prompt = `Shorten the following text to about 50% of its length while:
1. Preserving all key information
2. Maintaining clarity
3. Keeping the most important points

${instruction ? `Additional instruction: ${instruction}\n\n` : ''}Original text:
${content}

Provide only the shortened text in markdown format.`;

    return chatCompletionWithFallback(
        [{ role: 'system' as const, content: prompt }],
        COWRITER_PRIMARY_MODEL,
        COWRITER_FALLBACK_MODEL,
        {
            temperature: 0.5,
            maxTokens: 2048,
        }
    );
}

/**
 * Auto-annotate with comments and explanations
 */
async function autoAnnotate(
    content: string,
    instruction: string = '',
    locale: 'en' | 'id' = 'en'
): Promise<string> {
    const prompt = `Add helpful annotations, comments, and explanations to this text:

${instruction ? `Additional instruction: ${instruction}\n\n` : ''}Original text:
${content}

Add annotations in markdown format using:
- Blockquotes (>) for important notes
- Footnotes for detailed explanations
- Inline comments where helpful

Provide the annotated version.`;

    return chatCompletionWithFallback(
        [{ role: 'system' as const, content: prompt }],
        COWRITER_PRIMARY_MODEL,
        COWRITER_FALLBACK_MODEL,
        {
            temperature: 0.6,
            maxTokens: 2500,
        }
    );
}

/**
 * Create narration script from text
 */
async function createNarration(
    content: string,
    instruction: string = '',
    locale: 'en' | 'id' = 'en'
): Promise<string> {
    const prompt = `Create a narration script from this text that:
1. Sounds natural when spoken
2. Uses conversational tone
3. Includes pacing cues (pauses, emphasis)
4. Maintains engagement

${instruction ? `Additional instruction: ${instruction}\n\n` : ''}Content to narrate:
${content}

Provide the narration script with pacing cues in square brackets, e.g., [pause], [emphasize].`;

    return chatCompletionWithFallback(
        [{ role: 'system' as const, content: prompt }],
        COWRITER_PRIMARY_MODEL,
        COWRITER_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 2048,
        }
    );
}

/**
 * Main CoWriter function
 */
export async function coWrite(params: CoWriterParams): Promise<CoWriterResult> {
    const { operation, content, instruction = '', userId, locale = 'en' } = params;

    // Create session
    const session = await createSession({
        agent_type: 'cowriter',
        kb_name: '',
        user_id: userId,
        metadata: { operation, contentLength: content.length },
    });

    // Execute operation using claude-fast for writing quality
    let modifiedContent: string;
    let narration: string | undefined;

    switch (operation) {
        case 'rewrite':
            modifiedContent = await rewriteText(content, instruction, locale);
            break;
        case 'expand':
            modifiedContent = await expandText(content, instruction, locale);
            break;
        case 'shorten':
            modifiedContent = await shortenText(content, instruction, locale);
            break;
        case 'auto-mark':
            modifiedContent = await autoAnnotate(content, instruction, locale);
            break;
        case 'narrate':
            narration = await createNarration(content, instruction, locale);
            modifiedContent = narration;
            break;
        default:
            throw new Error(`Unknown operation: ${operation}`);
    }

    // Save state
    await saveAgentState(session.id, 1, `cowriter_${operation}`, {
        operation,
        originalContent: content,
        modifiedContent,
        narration,
    });

    await addMessage(session.id, 'assistant', modifiedContent);
    await completeSession(session.id);

    return {
        sessionId: session.id,
        operation,
        originalContent: content,
        modifiedContent,
        narration,
    };
}


