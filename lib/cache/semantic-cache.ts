/**
 * Semantic Cache with Embedding Similarity
 * 
 * Enhanced cache that uses Xenova embeddings for semantic matching.
 * Falls back to existing Jaccard-based ResponseCache.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { generateEmbedding } from '@/lib/ai/embedding-service';
import { responseCache, CacheEntry } from '@/lib/agents/codegen/response-cache';

// ============================================================================
// Types
// ============================================================================

interface EmbeddingCacheEntry {
    query: string;
    embedding: number[];
    responseId: string; // Links to ResponseCache entry
    timestamp: number;
}

// ============================================================================
// Embedding Cache (In-Memory) - Tier-Based Limits
// ============================================================================

// Tier limits for semantic cache (must match TIER_LIMITS in user-tier.ts)
const SEMANTIC_CACHE_LIMITS = {
    free: 50,
    pro: 200,
    enterprise: 500
};

class SemanticCache {
    private embeddings: Map<string, EmbeddingCacheEntry> = new Map();
    private maxSize = SEMANTIC_CACHE_LIMITS.free; // Default to free tier
    private currentTier: 'free' | 'pro' | 'enterprise' = 'free';

    /**
     * Set tier to adjust cache limits dynamically
     */
    setTier(tier: 'free' | 'pro' | 'enterprise'): void {
        this.currentTier = tier;
        this.maxSize = SEMANTIC_CACHE_LIMITS[tier] || SEMANTIC_CACHE_LIMITS.free;
        console.log(`🧠 [SemanticCache] Tier set to ${tier}, limit: ${this.maxSize}`);
    }

    /**
     * Get current tier
     */
    getTier(): string {
        return this.currentTier;
    }

    /**
     * Cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Find semantically similar query using embeddings
     * This is a fallback when Jaccard fails
     */
    async findSimilar(query: string, threshold = 0.85): Promise<CacheEntry | null> {
        // First try Jaccard (faster)
        const jaccardResult = responseCache.findSimilar(query, 0.7);
        if (jaccardResult) {
            console.log('🎯 [SemanticCache] Jaccard hit');
            return jaccardResult;
        }

        // If no embeddings cached, skip
        if (this.embeddings.size === 0) {
            return null;
        }

        try {
            // Generate embedding for query
            const queryEmbedding = await generateEmbedding(query);
            if (!queryEmbedding || queryEmbedding.length === 0) {
                return null;
            }

            // Find most similar embedding
            let bestMatch: EmbeddingCacheEntry | null = null;
            let bestScore = 0;

            for (const entry of this.embeddings.values()) {
                const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
                if (similarity >= threshold && similarity > bestScore) {
                    bestScore = similarity;
                    bestMatch = entry;
                }
            }

            if (bestMatch) {
                console.log(`🧠 [SemanticCache] Embedding hit (similarity: ${(bestScore * 100).toFixed(1)}%)`);
                // Return from ResponseCache using the linked responseId
                return responseCache.get(bestMatch.query);
            }
        } catch (error) {
            console.warn('⚠️ [SemanticCache] Embedding search failed:', error);
        }

        return null;
    }

    /**
     * Add query embedding to cache
     */
    async addEmbedding(query: string): Promise<void> {
        try {
            // Evict oldest if at capacity
            if (this.embeddings.size >= this.maxSize) {
                const oldest = Array.from(this.embeddings.entries())
                    .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
                if (oldest) {
                    this.embeddings.delete(oldest[0]);
                }
            }

            const embedding = await generateEmbedding(query);
            if (embedding && embedding.length > 0) {
                this.embeddings.set(query, {
                    query,
                    embedding,
                    responseId: query, // Links to ResponseCache key
                    timestamp: Date.now()
                });
                console.log(`🧠 [SemanticCache] Embedding cached (${this.embeddings.size}/${this.maxSize})`);
            }
        } catch (error) {
            console.warn('⚠️ [SemanticCache] Failed to cache embedding:', error);
        }
    }

    /**
     * Get cache stats
     */
    getStats(): { embeddingCount: number; maxSize: number } {
        return {
            embeddingCount: this.embeddings.size,
            maxSize: this.maxSize
        };
    }

    /**
     * Clear all embeddings
     */
    clear(): void {
        this.embeddings.clear();
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const semanticCache = new SemanticCache();
export default semanticCache;
