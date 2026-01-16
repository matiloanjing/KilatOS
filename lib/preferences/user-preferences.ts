/**
 * User Preferences Manager
 * Stores and retrieves user preferences and context
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

export interface UserPreferences {
    theme: 'light' | 'dark' | 'system';
    language: string;
    codeStyle: 'compact' | 'expanded';
    defaultModel?: string;
    notifications: boolean;
    autoSave: boolean;
    customSettings?: Record<string, any>;
}

export interface UserContext {
    id: string;
    user_id: string;
    preferences: UserPreferences;
    last_session_id?: string;
    favorite_agents?: string[];
    recent_prompts?: string[];
    custom_data?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'dark',
    language: 'id',
    codeStyle: 'expanded',
    notifications: true,
    autoSave: true
};

// ============================================================================
// User Preferences Functions
// ============================================================================

/**
 * Get user preferences
 */
export async function getPreferences(
    userId: string
): Promise<UserPreferences> {
    try {
        const { data, error } = await supabase
            .from('user_context')
            .select('preferences')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return DEFAULT_PREFERENCES;
        }

        return { ...DEFAULT_PREFERENCES, ...data.preferences };
    } catch (error) {
        console.error('[UserPreferences] Failed to get preferences:', error);
        return DEFAULT_PREFERENCES;
    }
}

/**
 * Set a preference value
 */
export async function setPreference<K extends keyof UserPreferences>(
    userId: string,
    key: K,
    value: UserPreferences[K]
): Promise<boolean> {
    try {
        // Get existing preferences
        const current = await getPreferences(userId);
        const updated = { ...current, [key]: value };

        // Upsert
        const { error } = await supabase
            .from('user_context')
            .upsert({
                user_id: userId,
                preferences: updated,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        console.log(`⚙️ [UserPreferences] Set ${key} = ${value} for user`);
        return true;
    } catch (error) {
        console.error('[UserPreferences] Failed to set preference:', error);
        return false;
    }
}

/**
 * Update multiple preferences at once
 */
export async function updatePreferences(
    userId: string,
    updates: Partial<UserPreferences>
): Promise<boolean> {
    try {
        const current = await getPreferences(userId);
        const updated = { ...current, ...updates };

        const { error } = await supabase
            .from('user_context')
            .upsert({
                user_id: userId,
                preferences: updated,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('[UserPreferences] Failed to update preferences:', error);
        return false;
    }
}

/**
 * Get full user context
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
    try {
        const { data, error } = await supabase
            .from('user_context')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) return null;
        return data;
    } catch (error) {
        return null;
    }
}

/**
 * Add to recent prompts
 */
export async function addRecentPrompt(
    userId: string,
    prompt: string,
    maxPrompts: number = 10
): Promise<boolean> {
    try {
        const context = await getUserContext(userId);
        const existing = context?.recent_prompts || [];

        // Add to front, remove duplicates, limit size
        const updated = [prompt, ...existing.filter(p => p !== prompt)]
            .slice(0, maxPrompts);

        const { error } = await supabase
            .from('user_context')
            .upsert({
                user_id: userId,
                recent_prompts: updated,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        return !error;
    } catch (error) {
        return false;
    }
}

/**
 * Set favorite agents
 */
export async function setFavoriteAgents(
    userId: string,
    agents: string[]
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('user_context')
            .upsert({
                user_id: userId,
                favorite_agents: agents,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        return !error;
    } catch (error) {
        return false;
    }
}

console.log('✅ User Preferences Manager initialized');
