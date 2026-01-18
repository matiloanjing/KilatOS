/**
 * User Tier Detection & Model Access Control
 * CRITICAL: Enforces tier-based model selection to prevent cost overruns
 * Copyright © 2025 KilatCode Studio
 * 
 * TIER LIMITS (Budget/day):
 * - FREE: $1/day (1 pollen)
 * - PAID: $5/day (5 pollen)  
 * - ENTERPRISE: $10/day (10 pollen)
 * 
 * NOTE: Settings are now loaded from database via DynamicConfig.
 * Hardcoded values below serve as FALLBACK if DB is unavailable.
 */

import { createClient } from '@supabase/supabase-js';

// Dynamic config import (with lazy loading to avoid circular deps)
let _dynamicConfig: typeof import('@/lib/config/dynamic-config') | null = null;
async function getDynamicConfig() {
    if (!_dynamicConfig) {
        _dynamicConfig = await import('@/lib/config/dynamic-config');
    }
    return _dynamicConfig;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export type UserTier = 'free' | 'pro' | 'enterprise';

// ============================================================================
// TIER MODEL CONFIGURATION
// ============================================================================

/**
 * TEXT MODEL MAPPING BY TIER
 * Primary + Fallback for reliability
 * CRITICAL: FREE users MUST use cheapest models only!
 */
export const TEXT_TIER_MODELS: Record<UserTier, { primary: string; fallback: string }> = {
    free: {
        primary: 'openai-fast',    // FAST response (~5s) - was qwen-coder (slow/overloaded)
        fallback: 'qwen-coder',    // Code-specialized but currently slow
    },
    pro: {
        primary: 'gemini-fast',    // $0.10/$0.40 per M tokens (good balance)
        fallback: 'mistral',       // $0.15/$0.35 per M tokens (backup)
    },
    enterprise: {
        primary: 'deepseek',       // $0.58/$1.68 per M tokens (advanced reasoning)
        fallback: 'claude-fast',   // $1.0/$5.0 per M tokens (backup)
    },
};

/**
 * IMAGE MODEL MAPPING BY TIER
 * Primary + Fallback for reliability
 */
export const IMAGE_TIER_MODELS: Record<UserTier, { primary: string; fallback: string }> = {
    free: {
        primary: 'flux',           // $0.0002/image (cheapest)
        fallback: 'zimage',        // $0.0002/image (alternative)
    },
    pro: {
        primary: 'seedream',       // $0.03/image (good quality)
        fallback: 'turbo',         // $0.0003/image (fallback to cheap)
    },
    enterprise: {
        primary: 'seedream-pro',   // $0.04/image (professional)
        fallback: 'kontext',       // $0.04/image (alternative)
    },
};


/**
 * TIER BUDGET LIMITS
 * 1 pollen = $1 USD
 */
export const TIER_LIMITS: Record<UserTier, {
    dailyPollen: number;        // Daily budget in pollen ($)
    maxImagesPerRequest: number;
    maxImageSize: number;
    contextWindow: number;
    rateLimit: number;          // requests per minute
    maxSessionMessages: number; // Max messages in session memory
    maxSessions: number;        // Max concurrent sessions
    semanticCacheLimit: number; // Max embeddings in semantic cache
    responseCacheLimit: number; // Max responses in response cache
    prefetchEnabled: boolean;   // Allow prefetch pre-generation
}> = {
    free: {
        dailyPollen: 1,            // $1/day
        maxImagesPerRequest: 1,
        maxImageSize: 1024,
        contextWindow: 16000,      // Updated: 16K tokens
        rateLimit: 10,
        maxSessionMessages: 20,    // Updated: 20 messages for free
        maxSessions: 10,           // 10 sessions for free
        semanticCacheLimit: 50,    // 50 embeddings
        responseCacheLimit: 50,    // 50 responses
        prefetchEnabled: false,    // No prefetch for free
    },
    pro: {
        dailyPollen: 5,            // $5/day
        maxImagesPerRequest: 3,
        maxImageSize: 1920,
        contextWindow: 64000,      // Updated: 64K tokens
        rateLimit: 30,
        maxSessionMessages: 50,    // Updated: 50 messages for pro
        maxSessions: 50,           // 50 sessions for pro
        semanticCacheLimit: 200,   // 200 embeddings
        responseCacheLimit: 150,   // 150 responses
        prefetchEnabled: true,     // 1 prediction pre-gen
    },
    enterprise: {
        dailyPollen: 10,           // $10/day
        maxImagesPerRequest: 10,
        maxImageSize: 2048,
        contextWindow: 200000,     // 200K tokens
        rateLimit: 60,
        maxSessionMessages: 100,   // Updated: 100 messages for enterprise
        maxSessions: -1,           // -1 = Unlimited sessions
        semanticCacheLimit: 500,   // 500 embeddings
        responseCacheLimit: 300,   // 300 responses
        prefetchEnabled: true,     // 3 predictions pre-gen
    }
};

// ============================================================================
// TIER DETECTION
// ============================================================================

/**
 * Get user's subscription tier
 * @param userId - User ID from Supabase auth
 * @returns User tier (free, paid, or enterprise)
 */
export async function getUserTier(userId?: string): Promise<UserTier> {
    // Anonymous/undefined/invalid users = FREE tier (STRICT!)
    // Check for: undefined, null, empty, 'anon', 'anonymous', or non-UUID strings
    if (!userId || userId === 'anon' || userId === 'anonymous' || userId.length < 20) {
        // Don't log for system calls to reduce noise
        if (userId && userId !== 'anon') {
            console.log('🔒 Invalid userId provided, enforcing FREE tier');
        }
        return 'free';
    }

    try {
        // Query actual subscription from Supabase
        const { data, error } = await supabase
            .from('subscriptions')
            .select('tier')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (error) {
            console.error('Error fetching user tier:', error);
            return 'free';
        }

        if (data && data.tier) {
            console.log(`🔓 User ${userId.substring(0, 8)}... detected as ${data.tier} tier`);
            return data.tier as UserTier;
        }

        console.log(`🔒 User ${userId.substring(0, 8)}... -> No active subscription, defaulting to FREE`);
        return 'free';
    } catch (error) {
        console.error('Unexpected error in getUserTier:', error);
        return 'free'; // ALWAYS default to free on error for safety
    }
}

/**
 * Get user's role from profiles
 * @param userId - User ID
 * @returns 'admin' | 'user'
 */
export async function getUserRole(userId?: string): Promise<'user' | 'admin'> {
    if (!userId) return 'user';

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.warn('Error fetching user role:', error.message);
            return 'user';
        }

        return (data?.role as 'admin' | 'user') || 'user';
    } catch (error) {
        return 'user';
    }
}

