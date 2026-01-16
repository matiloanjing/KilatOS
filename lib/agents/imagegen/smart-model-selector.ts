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
// ============================================================================
const TIER_MODEL_POOLS: Record<UserTier, PollinationImageModel[]> = {
    free: ['flux', 'zimage'],                                    // Cheapest models
    pro: ['flux', 'zimage', 'turbo', 'seedream', 'seedream-pro', 'kontext'],
    enterprise: ['flux', 'zimage', 'turbo', 'seedream', 'seedream-pro', 'kontext', 'nanobanana', 'nanobanana-pro', 'gptimage', 'gptimage-large'],
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
// FALLBACK CHAINS
// If optimal model fails, try next in chain
// ============================================================================
const FALLBACK_CHAINS: Record<PollinationImageModel, PollinationImageModel[]> = {
    'gptimage-large': ['gptimage', 'seedream-pro', 'seedream', 'flux'],
    'gptimage': ['seedream-pro', 'seedream', 'kontext', 'flux'],
    'nanobanana-pro': ['nanobanana', 'seedream-pro', 'flux'],
    'nanobanana': ['kontext', 'seedream', 'flux'],
    'seedream-pro': ['seedream', 'kontext', 'flux'],
    'seedream': ['kontext', 'turbo', 'flux'],
    'kontext': ['seedream', 'turbo', 'flux'],
    'turbo': ['zimage', 'flux'],
    'zimage': ['flux', 'turbo'],
    'flux': ['zimage', 'turbo'],  // Ultimate fallback
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
    // 1. Detect style from prompt
    let detectedStyle = detectStyle(prompt);

    // 2. Mode overrides
    if (mode === 'ui-mockup') {
        detectedStyle = 'ui';
    } else if (mode === 'style-transfer') {
        detectedStyle = 'artistic';
    }

    // 3. Get optimal model for style
    const styleConfig = STYLE_MODEL_MAP[detectedStyle];
    let optimalModel = styleConfig.optimal;

    // 4. Check if optimal model is available for user's tier
    const availableModels = TIER_MODEL_POOLS[userTier];

    if (!availableModels.includes(optimalModel)) {
        // Find best alternative available for this tier
        for (const alt of styleConfig.alternatives) {
            if (availableModels.includes(alt)) {
                console.log(`🔄 Model ${optimalModel} not available for ${userTier}, using ${alt}`);
                optimalModel = alt;
                break;
            }
        }

        // If no alternative found, use tier default
        if (!availableModels.includes(optimalModel)) {
            optimalModel = availableModels[0]; // First in pool is default
            console.log(`⚠️ No style-matched model available, using tier default: ${optimalModel}`);
        }
    }

    // 5. Get fallbacks (filtered by tier)
    const allFallbacks = FALLBACK_CHAINS[optimalModel] || [];
    const tierFallbacks = allFallbacks.filter(m => availableModels.includes(m));

    const reason = availableModels.includes(styleConfig.optimal)
        ? styleConfig.reason
        : `${styleConfig.reason} (tier-adjusted to ${optimalModel})`;

    console.log(`✨ Smart Model Selection: ${optimalModel} for "${detectedStyle}" style (${userTier} tier)`);

    return {
        model: optimalModel,
        style: detectedStyle,
        reason,
        fallbacks: tierFallbacks
    };
}

/**
 * Get next fallback model
 */
export function getNextFallback(
    currentModel: PollinationImageModel,
    userTier: UserTier,
    attemptedModels: PollinationImageModel[] = []
): PollinationImageModel | null {
    const availableModels = TIER_MODEL_POOLS[userTier];
    const fallbacks = FALLBACK_CHAINS[currentModel] || [];

    for (const fallback of fallbacks) {
        if (availableModels.includes(fallback) && !attemptedModels.includes(fallback)) {
            console.log(`🔄 Fallback: ${currentModel} → ${fallback}`);
            return fallback;
        }
    }

    // Ultimate fallback: first model in tier pool not yet attempted
    for (const model of availableModels) {
        if (!attemptedModels.includes(model)) {
            console.log(`⚠️ Ultimate fallback: ${model}`);
            return model;
        }
    }

    return null; // All models exhausted
}

/**
 * Get tier-default model (fastest/cheapest for tier)
 */
export function getTierDefaultModel(userTier: UserTier): PollinationImageModel {
    const defaults: Record<UserTier, PollinationImageModel> = {
        free: 'flux',
        pro: 'seedream',
        enterprise: 'gptimage'
    };
    return defaults[userTier];
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
