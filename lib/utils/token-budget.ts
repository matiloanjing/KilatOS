/**
 * Token Budget Utility
 * Enforces context limits to prevent weak model crashes and reduce costs
 * 
 * Copyright © 2026 KilatCode Studio
 */

// Model context limits (tokens) - Synced with llm_models DB (2026-01-14)
const MODEL_LIMITS: Record<string, number> = {
    // Free tier models
    'qwen-coder': 8000,
    'openai-fast': 16000,
    'gemini-fast': 32000,
    'mistral': 8000,
    'grok': 128000,         // xAI Grok 4 Fast (Free tier)
    'groq-mixtral': 32000,  // Fallback model

    // Pro tier models
    'openai': 32000,
    'gemini': 100000,
    'claude-fast': 100000,  // Haiku 4.5 (Pro, not Enterprise)
    'deepseek': 64000,      // DeepSeek V3.2 (Pro, not Enterprise)
    'perplexity-fast': 16000,
    'perplexity-reasoning': 32000,
    'kimi-k2-thinking': 32000,
    'glm': 32000,
    'gemini-search': 100000,

    // Enterprise tier models
    'claude': 200000,       // Claude Sonnet 4.5
    'claude-large': 200000, // Claude Opus 4.5
    'gemini-large': 100000, // Gemini 3 Pro
    'openai-large': 128000, // GPT-5.2
    'minimax': 64000,

    // Default for unknown models
    'default': 8000
};

// Priority order for truncation (lower = keep, higher = truncate first)
type ContentPriority = 'instructions' | 'examples' | 'documentation' | 'history';

const PRIORITY_ORDER: ContentPriority[] = ['history', 'documentation', 'examples', 'instructions'];

/**
 * Estimate token count from text (rough approximation)
 * Rule of thumb: ~4 characters = 1 token
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Get context limit for a specific model
 */
export function getModelLimit(model: string): number {
    return MODEL_LIMITS[model] || MODEL_LIMITS['default'];
}

/**
 * Enforce token budget on text with smart truncation
 * Keeps start (70%) and end (30%) to preserve important context
 * 
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens allowed (default: 4000)
 * @returns Truncated text if needed, original otherwise
 */
export function enforceTokenBudget(text: string, maxTokens: number = 4000): string {
    if (!text) return '';

    const currentTokens = estimateTokens(text);

    // No truncation needed
    if (currentTokens <= maxTokens) {
        return text;
    }

    // Calculate character limit based on token budget
    const charLimit = maxTokens * 4;

    // Smart truncation: Keep start (important instructions) + end (recent context)
    const startChars = Math.floor(charLimit * 0.7);
    const endChars = Math.floor(charLimit * 0.3);

    const start = text.slice(0, startChars);
    const end = text.slice(-endChars);

    const truncationMarker = '\n\n... [context truncated for efficiency] ...\n\n';

    return start + truncationMarker + end;
}

/**
 * Enforce budget specifically for RAG context
 * Prioritizes code examples over documentation
 * 
 * @param ragContext - RAG result with examples, bestPractices, documentation
 * @param maxTokens - Total token budget for RAG context
 */
export function enforceRAGBudget(
    ragContext: {
        examples?: string[];
        bestPractices?: string[];
        documentation?: string;
    },
    maxTokens: number = 4000
): {
    examples: string[];
    bestPractices: string[];
    documentation: string;
    truncated: boolean;
    originalTokens: number;
    finalTokens: number;
} {
    // Calculate current usage
    const examplesText = ragContext.examples?.join('\n\n') || '';
    const practicesText = ragContext.bestPractices?.join('\n') || '';
    const docsText = ragContext.documentation || '';

    const originalTokens = estimateTokens(examplesText + practicesText + docsText);

    // No truncation needed
    if (originalTokens <= maxTokens) {
        return {
            examples: ragContext.examples || [],
            bestPractices: ragContext.bestPractices || [],
            documentation: ragContext.documentation || '',
            truncated: false,
            originalTokens,
            finalTokens: originalTokens
        };
    }

    // Allocate budget: Examples (50%), Practices (30%), Docs (20%)
    const examplesBudget = Math.floor(maxTokens * 0.5);
    const practicesBudget = Math.floor(maxTokens * 0.3);
    const docsBudget = Math.floor(maxTokens * 0.2);

    // Truncate each section
    const truncatedExamples = truncateArray(ragContext.examples || [], examplesBudget);
    const truncatedPractices = truncateArray(ragContext.bestPractices || [], practicesBudget);
    const truncatedDocs = enforceTokenBudget(docsText, docsBudget);

    const finalTokens = estimateTokens(
        truncatedExamples.join('\n\n') + truncatedPractices.join('\n') + truncatedDocs
    );

    return {
        examples: truncatedExamples,
        bestPractices: truncatedPractices,
        documentation: truncatedDocs,
        truncated: true,
        originalTokens,
        finalTokens
    };
}

/**
 * Truncate array of strings to fit within token budget
 */
function truncateArray(items: string[], maxTokens: number): string[] {
    if (!items || items.length === 0) return [];

    const result: string[] = [];
    let usedTokens = 0;

    for (const item of items) {
        const itemTokens = estimateTokens(item);

        if (usedTokens + itemTokens <= maxTokens) {
            result.push(item);
            usedTokens += itemTokens;
        } else if (result.length === 0) {
            // At least include first item (truncated if needed)
            result.push(enforceTokenBudget(item, maxTokens));
            break;
        } else {
            break;
        }
    }

    return result;
}

/**
 * Calculate optimal token budget based on model and task complexity
 */
export function calculateOptimalBudget(
    model: string,
    taskComplexity: 'light' | 'medium' | 'heavy' = 'medium'
): {
    totalBudget: number;
    systemPromptBudget: number;
    userPromptBudget: number;
    ragBudget: number;
    responseBudget: number;
} {
    const modelLimit = getModelLimit(model);

    // Reserve based on complexity
    const complexityMultipliers = {
        light: { response: 0.3, rag: 0.2 },
        medium: { response: 0.4, rag: 0.25 },
        heavy: { response: 0.5, rag: 0.2 }
    };

    const multipliers = complexityMultipliers[taskComplexity];

    const responseBudget = Math.floor(modelLimit * multipliers.response);
    const ragBudget = Math.floor(modelLimit * multipliers.rag);
    const systemPromptBudget = Math.floor(modelLimit * 0.1);
    const userPromptBudget = modelLimit - responseBudget - ragBudget - systemPromptBudget;

    return {
        totalBudget: modelLimit,
        systemPromptBudget,
        userPromptBudget,
        ragBudget,
        responseBudget
    };
}
