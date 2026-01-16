/**
 * Model Service - Database-Driven LLM Model Selection
 * 
 * Replaces hardcoded models with dynamic DB-driven selection.
 * Supports Text, Image, and Audio models with tier-based access control.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { createClient } from '@/lib/auth/server';
import type { UserTier } from '@/lib/auth/user-tier';

// ============================================================================
// Types
// ============================================================================

export type ModelType = 'text' | 'image' | 'audio';

export interface LLMModel {
    id: string;
    model_id: string;
    display_name: string;
    provider: 'pollinations' | 'groq' | 'openai';
    model_type: ModelType;
    tier_required: UserTier;
    is_active: boolean;
    is_fallback: boolean;
    tokens_per_request: number; // Legacy
    cost_per_request: number;   // Legacy
    input_cost_per_m: number;   // New (Split Pricing)
    output_cost_per_m: number;  // New (Split Pricing)
    priority: number;
}

export interface UserModelPreference {
    user_id: string;
    selected_model_id: string;
}

// ============================================================================
// Cache (In-Memory for Performance)
// ============================================================================

let modelsCache: LLMModel[] | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getModelsFromDB(): Promise<LLMModel[]> {
    const now = Date.now();

    // Return cached if valid
    if (modelsCache && now < cacheExpiry) {
        return modelsCache;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('llm_models')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });

    if (error) {
        console.error('[ModelService] Failed to fetch models:', error);
        return modelsCache || []; // Return stale cache if available
    }

    modelsCache = data as LLMModel[];
    cacheExpiry = now + CACHE_TTL;

    return modelsCache;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get available models for a user based on tier
 */
export async function getAvailableModels(
    userTier: UserTier,
    type: ModelType = 'text'
): Promise<LLMModel[]> {
    const allModels = await getModelsFromDB();

    const tierLevel: Record<string, number> = {
        free: 0,
        paid: 1,
        pro: 1, // Alias for paid
        enterprise: 2
    };

    const userLevel = tierLevel[userTier] ?? 0;

    return allModels.filter(model => {
        const modelLevel = tierLevel[model.tier_required] ?? 0;
        return model.model_type === type &&
            !model.is_fallback &&
            userLevel >= modelLevel;
    });
}

/**
 * Get user's selected model from preferences
 */
export async function getUserSelectedModel(
    userId: string
): Promise<string | null> {
    if (!userId) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_model_preferences')
        .select('selected_model_id')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return null;
    }

    return data.selected_model_id;
}

/**
 * Save user's model preference
 */
export async function setUserSelectedModel(
    userId: string,
    modelId: string
): Promise<boolean> {
    if (!userId) return false;

    const supabase = await createClient();
    const { error } = await supabase
        .from('user_model_preferences')
        .upsert({
            user_id: userId,
            selected_model_id: modelId,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error('[ModelService] Failed to save preference:', error);
        return false;
    }

    return true;
}

/**
 * Get fallback models (Groq) for when primary fails
 */
export async function getFallbackModels(
    type: ModelType = 'text'
): Promise<LLMModel[]> {
    const allModels = await getModelsFromDB();

    return allModels.filter(model =>
        model.is_fallback &&
        model.model_type === type
    ).sort((a, b) => a.priority - b.priority);
}

/**
 * Get model info by model_id
 */
export async function getModelInfo(
    modelId: string
): Promise<LLMModel | null> {
    const allModels = await getModelsFromDB();
    return allModels.find(m => m.model_id === modelId) || null;
}

/**
 * Validate if user can access a specific model
 */
export async function canUserAccessModel(
    userTier: UserTier,
    modelId: string
): Promise<boolean> {
    const model = await getModelInfo(modelId);
    if (!model) return false;

    const tierLevel: Record<string, number> = {
        free: 0,
        paid: 1,
        pro: 1,
        enterprise: 2
    };

    const userLevel = tierLevel[userTier] ?? 0;
    const modelLevel = tierLevel[model.tier_required] ?? 0;

    return userLevel >= modelLevel;
}

/**
 * Get default model for a tier and type
 */
export async function getDefaultModel(
    userTier: UserTier,
    type: ModelType = 'text'
): Promise<string> {
    const available = await getAvailableModels(userTier, type);

    if (available.length > 0) {
        return available[0].model_id;
    }

    // Ultimate fallback
    return type === 'text' ? 'gemini-fast' :
        type === 'image' ? 'flux' :
            'whisper-large-v3';
}

/**
 * Invalidate cache (call after model updates)
 */
export function invalidateModelCache(): void {
    modelsCache = null;
    cacheExpiry = 0;
}

// ============================================================================
// Export
// ============================================================================

export const modelService = {
    getAvailableModels,
    getUserSelectedModel,
    setUserSelectedModel,
    getFallbackModels,
    getModelInfo,
    canUserAccessModel,
    getDefaultModel,
    invalidateModelCache
};

export default modelService;
