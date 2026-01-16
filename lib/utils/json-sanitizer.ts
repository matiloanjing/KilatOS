/**
 * Universal JSON Sanitizer
 * Robust parsing of LLM responses from ALL Pollination models
 * 
 * Tested Models (2026-01-11):
 * - claude, claude-fast, claude-large
 * - openai, openai-fast, openai-large
 * - gemini-fast, gemini-search, gemini-large
 * - qwen-coder, mistral, deepseek
 * - grok, perplexity-fast, perplexity-reasoning
 * 
 * Known Quirks by Model:
 * - Grok: Sometimes returns control characters, unescaped quotes
 * - Claude: May wrap JSON in markdown code blocks
 * - Gemini: Clean output, occasionally adds trailing text
 * - OpenAI: Generally clean, may have trailing commas
 * - Qwen: Good JSON, may include comments
 * - Deepseek: May include thinking tags
 * 
 * Copyright © 2026 KilatCode Studio
 */

/**
 * Sanitize and extract JSON from LLM response
 * Handles all known model quirks from 28+ active models
 * 
 * @param response - Raw LLM response string
 * @param fallback - Optional fallback value if parsing fails
 * @returns Parsed JSON object or fallback
 */
export function safeParseJSON<T = any>(response: string, fallback?: T): T | null {
    try {
        const sanitized = sanitizeJsonResponse(response);
        return JSON.parse(sanitized);
    } catch (error) {
        console.warn('[JSON Sanitizer] Parse failed after sanitization:', error);
        return fallback ?? null;
    }
}

/**
 * Strict JSON parse - throws on failure
 * Use when JSON is REQUIRED (not optional)
 */
export function strictParseJSON<T = any>(response: string): T {
    const sanitized = sanitizeJsonResponse(response);
    return JSON.parse(sanitized);
}

/**
 * Main sanitization function - handles ALL model quirks
 */
export function sanitizeJsonResponse(response: string): string {
    let cleaned = response.trim();

    // =========================================================================
    // PHASE 0: Remove control characters (Grok quirk)
    // =========================================================================
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

    // =========================================================================
    // PHASE 1: Remove markdown code blocks (Claude, Gemini quirk)
    // =========================================================================
    const codeBlockPatterns = [
        /```json\s*([\s\S]*?)\s*```/gi,
        /```typescript\s*([\s\S]*?)\s*```/gi,
        /```javascript\s*([\s\S]*?)\s*```/gi,
        /```\s*([\s\S]*?)\s*```/gi
    ];

    for (const pattern of codeBlockPatterns) {
        const match = cleaned.match(pattern);
        if (match) {
            cleaned = match[0]
                .replace(/```(?:json|typescript|javascript)?\s*/gi, '')
                .replace(/\s*```$/g, '');
            break;
        }
    }

    // =========================================================================
    // PHASE 2: Remove thinking tags (DeepSeek quirk)
    // =========================================================================
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    // =========================================================================
    // PHASE 3: Remove comments (Qwen quirk)
    // =========================================================================
    // Remove // comments (but preserve URLs)
    cleaned = cleaned.replace(/(?<!:)\/\/[^\n]*/g, '');

    // =========================================================================
    // PHASE 4: Extract JSON object/array from surrounding text
    // =========================================================================
    // Try to find JSON object first
    let jsonStartIndex = cleaned.indexOf('{');
    let jsonEndIndex = cleaned.lastIndexOf('}');

    // If no object, try array
    if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
        jsonStartIndex = cleaned.indexOf('[');
        jsonEndIndex = cleaned.lastIndexOf(']');
    }

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        cleaned = cleaned.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    // =========================================================================
    // PHASE 5: Fix trailing commas (OpenAI, general quirk)
    // =========================================================================
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    // =========================================================================
    // PHASE 6: Fix unescaped quotes in strings (Grok quirk)
    // This is tricky - only fix obvious cases
    // =========================================================================
    // Fix double-double quotes ("" -> ")
    cleaned = cleaned.replace(/""/g, '"');

    // Fix smart quotes (curly quotes to straight)
    cleaned = cleaned.replace(/[""]/g, '"');
    cleaned = cleaned.replace(/['']/g, "'");

    // =========================================================================
    // PHASE 7: Fix newlines in string values
    // =========================================================================
    // Replace actual newlines inside JSON string values with \n
    cleaned = cleaned.replace(/:\s*"([^"]*?)\n([^"]*?)"/g, (match, p1, p2) => {
        return `: "${p1}\\n${p2}"`;
    });

    // =========================================================================
    // PHASE 8: Trim whitespace
    // =========================================================================
    return cleaned.trim();
}

/**
 * Check if a string looks like valid JSON
 */
export function isLikelyJSON(text: string): boolean {
    const trimmed = text.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * Extract JSON from mixed content (text + JSON)
 * Useful for responses like: "Here's your result: {...}"
 */
export function extractJSON(text: string): string | null {
    try {
        return sanitizeJsonResponse(text);
    } catch {
        return null;
    }
}

console.log('✅ Universal JSON Sanitizer loaded (28+ LLM models supported)');
