'use client';

/**
 * useEmbeddings - Client-Side Xenova Hook
 * 
 * Uses Xenova transformers directly in browser when supported.
 * Falls back to server API endpoint if client-side fails.
 * 
 * Model: all-MiniLM-L6-v2 (384 dimensions)
 * - First load: ~3-5s (downloads ~23MB model)
 * - Subsequent: instant (cached in IndexedDB)
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface EmbeddingResult {
    embedding: number[];
    source: 'client' | 'server' | 'hash';
    latency: number;
}

interface UseEmbeddingsReturn {
    generateEmbedding: (text: string) => Promise<EmbeddingResult>;
    isLoading: boolean;
    isReady: boolean;
    source: 'client' | 'server' | 'none';
    error: string | null;
}

export function useEmbeddings(): UseEmbeddingsReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [source, setSource] = useState<'client' | 'server' | 'none'>('none');
    const [error, setError] = useState<string | null>(null);

    // Store pipeline in ref to persist across renders
    const pipelineRef = useRef<any>(null);
    const initAttemptedRef = useRef(false);

    // Initialize client-side Xenova
    const initializeClient = useCallback(async (): Promise<boolean> => {
        if (pipelineRef.current) return true;
        if (initAttemptedRef.current) return false;

        initAttemptedRef.current = true;
        setIsLoading(true);

        try {
            console.log('📦 Loading Xenova model in browser...');
            const startTime = Date.now();

            // Dynamic import to avoid SSR issues
            const { pipeline, env } = await import('@xenova/transformers');

            // Browser config
            env.allowLocalModels = false;
            env.useBrowserCache = true; // Cache in IndexedDB

            pipelineRef.current = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2'
            );

            console.log(`✅ Xenova client ready in ${Date.now() - startTime}ms`);
            setSource('client');
            setIsReady(true);
            setError(null);
            return true;

        } catch (err) {
            console.warn('⚠️ Client-side Xenova failed:', err);
            setError(err instanceof Error ? err.message : 'Client init failed');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Generate embedding with fallback chain
    const generateEmbedding = useCallback(async (text: string): Promise<EmbeddingResult> => {
        const startTime = Date.now();

        // Try 1: Client-side Xenova
        if (pipelineRef.current || await initializeClient()) {
            try {
                const output = await pipelineRef.current(text, {
                    pooling: 'mean',
                    normalize: true
                });

                return {
                    embedding: Array.from(output.data),
                    source: 'client',
                    latency: Date.now() - startTime
                };
            } catch (clientError) {
                console.warn('Client embedding failed, trying server...', clientError);
            }
        }

        // Try 2: Server API
        try {
            const response = await fetch('/api/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                const data = await response.json();
                setSource('server');
                return {
                    embedding: data.embeddings[0],
                    source: 'server',
                    latency: Date.now() - startTime
                };
            }
        } catch (serverError) {
            console.warn('Server embedding failed, using hash...', serverError);
        }

        // Fallback 3: Hash-based embedding
        const embedding = generateHashEmbedding(text);
        return {
            embedding,
            source: 'hash',
            latency: Date.now() - startTime
        };
    }, [initializeClient]);

    // Auto-initialize on mount
    useEffect(() => {
        initializeClient();
    }, [initializeClient]);

    return { generateEmbedding, isLoading, isReady, source, error };
}

/**
 * Hash-based fallback embedding (384 dimensions to match MiniLM)
 */
function generateHashEmbedding(text: string): number[] {
    const EMBEDDING_DIM = 384;
    const embedding: number[] = new Array(EMBEDDING_DIM).fill(0);

    // FNV-1a hash for consistent distribution
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

export default useEmbeddings;
