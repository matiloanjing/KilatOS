/**
 * Dynamic Configuration Service
 * Loads tier settings, model configs, and feature flags from database
 * with in-memory caching for performance
 * 
 * Copyright © 2025 KilatCode Studio
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

export interface TierSettings {
    dailyPollen: number;
    maxImagesPerRequest: number;
    maxImageSize: number;
    contextWindow: number;
    rateLimit: number;
    maxSessionMessages: number;
}

export interface ModelConfig {
    model_id: string;
    display_name: string;
    model_type: 'text' | 'image';
    provider: string;
    cost_input_per_million?: number;
    cost_output_per_million?: number;
    cost_per_image?: number;
    min_tier: string;
    is_primary_for_tier?: string;
    is_fallback_for_tier?: string;
    is_active: boolean;
    priority: number;
}

export interface FeatureFlag {
    flag_key: string;
    display_name: string;
    is_enabled: boolean;
    min_tier: string;
    config: Record<string, any>;
}

// ============================================================================
// Cache Configuration
// ============================================================================

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache: Map<string, CacheEntry<any>> = new Map();

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================================
// Hardcoded Fallbacks (used if DB fails)
// ============================================================================

const FALLBACK_TIER_SETTINGS: Record<string, TierSettings> = {
    free: {
        dailyPollen: 1,
        maxImagesPerRequest: 1,
        maxImageSize: 1024,
        contextWindow: 12000,
        rateLimit: 10,
        maxSessionMessages: 10,
    },
    paid: {
        dailyPollen: 5,
        maxImagesPerRequest: 3,
        maxImageSize: 1920,
        contextWindow: 50000,
        rateLimit: 30,
        maxSessionMessages: 25,
    },
    enterprise: {
        dailyPollen: 10,
        maxImagesPerRequest: 10,
        maxImageSize: 2048,
        contextWindow: 200000,
        rateLimit: 60,
        maxSessionMessages: 50,
    },
};

// ============================================================================
// Dynamic Config Functions
// ============================================================================

/**
 * Get tier settings from database (with caching)
 * Falls back to hardcoded values if DB fails
 */
export async function getTierSettings(tier: string): Promise<TierSettings> {
    const cacheKey = 'tier_settings';
    let allSettings = getCached<Record<string, TierSettings>>(cacheKey);

    if (!allSettings) {
        try {
            const { data, error } = await supabase
                .from('app_configs')
                .select('config_value')
                .eq('config_key', 'tier_settings')
                .single();

            if (error || !data) {
                console.warn('[DynamicConfig] DB error, using fallback:', error?.message);
                allSettings = FALLBACK_TIER_SETTINGS;
            } else {
                allSettings = data.config_value as Record<string, TierSettings>;
                setCache(cacheKey, allSettings);
            }
        } catch (error) {
            console.warn('[DynamicConfig] Exception, using fallback:', error);
            allSettings = FALLBACK_TIER_SETTINGS;
        }
    }

    const validTier = ['free', 'pro', 'enterprise'].includes(tier) ? tier : 'free';
    return allSettings[validTier] || FALLBACK_TIER_SETTINGS.free;
}

/**
 * Get all active models from database
 */
export async function getModels(type?: 'text' | 'image'): Promise<ModelConfig[]> {
    const cacheKey = `models_${type || 'all'}`;
    const cached = getCached<ModelConfig[]>(cacheKey);
    if (cached) return cached;

    try {
        let query = supabase
            .from('model_configs')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: true });

        if (type) {
            query = query.eq('model_type', type);
        }

        const { data, error } = await query;

        if (error || !data) {
            console.warn('[DynamicConfig] Failed to load models:', error?.message);
            return [];
        }

        setCache(cacheKey, data);
        return data;
    } catch (error) {
        console.warn('[DynamicConfig] Exception loading models:', error);
        return [];
    }
}

/**
 * Get primary model for a tier
 */
export async function getPrimaryModel(tier: string, type: 'text' | 'image'): Promise<string | null> {
    const models = await getModels(type);
    const primary = models.find(m => m.is_primary_for_tier === tier);
    return primary?.model_id || models[0]?.model_id || null;
}

/**
 * Get fallback model for a tier
 */
export async function getFallbackModel(tier: string, type: 'text' | 'image'): Promise<string | null> {
    const models = await getModels(type);
    const fallback = models.find(m => m.is_fallback_for_tier === tier);
    return fallback?.model_id || null;
}

/**
 * Check if a feature is enabled for a tier
 */
export async function isFeatureEnabled(flagKey: string, userTier: string): Promise<boolean> {
    const cacheKey = `feature_${flagKey}`;
    let flag = getCached<FeatureFlag>(cacheKey);

    if (!flag) {
        try {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('*')
                .eq('flag_key', flagKey)
                .single();

            if (error || !data) {
                return true; // Default to enabled if not found
            }

            flag = data;
            setCache(cacheKey, flag);
        } catch (error) {
            return true;
        }
    }

    // Safety check (should not happen but TypeScript needs this)
    if (!flag) return true;

    if (!flag.is_enabled) return false;

    // Check tier access
    const tierLevel: Record<string, number> = { free: 0, paid: 1, enterprise: 2 };
    return tierLevel[userTier] >= tierLevel[flag.min_tier];
}

/**
 * Clear all cached configs (call after admin updates)
 */
export function clearConfigCache(): void {
    cache.clear();
    console.log('[DynamicConfig] Cache cleared');
}

/**
 * Get all tier settings (for admin dashboard)
 */
export async function getAllTierSettings(): Promise<Record<string, TierSettings>> {
    const settings = await getTierSettings('free'); // Triggers cache
    return getCached<Record<string, TierSettings>>('tier_settings') || FALLBACK_TIER_SETTINGS;
}

/**
 * Update tier settings (admin only)
 */
export async function updateTierSettings(settings: Record<string, TierSettings>): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('app_configs')
            .upsert({
                config_key: 'tier_settings',
                config_value: settings,
                description: 'Global tier configuration settings'
            }, { onConflict: 'config_key' });

        if (error) {
            console.error('[DynamicConfig] Failed to update tier settings:', error);
            return false;
        }

        clearConfigCache();
        return true;
    } catch (error) {
        console.error('[DynamicConfig] Exception updating tier settings:', error);
        return false;
    }
}
