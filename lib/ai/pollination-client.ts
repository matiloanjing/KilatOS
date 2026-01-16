/**
 * Pollination AI Client (CLEAN Universal Version)
 * 
 * IMPORTANT:
 * - Uses ONLY the universal payload that works across ALL Pollination models.
 * - NO thinking parameters, NO tools, NO extra options that cause 400 errors.
 * - For "thinking" behavior, use prompt-based CoT (ask AI to think step-by-step).
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { request } from 'undici';
import type { PollinationModel } from '../config/models';

// ============================================================================
// Configuration
// ============================================================================

const API_ENDPOINT = 'https://gen.pollinations.ai/v1/chat/completions';
const API_KEY = process.env.POLLINATION_API_KEY;

// NOTE: This DEFAULT_MODEL is ONLY used if no model is passed to chatCompletion().
// User-selected model from database should ALWAYS be passed via options.model
const DEFAULT_MODEL: PollinationModel = 'gemini-fast';

// ============================================================================
// Types
// ============================================================================

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    seed?: number;
    enableThinking?: boolean; // If true, prepend "think step-by-step" to system prompt
}

export interface ChatResponse {
    id: string;
    object: "chat.completion";
    created: number;
    model: string;
    choices: Array<{
        index: number;
        finish_reason: string;
        message: {
            role: "assistant";
            content: string;
        };
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Chat completion (non-streaming) - CLEAN UNIVERSAL PAYLOAD
 * Works with ALL Pollination models: openai, qwen-coder, mistral, gemini-fast, etc.
 */
