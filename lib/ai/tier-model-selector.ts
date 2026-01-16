/**
 * Tier-Aware Model Selector
 * 
 * Centralized model selection that ENFORCES user tier limits.
 * Prevents free users from being charged for expensive models.
 * 
 * Fallback Strategy (Never escalate cost):
 * - Free: gemini-fast → Groq → mistral → openai-fast
 * - Paid: claude-fast → gemini → Groq → gemini-fast
 * - Enterprise: claude → openai-large → claude-fast → gemini
 * 
 * Copyright © 2026 KilatCode Studio
 */

import type { UserTier } from '../auth/user-tier';
import type { PollinationModel } from '../config/models';

export interface ModelSelection {
    primary: PollinationModel;
    fallbacks: PollinationModel[];
    groqFallback: boolean; // Use Groq as safety net
}

/**
 * Get tier-appropriate model with fallback chain
 * 
 * CRITICAL: This function ENFORCES tier limits.
 * Free users can NEVER access paid/enterprise models.
 */
export function getTierModel(
    userTier: UserTier,
    taskType: 'general' | 'code' | 'reasoning' | 'creative' = 'general'
): ModelSelection {
    switch (userTier) {
        case 'free':
            return {
                primary: taskType === 'code' ? 'qwen-coder' : 'gemini-fast',
                fallbacks: ['openai-fast', 'mistral'], // ALL free tier models
                groqFallback: true // Groq as ultimate fallback
            };

        case 'pro':
            return {
                primary: taskType === 'reasoning' ? 'deepseek' : 'claude-fast',
                fallbacks: ['gemini-search', 'qwen-coder', 'gemini-fast'], // Paid → Free degradation OK
                groqFallback: true
            };

        case 'enterprise':
            return {
                primary: taskType === 'reasoning' ? 'claude' :
                    taskType === 'creative' ? 'gemini-large' :
                        'claude',
                fallbacks: ['openai-large', 'claude-fast', 'gemini-search'], // Enterprise → Paid degradation OK
                groqFallback: true
            };

        default:
            // Safety: Unknown tier = free tier
            console.warn(`Unknown user tier: ${userTier}, defaulting to free`);
            return {
                primary: 'gemini-fast',
                fallbacks: ['openai-fast'],
                groqFallback: true
            };
    }
}

/**
 * Get model with enforced tier check
 * 
 * Use this when agent MUST respect user's subscription.
 * Prevents privilege escalation.
 */
export function getEnforcedModel(
    userId: string | undefined,
    taskType: 'general' | 'code' | 'reasoning' | 'creative' = 'general'
): ModelSelection {
    // CRITICAL: Anonymous/no userId = FREE TIER ALWAYS
    if (!userId) {
        console.log('🔒 Anonymous user detected → Enforcing FREE tier (gemini-fast)');
        return getTierModel('free', taskType);
    }

    // For authenticated users, tier will be fetched from DB
    // For now, default to free (getUserTier returns 'free' for everyone)
    return getTierModel('free', taskType);
}

/**
 * Model Cost Mapping ($/M tokens - Input/Output)
 * Used for cost tracking and tier enforcement
 */
export const MODEL_COSTS: Record<PollinationModel, { input: number; output: number; tier: UserTier }> = {
    // Free Tier Models (< $0.20 Input)
    'qwen-coder': { input: 0.06, output: 0.22, tier: 'free' },
    'openai-fast': { input: 0.06, output: 0.44, tier: 'free' },
    'gemini-fast': { input: 0.10, output: 0.40, tier: 'free' },
    'mistral': { input: 0.15, output: 0.35, tier: 'free' },
    'openai': { input: 0.15, output: 0.60, tier: 'free' },
    'grok': { input: 0.20, output: 0.50, tier: 'free' }, // New from Pricing

    // Paid Tier Models (< $1.50 Input)
    'gemini-search': { input: 0.50, output: 3.00, tier: 'pro' },
    'deepseek': { input: 0.57, output: 1.68, tier: 'pro' }, // Verified (was 0.58)
    'kimi-k2-thinking': { input: 0.60, output: 2.50, tier: 'pro' },
    'claude-fast': { input: 1.00, output: 5.00, tier: 'pro' },
    'perplexity-fast': { input: 1.00, output: 1.00, tier: 'pro' },
    'perplexity-reasoning': { input: 2.00, output: 8.00, tier: 'pro' },

    // Enterprise Tier Models (> $1.50 Input)
    'openai-large': { input: 1.75, output: 14.00, tier: 'enterprise' },
    'gemini-large': { input: 2.00, output: 12.00, tier: 'enterprise' },
    'claude': { input: 3.00, output: 15.00, tier: 'enterprise' },
    'claude-large': { input: 5.00, output: 25.00, tier: 'enterprise' }
} as const;

/**
 * Validate if user can access a model
 * 
 * SECURITY: Prevents free users from using paid models
 */
export function canUserAccessModel(
    userTier: UserTier,
    requestedModel: PollinationModel
): boolean {
    const modelCost = MODEL_COSTS[requestedModel];
    if (!modelCost) {
        console.warn(`Unknown model: ${requestedModel}`);
        return false;
    }

    const tierLevel = { free: 0, pro: 1, enterprise: 2 };
    const userLevel = tierLevel[userTier];
    const modelLevel = tierLevel[modelCost.tier];

    const canAccess = userLevel >= modelLevel;

    if (!canAccess) {
        console.warn(
            `🚫 Access denied: ${userTier} user cannot use ${requestedModel} (requires ${modelCost.tier})`
        );
    }

    return canAccess;
}

/**
 * Get safe fallback chain for a model
 * 
 * Returns models that are same-tier or cheaper
 */
export function getFallbackChain(
    primaryModel: PollinationModel,
    userTier: UserTier
): PollinationModel[] {
    const primaryCost = MODEL_COSTS[primaryModel];
    if (!primaryCost) return [];

    // Get all models user can access
    const accessibleModels = (Object.keys(MODEL_COSTS) as PollinationModel[])
        .filter(model => canUserAccessModel(userTier, model))
        .filter(model => model !== primaryModel); // Exclude primary

    // Sort by cost (cheapest first) for smart fallback
    return accessibleModels.sort((a, b) => {
        const costA = MODEL_COSTS[a].input + MODEL_COSTS[a].output;
        const costB = MODEL_COSTS[b].input + MODEL_COSTS[b].output;
        return costA - costB;
    });
}

export default {
    getTierModel,
    getEnforcedModel,
    canUserAccessModel,
    getFallbackChain,
    MODEL_COSTS
};
