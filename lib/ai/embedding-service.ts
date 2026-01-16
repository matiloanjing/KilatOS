/**
 * Unified Embedding Service
 * 
 * Priority Chain:
 * 1. Xenova Server API (/api/embed) - for server-side code
 * 2. Hash-based fallback - emergency only
 * 
 * For client-side usage, use `hooks/use-embeddings.ts` instead.
 * 
 * Model: all-MiniLM-L6-v2 (384 dimensions)
 * 
 * Copyright © 2026 KilatCode Studio
 */

const EMBEDDING_DIM = 384; // Match Xenova all-MiniLM-L6-v2

/**
 * Generate embedding for text (server-side usage)
 * 
 * Uses server API endpoint which runs Xenova with singleton pattern.
 * Falls back to hash-based embedding if API fails.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // Check if running in browser or server
    const isBrowser = typeof window !== 'undefined';

    if (isBrowser) {
        // In browser: call local API
        try {
            const response = await fetch('/api/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                const data = await response.json();
                return data.embeddings[0];
            }
        } catch (error) {
            console.warn('⚠️ Server embedding failed:', error);
        }
    } else {
        // In server: call internal Xenova
        try {
            // Dynamic import to avoid build issues
            const { pipeline, env } = await import('@xenova/transformers');
            env.allowLocalModels = false;

            const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            const output = await extractor(text, { pooling: 'mean', normalize: true });
            return Array.from(output.data);
        } catch (error) {
            console.warn('⚠️ Server-side Xenova failed:', error);
        }
    }

    // Fallback: Hash-based embedding
    console.log('📦 Using hash-based embedding fallback');
    return generateHashEmbedding(text);
}

/**
 * Batch embedding generation
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        const response = await fetch('/api/embed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts })
        });

        if (response.ok) {
            const data = await response.json();
            return data.embeddings;
        }
    } catch (error) {
        console.warn('⚠️ Batch embedding failed:', error);
    }

    // Fallback: Generate individually with hash
    return texts.map(t => generateHashEmbedding(t));
}

/**
 * Hash-based embedding fallback (384 dimensions)
 * Deterministic, fast, but not semantic
 */
function generateHashEmbedding(text: string): number[] {
    const embedding: number[] = new Array(EMBEDDING_DIM).fill(0);

    const fnv1a = (str: string, seed: number = 0): number => {
        let hash = 2166136261 + seed;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    };

    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/).filter(w => w.length > 0);

    for (let i = 0; i < EMBEDDING_DIM; i++) {
        const charHash = fnv1a(normalized, i);
        const wordIdx = i % Math.max(words.length, 1);
        const wordHash = words.length > 0 ? fnv1a(words[wordIdx], i + 1000) : 0;
        embedding[i] = ((charHash + wordHash) / 2147483647) - 1;
    }

    // L2 normalize
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return norm > 0 ? embedding.map(v => v / norm) : embedding;
}

/**
 * Get embedding dimensions (for DB schema reference)
 */
export const EMBEDDING_DIMENSIONS = EMBEDDING_DIM;

export default generateEmbedding;