export async function chatCompletion(
    messages: Message[],
    options: ChatOptions = {}
): Promise<string> {
    // CRITICAL: Log warning if model is not explicitly provided
    // This helps identify callers that don't pass user-selected model
    if (!options.model) {
        console.warn('⚠️ [chatCompletion] No model specified! Caller should pass user-selected model. Using fallback.');
    }

    const {
        model = DEFAULT_MODEL,
        temperature = 0.7,
        maxTokens = 4096,
        stream = false,
        enableThinking = false,
    } = options;

    // Get API key at runtime (not at module load time)
    const API_KEY = process.env.POLLINATION_API_KEY;

    if (!API_KEY) {
        throw new Error('POLLINATION_API_KEY not configured in .env.local');
    }

    // Prepare messages (optionally add thinking instruction)
    let preparedMessages = [...messages];
    if (enableThinking) {
        // Check if there's already a system message
        const hasSystemMessage = preparedMessages.some(m => m.role === 'system');
        if (hasSystemMessage) {
            // Append thinking instruction to existing system message
            preparedMessages = preparedMessages.map(m =>
                m.role === 'system'
                    ? { ...m, content: m.content + '\n\nBefore answering, THINK STEP-BY-STEP inside <thinking> tags to verify your logic.' }
                    : m
            );
        } else {
            // Prepend new system message with thinking instruction
            preparedMessages.unshift({
                role: 'system',
                content: 'You are an expert AI assistant. Before answering complex questions, THINK STEP-BY-STEP inside <thinking> tags to verify your logic and reasoning.'
            });
        }
    }

    // CLEAN PAYLOAD - Works with ALL models
    const cleanPayload = {
        model: model,
        messages: preparedMessages,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: stream
    };

    // =========================================================================
    // CLOUDFLARE-AWARE RETRY CONFIGURATION (NO FALLBACK MODELS)
    // User's selected model is ALWAYS used - retry until success
    // =========================================================================

    // Cloudflare requirement: 100s timeout, 2s delay between requests
    const REQUEST_TIMEOUT_MS = 100000; // 100 seconds (Cloudflare limit)
    const RETRY_DELAY_MS = 2000;       // 2 seconds between retries (avoid spam detection)
    const MAX_RETRIES = 10;            // Try up to 10 times before giving up

    // NO FALLBACK MODELS - Use ONLY the user's selected model
    const targetModel = model;
    const payload = { ...cleanPayload, model: targetModel };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`📡 Pollination API: Model=${targetModel}, Attempt=${attempt}/${MAX_RETRIES}`);

            const { statusCode, body } = await request(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(payload),
                headersTimeout: REQUEST_TIMEOUT_MS,
                bodyTimeout: REQUEST_TIMEOUT_MS,
            });

            if (statusCode === 200) {
                const data = await body.json() as ChatResponse;

                if (!data.choices || data.choices.length === 0) {
                    throw new Error('No response choices from Pollination AI');
                }

                const content = data.choices[0].message.content;

                // Validate content is not empty
                if (!content || content.trim().length === 0) {
                    console.warn(`⚠️ Empty response from model '${targetModel}', waiting ${RETRY_DELAY_MS}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue;
                }

                console.log(`✅ Pollination API success (attempt ${attempt})`);
                return content;
            }

            // Handle errors
            const errorText = await body.text();
            console.warn(`⚠️ Pollination API error ${statusCode} with '${targetModel}': ${errorText.substring(0, 200)}`);

            // Rate limiting (429) - Cloudflare protection triggered
            if (statusCode === 429) {
                console.warn(`⏳ Rate limited by Cloudflare. Waiting 5s before retry...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }

            // 500+ server errors - wait and retry
            if (statusCode >= 500) {
                console.warn(`⚠️ Server error. Waiting ${RETRY_DELAY_MS}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                continue;
            }

            // 400 errors - likely bad request, still retry with delay
            if (statusCode === 400) {
                console.warn(`⚠️ Bad request error. Waiting ${RETRY_DELAY_MS}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                continue;
            }

            // Other errors - wait and retry
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

        } catch (error) {
            console.error(`❌ Request error (Attempt ${attempt}/${MAX_RETRIES}):`, error instanceof Error ? error.message : String(error));

            if (attempt === MAX_RETRIES) {
                throw new Error(`Pollination API failed after ${MAX_RETRIES} attempts with model '${targetModel}'. Please try again.`);
            }

            // Wait before retry (Cloudflare concurrency requirement)
            console.log(`⏳ Waiting ${RETRY_DELAY_MS}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    throw new Error(`Pollination API failed after ${MAX_RETRIES} attempts with model '${targetModel}'. Check network and API key.`);
}

// ============================================================================
// Embedding Generation - Re-export from Xenova-based service
// ============================================================================

/**
 * Generate embedding vector for text
 * 
 * MIGRATION: This function is now a re-export from embedding-service.ts
 * which uses Xenova (384-dim) instead of the old hash-based (768-dim).
 * 
 * Fallback chain: Xenova Server API → Hash-based
 * 
 * For client-side usage, use `hooks/use-embeddings.ts` instead.
 */
export { generateEmbedding, EMBEDDING_DIMENSIONS } from './embedding-service';

// ============================================================================
// Helper: Test All Models
// ============================================================================

/**
 * Test all available models to verify connectivity
 */
export async function testAllModels(): Promise<Record<string, { success: boolean; error?: string; latency?: number }>> {
    const models = ['qwen-coder', 'openai', 'gemini-fast', 'mistral', 'claude', 'searchgpt'];
    const results: Record<string, { success: boolean; error?: string; latency?: number }> = {};

    for (const model of models) {
        const start = Date.now();
        try {
            await chatCompletion(
                [{ role: 'user', content: 'Say "hello" and nothing else.' }],
                { model, maxTokens: 10 }
            );
            results[model] = { success: true, latency: Date.now() - start };
            console.log(`✅ ${model}: OK (${results[model].latency}ms)`);
        } catch (error) {
            results[model] = { success: false, error: error instanceof Error ? error.message : String(error) };
            console.log(`❌ ${model}: FAILED - ${results[model].error}`);
        }
    }

    return results;
}

// ============================================================================
// Legacy Exports (for backward compatibility with remaining codebase)
// ============================================================================

export type { PollinationModel };
export { API_ENDPOINT as API_BASE };

/**
 * Legacy wrapper for backward compatibility with agents
 * Agents call: chatCompletionWithFallback(messages, primaryModel, fallbackModel, options)
 * This converts to: chatCompletion(messages, { model: primaryModel, ...options })
 */
export async function chatCompletionWithFallback(
    messages: Message[],
    primaryModel: string,
    fallbackModel: string,
    options: Partial<ChatOptions> = {}
): Promise<string> {
    try {
        // Try primary model first
        return await chatCompletion(messages, {
            model: primaryModel,
            ...options
        });
    } catch (error) {
        console.warn(`Primary model ${primaryModel} failed, trying fallback ${fallbackModel}`);
        // Fallback to secondary model
        return await chatCompletion(messages, {
            model: fallbackModel,
            ...options
        });
    }
}


