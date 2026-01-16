/**
 * Prefetch System for KilatOS
 * 
 * HYBRID PREDICTION:
 * 1. Fast keyword matching (English patterns)
 * 2. AI prediction via Groq (multilingual, slower but smarter)
 * 
 * Pre-warms cache with predicted follow-up queries.
 * Runs in background after successful code generation.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { responseCache } from '@/lib/agents/codegen/response-cache';
import { groqProvider } from '@/lib/ai/providers/groq';

// ============================================================================
// Keyword-Based Prediction (Fast, English)
// ============================================================================

/**
 * Common follow-up patterns based on initial query type
 */
const FOLLOW_UP_PATTERNS: Record<string, string[]> = {
    'login': ['register form', 'forgot password', 'dashboard after login'],
    'form': ['form validation', 'form submission', 'input handling'],
    'button': ['button loading state', 'button disabled state', 'button animation'],
    'modal': ['modal close', 'modal animation', 'modal backdrop'],
    'table': ['table pagination', 'table sorting', 'table filtering'],
    'navbar': ['mobile menu', 'dropdown menu', 'navbar sticky'],
    'card': ['card hover effect', 'card grid layout', 'card skeleton'],
    'api': ['api error handling', 'api loading state', 'api caching'],
    'auth': ['protected route', 'auth context', 'logout button'],
    'dark': ['dark mode toggle', 'theme provider', 'color scheme'],
    // Indonesian keywords
    'tombol': ['tombol loading', 'tombol disabled', 'animasi tombol'],
    'tabel': ['pagination tabel', 'sorting tabel', 'filter tabel'],
    'formulir': ['validasi formulir', 'submit formulir', 'input handling'],
};

/**
 * Extract keywords from user query
 */
function extractKeywords(query: string): string[] {
    const normalized = query.toLowerCase();
    const keywords: string[] = [];

    for (const pattern of Object.keys(FOLLOW_UP_PATTERNS)) {
        if (normalized.includes(pattern)) {
            keywords.push(pattern);
        }
    }

    return keywords;
}

/**
 * Get predicted follow-up queries based on keyword matching
 */
export function getKeywordPredictions(query: string): string[] {
    const keywords = extractKeywords(query);
    const predictions: string[] = [];

    for (const keyword of keywords) {
        const followUps = FOLLOW_UP_PATTERNS[keyword] || [];
        predictions.push(...followUps);
    }

    // Return unique predictions, max 3
    return [...new Set(predictions)].slice(0, 3);
}

// ============================================================================
// AI-Based Prediction (Groq - Fast, Multilingual)
// ============================================================================

/**
 * Get AI-generated predictions using Groq (llama-3.1-8b-instant for speed)
 */
export async function getAIPredictions(query: string): Promise<string[]> {
    try {
        const response = await groqProvider.call({
            prompt: `Given this code generation request: "${query}"

What are 3 likely follow-up requests the user might make next?
Answer in the SAME LANGUAGE as the input query.
Return ONLY a JSON array, no explanation: ["prediction1", "prediction2", "prediction3"]`,
            model: 'llama-3.1-8b-instant', // Fastest Groq model
            temperature: 0.3,
            maxTokens: 150
        });

        // Parse JSON array from response
        const jsonMatch = response.content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            const predictions = JSON.parse(jsonMatch[0]);
            if (Array.isArray(predictions)) {
                console.log(`🤖 [Prefetch] AI predictions: ${predictions.join(', ')}`);
                return predictions.slice(0, 3);
            }
        }
    } catch (error) {
        console.warn('⚠️ [Prefetch] AI prediction failed:', error instanceof Error ? error.message : String(error));
    }

    return [];
}

// ============================================================================
// Hybrid Prediction (Best of Both)
// ============================================================================

/**
 * Get predicted follow-up queries (Hybrid: Keyword + AI)
 */
export async function getPredictedQueries(query: string): Promise<string[]> {
    // 1. Try fast keyword matching first
    const keywordPredictions = getKeywordPredictions(query);
    if (keywordPredictions.length > 0) {
        return keywordPredictions;
    }

    // 2. Fallback to AI prediction (for non-English or complex queries)
    return await getAIPredictions(query);
}

/**
 * Pre-warm cache with predicted queries
 * This is fire-and-forget, runs in background
 * 
 * @param sessionId - Current session
 * @param originalQuery - User's query
 * @param tier - User tier (free: log only, pro: 1 pre-gen, enterprise: 3 pre-gen)
 */
export async function prefetchRelatedPatterns(
    sessionId: string,
    originalQuery: string,
    tier: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<void> {
    console.log(`🔮 [Prefetch] Starting background prefetch (tier: ${tier})...`);

    const predictions = await getPredictedQueries(originalQuery);

    if (predictions.length === 0) {
        console.log('🔮 [Prefetch] No predictions for this query');
        return;
    }

    console.log(`🔮 [Prefetch] Found ${predictions.length} predicted follow-ups:`, predictions);

    // Determine pre-generation limit based on tier
    const preGenLimit = tier === 'enterprise' ? 3 : tier === 'pro' ? 1 : 0;
    let preGenCount = 0;

    for (const prediction of predictions) {
        // Check if already cached
        const existing = responseCache.findSimilar(prediction, 0.8);
        if (existing) {
            console.log(`🔮 [Prefetch] "${prediction}" already cached`);
        } else if (preGenCount < preGenLimit) {
            // PRO/ENT: Actually pre-generate (mark for pre-gen, actual gen happens lazily)
            console.log(`🔮 [Prefetch] "${prediction}" queued for pre-generation (${preGenCount + 1}/${preGenLimit})`);
            // NOTE: Actual pre-generation would call the code generator here
            // For now, we mark it as "ready to pre-gen" without blocking
            // Full implementation would cache a skeleton response
            responseCache.set(prediction, {
                prefetched: true,
                query: prediction,
                timestamp: Date.now(),
                status: 'pending'
            }, 'simple');
            preGenCount++;
        } else {
            console.log(`🔮 [Prefetch] "${prediction}" (tier ${tier}: no pre-gen quota)`);
        }
    }

    if (preGenCount > 0) {
        console.log(`🔮 [Prefetch] Pre-generated ${preGenCount} predictions for ${tier} tier`);
    }
}

/**
 * Prefetch stats for monitoring
 */
export function getPrefetchStats(): {
    totalPatterns: number;
    categories: string[];
    aiEnabled: boolean;
} {
    return {
        totalPatterns: Object.values(FOLLOW_UP_PATTERNS).flat().length,
        categories: Object.keys(FOLLOW_UP_PATTERNS),
        aiEnabled: !!process.env.GROQ_API_KEY
    };
}
