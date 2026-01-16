/**
 * User Settings DB Service
 * Manages user preferences for agent orchestration.
 * Copyright © 2026 KilatCode Studio
 */

import { createClient } from '@/lib/auth/server';
import { AgentMode, AgentType } from '@/lib/agents/router';

export interface UserAgentSettings {
    mode: AgentMode;
    auto_agents: AgentType[];
    confirm_threshold: number;
}

const DEFAULT_SETTINGS: UserAgentSettings = {
    mode: 'recommended',
    auto_agents: ['research', 'crawl'],
    confirm_threshold: 0.8,
};

/**
 * Get user settings or return defaults
 */
export async function getUserAgentSettings(userId: string): Promise<UserAgentSettings> {
    const supabase = createClient();

    // Use cached fetch if available or direct DB call
    // Note: In server component context, supabase client handles auth

    const { data, error } = await supabase
        .from('user_agent_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        // Return defaults if no settings exist yet
        return DEFAULT_SETTINGS;
    }

    return {
        mode: data.mode as AgentMode,
        auto_agents: data.auto_agents as AgentType[],
        confirm_threshold: data.confirm_threshold,
    };
}

/**
 * Update or create user settings
 */
export async function updateUserAgentSettings(
    userId: string,
    settings: Partial<UserAgentSettings>
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from('user_agent_settings')
        .upsert({
            user_id: userId,
            ...settings,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('Failed to update agent settings:', error);
        throw error;
    }
}
