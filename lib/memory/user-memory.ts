/**
 * User Long-Term Memory
 * 
 * Remembers user preferences, coding style, and past interactions
 * across sessions for personalized AI responses.
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@/lib/auth/server';
import { fireAndForget } from '@/lib/utils/non-blocking-db';

// ============================================================================
// Types
// ============================================================================

export interface UserProfile {
    user_id: string;
    preferred_frameworks: string[];
    coding_style: string;
    language_preference: string;
    learned_preferences: Record<string, any>;
    interaction_count: number;
    last_interaction: string;
}

export interface LearnedPreference {
    type: 'framework' | 'style' | 'language' | 'feature';
    value: string;
    confidence: number;
    last_seen: string;
}

// ============================================================================
// Profile Management
// ============================================================================

/**
 * Get or create user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId || userId === 'anon') return null;

    const supabase = await createClient();

    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to get user profile:', error);
        return null;
    }

    if (!data) {
        // Create new profile
        const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
                user_id: userId,
                preferred_frameworks: [],
                coding_style: 'modern',
                language_preference: 'id',
                learned_preferences: {},
                interaction_count: 0
            })
            .select()
            .single();

        if (createError) {
            console.error('Failed to create profile:', createError);
            return null;
        }

        return newProfile;
    }

    return data;
}

/**
 * Update user profile with new preferences
 */
export async function updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'preferred_frameworks' | 'coding_style' | 'language_preference' | 'learned_preferences'>>
): Promise<boolean> {
    if (!userId || userId === 'anon') return false;

    const supabase = await createClient();

    const { error } = await supabase
        .from('user_profiles')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    return !error;
}

// ============================================================================
// Preference Learning
// ============================================================================

/**
 * Learn preferences from user interaction
 */
export async function learnFromInteraction(
    userId: string,
    message: string,
    agentType: string
): Promise<void> {
    if (!userId || userId === 'anon') return;

    const profile = await getUserProfile(userId);
    if (!profile) return;

    const learned = profile.learned_preferences || {};
    const messageLower = message.toLowerCase();

    // Detect framework preferences
    const frameworks = ['react', 'vue', 'next', 'nuxt', 'svelte', 'angular', 'express', 'nest'];
    for (const fw of frameworks) {
        if (messageLower.includes(fw)) {
            learned[`framework_${fw}`] = {
                type: 'framework',
                value: fw,
                confidence: Math.min((learned[`framework_${fw}`]?.confidence || 0) + 0.1, 1),
                last_seen: new Date().toISOString()
            };
        }
    }

    // Detect coding style preferences
    if (messageLower.includes('typescript') || messageLower.includes('.ts')) {
        learned['style_typescript'] = {
            type: 'style',
            value: 'typescript',
            confidence: Math.min((learned['style_typescript']?.confidence || 0) + 0.15, 1),
            last_seen: new Date().toISOString()
        };
    }

    // Detect language preference from message patterns
    const indonesianPatterns = ['tolong', 'buatkan', 'saya', 'mohon', 'bisa', 'dengan'];
    const isIndonesian = indonesianPatterns.some(p => messageLower.includes(p));

    if (isIndonesian) {
        learned['lang_indonesian'] = {
            type: 'language',
            value: 'id',
            confidence: Math.min((learned['lang_indonesian']?.confidence || 0) + 0.2, 1),
            last_seen: new Date().toISOString()
        };
    }

    // Update profile
    fireAndForget(() => updateUserProfile(userId, {
        learned_preferences: learned,
    }));

    // Increment interaction count
    const supabase = await createClient();
    fireAndForget(async () => {
        await supabase.rpc('increment_interaction', { p_user_id: userId });
    });
}

// ============================================================================
// Context Generation
// ============================================================================

/**
 * Get top preferences for prompt injection
 */
export function getTopPreferences(profile: UserProfile | null): string[] {
    if (!profile) return [];

    const prefs: string[] = [];
    const learned = profile.learned_preferences || {};

    // Get high-confidence preferences
    const sorted = Object.entries(learned)
        .filter(([_, v]) => (v as LearnedPreference).confidence > 0.5)
        .sort((a, b) => (b[1] as LearnedPreference).confidence - (a[1] as LearnedPreference).confidence)
        .slice(0, 5);

    for (const [_, pref] of sorted) {
        const p = pref as LearnedPreference;
        if (p.type === 'framework') {
            prefs.push(`Prefers ${p.value} framework`);
        } else if (p.type === 'style') {
            prefs.push(`Uses ${p.value} coding style`);
        } else if (p.type === 'language' && p.value === 'id') {
            prefs.push(`Responds in Indonesian`);
        }
    }

    // Add explicit preferences
    if (profile.preferred_frameworks.length > 0) {
        prefs.push(`Favorite frameworks: ${profile.preferred_frameworks.join(', ')}`);
    }

    return prefs;
}

/**
 * Format user memory for prompt injection
 */
export function formatUserMemory(profile: UserProfile | null): string {
    if (!profile) return '';

    const prefs = getTopPreferences(profile);
    if (prefs.length === 0) return '';

    return `
[USER MEMORY]
User ID: ${profile.user_id}
Interaction Count: ${profile.interaction_count}
Learned Preferences:
${prefs.map((p, i) => `${i + 1}. ${p}`).join('\n')}
[/USER MEMORY]
`;
}

export default {
    getUserProfile,
    updateUserProfile,
    learnFromInteraction,
    getTopPreferences,
    formatUserMemory
};
