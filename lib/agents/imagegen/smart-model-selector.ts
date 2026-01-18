/**
 * Smart Image Model Selector
 * Auto-selects optimal model based on:
 * 1. User Tier (Free/Pro/Enterprise)
 * 2. Style Detection (anime, realistic, artistic, etc.)
 * 3. Fallback Chains (if primary fails)
 * 
 * Copyright © 2026 KilatCode Studio
 */

import type { PollinationImageModel } from '@/lib/config/models';

export type UserTier = 'free' | 'pro' | 'enterprise';
export type ImageStyle = 'anime' | 'realistic' | 'artistic' | 'abstract' | 'photo' | 'logo' | 'ui' | 'general';

// ============================================================================
// TIER-BASED MODEL POOLS
// Each tier has access to different model sets
// ALL TIERS START FROM FLUX (user requirement 2026-01-18)
// ============================================================================
const TIER_MODEL_POOLS: Record<UserTier, PollinationImageModel[]> = {
    free: ['flux', 'zimage', 'turbo'],  // 3 models
    pro: ['flux', 'zimage', 'turbo', 'seedream', 'kontext'],  // 5 models
    enterprise: ['flux', 'zimage', 'turbo', 'seedream', 'kontext', 'gptimage', 'seedream-pro'],  // 7 models
};

// ============================================================================
// TIER-SPECIFIC FALLBACK CHAINS (2026-01-18)
// All tiers start from flux, higher tiers have more fallback options
// FREE: flux → zimage → turbo
// PRO: flux → zimage → turbo → seedream → kontext
// ENT: flux → zimage → turbo → seedream → kontext → gptimage → seedream-pro
// ============================================================================
const TIER_FALLBACK_ORDER: Record<UserTier, PollinationImageModel[]> = {
    free: ['flux', 'zimage', 'turbo'],
    pro: ['flux', 'zimage', 'turbo', 'seedream', 'kontext'],
    enterprise: ['flux', 'zimage', 'turbo', 'seedream', 'kontext', 'gptimage', 'seedream-pro'],
};

// ============================================================================
// STYLE-TO-MODEL MAPPING
// Maps detected style to optimal model for that style
// ============================================================================
const STYLE_MODEL_MAP: Record<ImageStyle, {
    optimal: PollinationImageModel;
    alternatives: PollinationImageModel[];
    reason: string;
}> = {
    anime: {
        optimal: 'flux',           // Flux excels at anime/illustration
        alternatives: ['zimage', 'seedream'],
        reason: 'Flux produces clean anime lines and vibrant colors'
    },
    realistic: {
        optimal: 'zimage',         // Z-Image for photorealistic
        alternatives: ['seedream-pro', 'gptimage'],
        reason: 'Z-Image optimized for realistic textures'
    },
    photo: {
        optimal: 'seedream-pro',   // Best for photo-like images
        alternatives: ['gptimage', 'seedream'],
        reason: 'Seedream Pro excels at photographic quality'
    },
    artistic: {
        optimal: 'nanobanana',     // Style transfer specialist
        alternatives: ['nanobanana-pro', 'kontext'],
        reason: 'NanoBanana designed for artistic styles'
    },
    abstract: {
        optimal: 'kontext',        // Contextual understanding
        alternatives: ['seedream', 'flux'],
        reason: 'Kontext handles abstract concepts well'
    },
    logo: {
        optimal: 'gptimage',       // Clean vector-like output
        alternatives: ['seedream-pro', 'flux'],
        reason: 'GPTImage produces clean, professional logos'
    },
    ui: {
        optimal: 'gptimage',       // UI mockups need precision
        alternatives: ['gptimage-large', 'seedream-pro'],
        reason: 'GPTImage best for UI/UX mockups'
    },
    general: {
        optimal: 'seedream',       // Balanced default
        alternatives: ['flux', 'zimage'],
        reason: 'Seedream provides good balance of quality and speed'
    }
};

// ============================================================================
// STYLE DETECTION KEYWORDS
// Used to detect style from user prompt
// ============================================================================
const STYLE_KEYWORDS: Record<ImageStyle, RegExp[]> = {
    anime: [
        /anime|manga|cartoon|cel.?shaded|chibi|kawaii/i,
        /ghibli|pixar|2d.?style|illustration/i,
        /komik|kartun|animasi/i  // Indonesian
    ],
    realistic: [
        /realistic|photorealistic|hyper.?realistic|real.?life/i,
        /cinematic|film|movie.?still|dramatic/i,
        /nyata|realistis|seperti.?asli/i  // Indonesian
    ],
    photo: [
        /photo|photograph|portrait|headshot|candid/i,
        /camera|lens|bokeh|depth.?of.?field/i,
        /foto|potret|gambar.?asli/i  // Indonesian
    ],
    artistic: [
        /artistic|art.?style|painting|oil.?paint|watercolor/i,
        /impressionist|expressionist|surreal|abstract.?art/i,
        /lukisan|seni|cat.?air|kanvas/i  // Indonesian
    ],
    abstract: [
        /abstract|geometric|pattern|fractal|psychedelic/i,
        /trippy|minimalist|conceptual/i,
        /abstrak|geometris|pola/i  // Indonesian
    ],
    logo: [
        /logo|icon|emblem|badge|brand|symbol/i,
        /vector|flat.?design|minimal.?logo/i,
        /ikon|lambang|merek/i  // Indonesian
    ],
    ui: [
        /ui|ux|interface|mockup|wireframe|dashboard/i,
        /app.?design|web.?design|layout|screen/i,
        /tampilan|desain.?aplikasi|antarmuka/i  // Indonesian
    ],
    general: [] // Fallback, no specific keywords
};

