/**
 * Adaptive AI Prompt Service
 * Injects user preferences and global patterns into AI prompts
 * for personalized, improved responses.
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';

// Using 'any' type because custom tables are not in generated types
const supabase: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =============================================================================
// Types
// =============================================================================

export interface UserPreferences {
    favoriteAgents: string[];
    preferredModels: string[];
    avgRating: number;
    totalInteractions: number;
    successfulPatterns: string[];
    avoidPatterns: string[];
}

export interface GlobalPattern {
    taskType: string;
    patternData: Record<string, any>;
    successRate: number;
    usageCount: number;
}

export interface AdaptiveContext {
    userPreferences: UserPreferences | null;
    globalPatterns: GlobalPattern[];
    promptInjection: string;
}

// =============================================================================
// User Preference Functions
// =============================================================================

/**
 * Get user's preferences based on their feedback history
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
    if (!userId) return null;

    try {
        // Get user's feedback data
        const { data: feedbackData, error } = await supabase
            .from('agent_feedback')
            .select('agent_type, model_used, rating, was_successful')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100); // Last 100 interactions

        if (error || !feedbackData || feedbackData.length === 0) {
            return null;
        }

        // Calculate favorite agents (top 3 by usage)
        const agentCounts: Record<string, number> = {};
        for (const f of feedbackData) {
            agentCounts[f.agent_type] = (agentCounts[f.agent_type] || 0) + 1;
        }
        const favoriteAgents = Object.entries(agentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([agent]) => agent);

        // Calculate preferred models (top 3 by rating)
        const modelRatings: Record<string, { total: number; count: number }> = {};
        for (const f of feedbackData) {
            if (!modelRatings[f.model_used]) {
                modelRatings[f.model_used] = { total: 0, count: 0 };
            }
            modelRatings[f.model_used].total += f.rating || 3;
            modelRatings[f.model_used].count += 1;
        }
        const preferredModels = Object.entries(modelRatings)
            .map(([model, data]) => ({ model, avgRating: data.total / data.count }))
            .sort((a, b) => b.avgRating - a.avgRating)
            .slice(0, 3)
            .map(m => m.model);

        // Calculate average rating
        const avgRating = feedbackData.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbackData.length;

        // Get patterns from good ratings (rating >= 4)
        const successfulPatterns = feedbackData
            .filter((f: any) => f.rating >= 4)
            .map((f: any) => f.agent_type)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i); // unique

        // Get patterns from bad ratings (rating <= 2)
        const avoidPatterns = feedbackData
            .filter((f: any) => f.rating <= 2)
            .map((f: any) => f.agent_type)
            .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

        return {
            favoriteAgents,
            preferredModels,
            avgRating: Math.round(avgRating * 100) / 100,
            totalInteractions: feedbackData.length,
            successfulPatterns,
            avoidPatterns
        };

    } catch (error) {
        console.error('Error getting user preferences:', error);
        return null;
    }
}

// =============================================================================
// Global Pattern Functions
// =============================================================================

/**
 * Get globally learned patterns for an agent type
 */
export async function getGlobalPatterns(agentType: string): Promise<GlobalPattern[]> {
    try {
        const { data, error } = await supabase
            .from('learned_patterns')
            .select('*')
            .eq('agent_type', agentType)
            .gte('success_rate', 0.7) // Only patterns with >70% success
            .order('success_rate', { ascending: false })
            .limit(5);

        if (error || !data) {
            return [];
        }

        return data.map((p: any) => ({
            taskType: p.task_type,
            patternData: p.pattern_data || {},
            successRate: p.success_rate,
            usageCount: p.usage_count
        }));

    } catch (error) {
        console.error('Error getting global patterns:', error);
        return [];
    }
}

// =============================================================================
// Prompt Injection Builder
// =============================================================================

/**
 * Build the adaptive prompt injection string
 */
export function buildPromptInjection(
    userPreferences: UserPreferences | null,
    globalPatterns: GlobalPattern[]
): string {
    const sections: string[] = [];

    // User-specific adaptations
    if (userPreferences && userPreferences.totalInteractions >= 5) {
        sections.push('## User Preferences (Learned from History)');

        if (userPreferences.avgRating < 3.5) {
            sections.push('- User has given low ratings previously. Focus on CLARITY and COMPLETENESS.');
            sections.push('- Provide more detailed explanations and step-by-step guidance.');
        }

        if (userPreferences.favoriteAgents.length > 0) {
            sections.push(`- User frequently uses: ${userPreferences.favoriteAgents.join(', ')}`);
        }

        if (userPreferences.successfulPatterns.length > 0) {
            sections.push(`- User prefers responses from: ${userPreferences.successfulPatterns.join(', ')}`);
        }

        if (userPreferences.avoidPatterns.length > 0) {
            sections.push(`- User has rated poorly: ${userPreferences.avoidPatterns.join(', ')} - consider different approaches`);
        }
    }

    // Global patterns
    if (globalPatterns.length > 0) {
        sections.push('');
        sections.push('## Proven Successful Patterns');

        for (const pattern of globalPatterns.slice(0, 3)) {
            sections.push(`- ${pattern.taskType}: ${pattern.successRate * 100}% success rate (${pattern.usageCount} uses)`);
            if (pattern.patternData.approach) {
                sections.push(`  Approach: ${pattern.patternData.approach}`);
            }
        }
    }

    if (sections.length === 0) {
        return ''; // No adaptive context available
    }

    return '\n\n---\n# ADAPTIVE CONTEXT\n' + sections.join('\n') + '\n---\n';
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Get complete adaptive context for a request
 */
export async function getAdaptiveContext(
    userId: string | undefined,
    agentType: string
): Promise<AdaptiveContext> {
    // Fetch both in parallel
    const [userPreferences, globalPatterns] = await Promise.all([
        userId ? getUserPreferences(userId) : Promise.resolve(null),
        getGlobalPatterns(agentType)
    ]);

    const promptInjection = buildPromptInjection(userPreferences, globalPatterns);

    console.log(`📊 Adaptive Context: user=${userId?.slice(0, 8)}... patterns=${globalPatterns.length} injection=${promptInjection.length}chars`);

    return {
        userPreferences,
        globalPatterns,
        promptInjection
    };
}

/**
 * Enhance a system prompt with adaptive context
 */
export async function enhancePromptWithContext(
    systemPrompt: string,
    userId: string | undefined,
    agentType: string
): Promise<string> {
    const context = await getAdaptiveContext(userId, agentType);

    if (!context.promptInjection) {
        return systemPrompt; // No changes
    }

    // Inject adaptive context before the main prompt
    return context.promptInjection + systemPrompt;
}
