/**
 * Prompt Cache for KilatOS
 * 
 * Caches and compresses system prompts to reduce token usage.
 * - FREE tier: Uses compressed prompts (shorter, still accurate)
 * - PRO/ENT tier: Uses full prompts with cache reference
 * 
 * Copyright © 2026 KilatCode Studio
 */

// ============================================================================
// Types
// ============================================================================

export interface CachedPrompt {
    id: string;
    hash: string;
    fullText: string;
    compressedText: string;
    tokenCount: number;
    compressedTokenCount: number;
    lastUsed: number;
}

// ============================================================================
// Prompt Cache Class
// ============================================================================

class PromptCache {
    private cache: Map<string, CachedPrompt> = new Map();

    /**
     * Simple hash function for prompt identification
     */
    private hashPrompt(text: string): string {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'prompt_' + Math.abs(hash).toString(36);
    }

    /**
     * Estimate token count (rough: 1 token ≈ 4 characters)
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Compress prompt by removing redundant text
     * Maintains accuracy while reducing tokens
     */
    private compressPrompt(text: string): string {
        return text
            // Remove excessive whitespace
            .replace(/\n{3,}/g, '\n\n')
            .replace(/  +/g, ' ')
            // Shorten common phrases (maintains meaning)
            .replace(/You are an expert/gi, 'Expert')
            .replace(/You must always/gi, 'Always')
            .replace(/Please ensure that/gi, 'Ensure')
            .replace(/It is important to/gi, 'Important:')
            .replace(/In addition to/gi, 'Also')
            .replace(/For example/gi, 'Ex:')
            .replace(/such as/gi, 'like')
            .replace(/in order to/gi, 'to')
            .replace(/make sure to/gi, 'ensure')
            .replace(/\bthe user\b/gi, 'user')
            .replace(/\bthe code\b/gi, 'code')
            .trim();
    }

    /**
     * Cache a system prompt
     */
    cachePrompt(id: string, fullText: string): CachedPrompt {
        const hash = this.hashPrompt(fullText);
        const compressedText = this.compressPrompt(fullText);

        const cached: CachedPrompt = {
            id,
            hash,
            fullText,
            compressedText,
            tokenCount: this.estimateTokens(fullText),
            compressedTokenCount: this.estimateTokens(compressedText),
            lastUsed: Date.now()
        };

        this.cache.set(id, cached);

        const savings = ((cached.tokenCount - cached.compressedTokenCount) / cached.tokenCount * 100).toFixed(1);
        console.log(`📝 [PromptCache] Cached "${id}" (${cached.tokenCount}→${cached.compressedTokenCount} tokens, ${savings}% savings)`);

        return cached;
    }

    /**
     * Get prompt based on tier
     * FREE: compressed, PRO/ENT: full
     */
    getPrompt(id: string, tier: 'free' | 'pro' | 'enterprise' = 'free'): string | null {
        const cached = this.cache.get(id);
        if (!cached) return null;

        cached.lastUsed = Date.now();

        // FREE tier gets compressed prompt, others get full
        if (tier === 'free') {
            console.log(`📝 [PromptCache] Using compressed prompt for "${id}" (tier: ${tier})`);
            return cached.compressedText;
        }

        console.log(`📝 [PromptCache] Using full prompt for "${id}" (tier: ${tier})`);
        return cached.fullText;
    }

    /**
     * Get or cache prompt
     */
    getOrCache(id: string, fullText: string, tier: 'free' | 'pro' | 'enterprise' = 'free'): string {
        if (!this.cache.has(id)) {
            this.cachePrompt(id, fullText);
        }
        return this.getPrompt(id, tier) || fullText;
    }

    /**
     * Get cache stats
     */
    getStats(): {
        count: number;
        totalTokens: number;
        compressedTokens: number;
        savings: string;
    } {
        let totalTokens = 0;
        let compressedTokens = 0;

        for (const prompt of this.cache.values()) {
            totalTokens += prompt.tokenCount;
            compressedTokens += prompt.compressedTokenCount;
        }

        const savings = totalTokens > 0
            ? ((totalTokens - compressedTokens) / totalTokens * 100).toFixed(1) + '%'
            : '0%';

        return {
            count: this.cache.size,
            totalTokens,
            compressedTokens,
            savings
        };
    }

    /**
     * Clear cache
     */
    clear(): void {
        this.cache.clear();
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const promptCache = new PromptCache();

// Pre-cache common system prompts at startup
export function initializePromptCache(): void {
    // These will be populated on first use
    console.log('📝 [PromptCache] Initialized (prompts will be cached on first use)');
}

export default promptCache;
