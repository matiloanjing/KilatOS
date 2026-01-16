/**
 * Response Cache for KilatCode Agent
 * 
 * Provides caching + similarity-based lookup to avoid redundant API calls.
 * Uses Jaccard similarity for query matching.
 * 
 * Copyright © 2026 KilatCode Studio
 */

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry {
    query: string;
    queryHash: string;
    response: any;
    timestamp: number;
    hitCount: number;
    complexity: 'simple' | 'medium' | 'complex';
}

export interface CacheStats {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
}

// Tier limits for response cache (must match TIER_LIMITS in user-tier.ts)
const RESPONSE_CACHE_LIMITS = {
    free: 50,
    pro: 150,
    enterprise: 300
};

// ============================================================================
// Response Cache Class - Tier-Based Limits
// ============================================================================

export class ResponseCache {
    private cache: Map<string, CacheEntry> = new Map();
    private maxSize: number;
    private ttlMs: number;
    private hits = 0;
    private misses = 0;
    private currentTier: 'free' | 'pro' | 'enterprise' = 'free';

    constructor(options?: { maxSize?: number; ttlMinutes?: number }) {
        this.maxSize = options?.maxSize || RESPONSE_CACHE_LIMITS.free;
        this.ttlMs = (options?.ttlMinutes || 30) * 60 * 1000;
    }

    /**
     * Set tier to adjust cache limits dynamically
     */
    setTier(tier: 'free' | 'pro' | 'enterprise'): void {
        this.currentTier = tier;
        this.maxSize = RESPONSE_CACHE_LIMITS[tier] || RESPONSE_CACHE_LIMITS.free;
        console.log(`💾 [ResponseCache] Tier set to ${tier}, limit: ${this.maxSize}`);
    }

    /**
     * Get current tier
     */
    getTier(): string {
        return this.currentTier;
    }

    // ==========================================================================
    // Hash & Similarity Functions
    // ==========================================================================

    /**
     * Normalize query for comparison
     * Removes noise, lowercases, and trims
     */
    private normalizeQuery(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')  // Remove punctuation
            .replace(/\s+/g, ' ')       // Collapse whitespace
            .trim()
            .slice(0, 200);             // Limit length
    }

    /**
     * Extract meaningful tokens from query
     */
    private tokenize(text: string): Set<string> {
        const normalized = this.normalizeQuery(text);
        const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'can', 'dengan', 'dan', 'yang', 'untuk', 'di', 'ke', 'dari']);

        return new Set(
            normalized.split(' ')
                .filter(word => word.length > 2 && !stopWords.has(word))
        );
    }

    /**
     * Jaccard similarity between two token sets
     * Returns 0-1 where 1 = identical
     */
    private jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
        if (setA.size === 0 || setB.size === 0) return 0;

        const intersection = [...setA].filter(x => setB.has(x)).length;
        const union = new Set([...setA, ...setB]).size;

        return intersection / union;
    }

    // ==========================================================================
    // Cache Operations
    // ==========================================================================

    /**
     * Find similar query in cache
     * @param query - Input query
     * @param threshold - Similarity threshold (0-1, default 0.7)
     * @returns Cached entry or null
     */
    findSimilar(query: string, threshold = 0.7): CacheEntry | null {
        const queryTokens = this.tokenize(query);
        let bestMatch: CacheEntry | null = null;
        let bestScore = 0;

        const entries = Array.from(this.cache.values());
        for (const entry of entries) {
            // Skip expired entries
            if (Date.now() - entry.timestamp > this.ttlMs) {
                continue;
            }

            const entryTokens = this.tokenize(entry.query);
            const similarity = this.jaccardSimilarity(queryTokens, entryTokens);

            if (similarity >= threshold && similarity > bestScore) {
                bestScore = similarity;
                bestMatch = entry;
            }
        }

        if (bestMatch) {
            bestMatch.hitCount++;
            this.hits++;
            console.log(`🎯 Cache HIT (similarity: ${(bestScore * 100).toFixed(1)}%)`);
            return bestMatch;
        }

        this.misses++;
        return null;
    }

    /**
     * Get exact match from cache
     */
    get(query: string): CacheEntry | null {
        const normalized = this.normalizeQuery(query);
        const entry = this.cache.get(normalized);

        if (entry && Date.now() - entry.timestamp < this.ttlMs) {
            entry.hitCount++;
            this.hits++;
            return entry;
        }

        this.misses++;
        return null;
    }

    /**
     * Add response to cache
     */
    set(query: string, response: any, complexity: 'simple' | 'medium' | 'complex' = 'medium'): void {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldest = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) {
                this.cache.delete(oldest[0]);
            }
        }

        const normalized = this.normalizeQuery(query);
        this.cache.set(normalized, {
            query,
            queryHash: normalized,
            response,
            timestamp: Date.now(),
            hitCount: 0,
            complexity
        });

        console.log(`💾 Cached response (size: ${this.cache.size}/${this.maxSize})`);
    }

    /**
     * Clear expired entries
     */
    cleanup(): number {
        let removed = 0;
        const now = Date.now();

        const entries = Array.from(this.cache.entries());
        for (const [key, entry] of entries) {
            if (now - entry.timestamp > this.ttlMs) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned up ${removed} expired cache entries`);
        }

        return removed;
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0
        };
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const responseCache = new ResponseCache();

export default ResponseCache;