// ============================================================================
// FALLBACK CHAINS (deprecated - use TIER_FALLBACK_ORDER instead)
// Kept for backward compatibility
// ============================================================================
const FALLBACK_CHAINS: Record<PollinationImageModel, PollinationImageModel[]> = {
    'flux': ['zimage', 'turbo'],
    'zimage': ['turbo', 'flux'],
    'turbo': ['zimage', 'flux'],
    'seedream': ['kontext', 'turbo', 'zimage', 'flux'],
    'kontext': ['seedream', 'turbo', 'zimage', 'flux'],
    'gptimage': ['seedream-pro', 'seedream', 'kontext', 'turbo', 'zimage', 'flux'],
    'seedream-pro': ['gptimage', 'seedream', 'kontext', 'turbo', 'zimage', 'flux'],
    'gptimage-large': ['gptimage', 'seedream-pro', 'seedream', 'kontext', 'turbo', 'zimage', 'flux'],
    'nanobanana': ['kontext', 'seedream', 'turbo', 'zimage', 'flux'],
    'nanobanana-pro': ['nanobanana', 'seedream-pro', 'kontext', 'turbo', 'zimage', 'flux'],
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Detect image style from prompt
 */
export function detectStyle(prompt: string): ImageStyle {
    const lowerPrompt = prompt.toLowerCase();

    for (const [style, patterns] of Object.entries(STYLE_KEYWORDS)) {
        if (style === 'general') continue; // Skip general as fallback

        for (const pattern of patterns) {
            if (pattern.test(lowerPrompt)) {
                console.log(`🎨 Style detected: ${style} (matched: ${pattern})`);
                return style as ImageStyle;
            }
        }
    }

    return 'general';
}

/**
 * Smart select image model based on tier and prompt
 * NOTE (2026-01-18): All tiers now START with flux per user requirement.
 * Style detection is kept for fallback ordering information only.
 */
export function smartSelectImageModel(
    prompt: string,
    userTier: UserTier,
    mode?: 'text2image' | 'ui-mockup' | 'style-transfer'
): {
    model: PollinationImageModel;
    style: ImageStyle;
    reason: string;
    fallbacks: PollinationImageModel[];
} {
    // 1. Detect style from prompt (for logging/fallback info only)
    let detectedStyle = detectStyle(prompt);

    // 2. Mode overrides (for logging only)
    if (mode === 'ui-mockup') {
        detectedStyle = 'ui';
    } else if (mode === 'style-transfer') {
        detectedStyle = 'artistic';
    }

    // 3. ALWAYS start with flux (user requirement 2026-01-18)
    // All tiers start from flux, fallback order differs by tier
    const startModel: PollinationImageModel = 'flux';

    // 4. Get tier-specific fallbacks
    const tierFallbacks = TIER_FALLBACK_ORDER[userTier].slice(1); // Exclude flux since it's the primary

    console.log(`✨ Smart Model Selection: ${startModel} for "${detectedStyle}" style (${userTier} tier)`);
    console.log(`   → Fallback chain: ${tierFallbacks.join(' → ')}`);

    return {
        model: startModel,
        style: detectedStyle,
        reason: `All tiers start with flux (cheapest, most reliable). Fallbacks: ${tierFallbacks.join(' → ')}`,
        fallbacks: tierFallbacks
    };
}

/**
 * Get next fallback model based on tier-specific order
 * All tiers start from flux and progressively try more models
 */
export function getNextFallback(
    currentModel: PollinationImageModel,
    userTier: UserTier,
    attemptedModels: PollinationImageModel[] = []
): PollinationImageModel | null {
    // Use tier-specific fallback order
    const fallbackOrder = TIER_FALLBACK_ORDER[userTier];

    // Find next model in the fallback order that hasn't been attempted
    for (const model of fallbackOrder) {
        if (!attemptedModels.includes(model)) {
            console.log(`🔄 Fallback: ${currentModel} → ${model} (tier: ${userTier})`);
            return model;
        }
    }

    console.log(`⚠️ All ${fallbackOrder.length} models exhausted for ${userTier} tier`);
    return null; // All models exhausted
}

/**
 * Get tier-default model - ALWAYS starts with flux (user requirement 2026-01-18)
 */
export function getTierDefaultModel(userTier: UserTier): PollinationImageModel {
    // All tiers start with flux (cheapest, most reliable)
    return 'flux';
}

/**
 * Check if model is available for tier
 */
export function isModelAvailableForTier(
    model: PollinationImageModel,
    userTier: UserTier
): boolean {
    return TIER_MODEL_POOLS[userTier].includes(model);
}

/**
 * Get all available models for tier
 */
export function getAvailableModelsForTier(userTier: UserTier): PollinationImageModel[] {
    return [...TIER_MODEL_POOLS[userTier]];
}