// ============================================================================
// MODEL SELECTION
// ============================================================================

/**
 * Get model for user's tier (ENFORCED!)
 * @param tier - User's subscription tier
 * @param type - Model type ('text' or 'image')
 * @returns Model name (never returns enterprise models for free tier!)
 */
export function getModelForTier(
    tier: UserTier,
    type: 'text' | 'image'
): string {
    if (type === 'text') {
        const model = TEXT_TIER_MODELS[tier].primary;
        console.log(`📊 Tier ${tier} -> Text model: ${model}`);
        return model;
    }

    if (type === 'image') {
        const model = IMAGE_TIER_MODELS[tier].primary;
        console.log(`📊 Tier ${tier} -> Image model: ${model}`);
        return model;
    }

    throw new Error(`Unknown model type: ${type}`);
}

/**
 * Get fallback model for user's tier
 * Used when primary model fails
 */
export function getFallbackModelForTier(
    tier: UserTier,
    type: 'text' | 'image'
): string {
    if (type === 'text') {
        return TEXT_TIER_MODELS[tier].fallback;
    }
    if (type === 'image') {
        return IMAGE_TIER_MODELS[tier].fallback;
    }
    throw new Error(`Unknown model type: ${type}`);
}

/**
 * Check if a model is allowed for a tier
 * CRITICAL: Prevents free users from using expensive models!
 */
export function isModelAllowedForTier(model: string, tier: UserTier): boolean {
    // Define which models belong to which tier
    const FREE_MODELS = ['qwen-coder', 'openai-fast', 'gemini-fast', 'mistral', 'flux', 'zimage', 'turbo'];
    const PAID_MODELS = [...FREE_MODELS, 'deepseek', 'seedream', 'kontext', 'seedream-pro', 'grok'];
    const ENTERPRISE_MODELS = [...PAID_MODELS, 'claude', 'claude-fast', 'claude-large', 'openai', 'openai-large', 'gemini-large', 'gptimage', 'gptimage-large'];

    switch (tier) {
        case 'free':
            return FREE_MODELS.includes(model);
        case 'pro':
            return PAID_MODELS.includes(model);
        case 'enterprise':
            return ENTERPRISE_MODELS.includes(model);
        default:
            return false;
    }
}

/**
 * Enforce tier model - downgrades model if user doesn't have access
 * ALWAYS call this before making API calls!
 */
export function enforceTierModel(requestedModel: string, tier: UserTier, type: 'text' | 'image'): string {
    if (isModelAllowedForTier(requestedModel, tier)) {
        return requestedModel;
    }

    // Downgrade to tier's default model
    const enforcedModel = getModelForTier(tier, type);
    console.warn(`⚠️ Model ${requestedModel} not allowed for ${tier} tier, enforcing: ${enforcedModel}`);
    return enforcedModel;
}

// ============================================================================
// ACCESS CONTROL
// ============================================================================

/**
 * Check if user has access to a specific tier feature
 * @param userId - User ID
 * @param requiredTier - Minimum tier required
 * @returns Whether user has access
 */
export async function hasAccess(
    userId: string | undefined,
    requiredTier: UserTier
): Promise<boolean> {
    const userTier = await getUserTier(userId);

    const tierLevel = {
        free: 0,
        pro: 1,
        enterprise: 2
    };

    return tierLevel[userTier] >= tierLevel[requiredTier];
}

/**
 * Get tier limits
 * @param tier - User tier
 * @returns Tier limits (pollen, images, requests)
 */
export function getTierLimits(tier: UserTier) {
    return TIER_LIMITS[tier];
}

/**
 * Get tier limits from dynamic config (database)
 * Falls back to hardcoded TIER_LIMITS if DB unavailable
 * @param tier - User tier
 */
export async function getTierLimitsDynamic(tier: UserTier): Promise<typeof TIER_LIMITS[UserTier]> {
    try {
        const dynamicConfig = await getDynamicConfig();
        const settings = await dynamicConfig.getTierSettings(tier);
        return {
            dailyPollen: settings.dailyPollen,
            maxImagesPerRequest: settings.maxImagesPerRequest,
            maxImageSize: settings.maxImageSize,
            contextWindow: settings.contextWindow,
            rateLimit: settings.rateLimit,
            maxSessionMessages: settings.maxSessionMessages,
            maxSessions: TIER_LIMITS[tier].maxSessions,
            semanticCacheLimit: TIER_LIMITS[tier].semanticCacheLimit,
            responseCacheLimit: TIER_LIMITS[tier].responseCacheLimit,
            prefetchEnabled: TIER_LIMITS[tier].prefetchEnabled,
        };
    } catch (error) {
        console.warn('[user-tier] DynamicConfig unavailable, using fallback');
        return TIER_LIMITS[tier];
    }
}
