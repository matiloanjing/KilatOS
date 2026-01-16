/**
 * User Context Manager
 * Manages user preferences and context-aware behavior
 * Copyright © 2025 KilatCode Studio
 */

import { createClient } from '@supabase/supabase-js';

// Using 'any' type because user_context table is not in generated Database types
const supabase: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UserPreferences {
    // General preferences
    preferredModels?: Record<string, string>; // agentType -> model
    defaultQuality?: 'draft' | 'standard' | 'high' | 'ultra';
    budgetLimit?: number; // Max pollen per request

    // Code generation preferences
    codingStyle?: 'concise' | 'verbose' | 'commented';
    preferredLanguage?: 'typescript' | 'python' | 'go' | 'rust';
    testCoverage?: number; // 0-100%

    // Image generation preferences
    imageStyle?: 'realistic' | 'artistic' | 'anime' | 'minimalist' | 'abstract';
    defaultImageSize?: { width: number; height: number };

    // General behavior
    enableAutoOptimization?: boolean;
    feedbackFrequency?: 'always' | 'sometimes' | 'never';
}

export interface UserStatistics {
    totalSessions: number;
    totalCost: number;
    avgRating: number;
    favoriteAgent?: string;
    mostUsedModel?: string;
    lastActive?: Date;
}

export interface UserContext {
    userId: string;
    preferences: UserPreferences;
    statistics: UserStatistics;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Get user context (preferences + statistics)
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
    try {
        const { data, error } = await supabase
            .from('user_context')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            userId: data.user_id,
            preferences: data.preferences || {},
            statistics: data.statistics || {},
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at)
        };
    } catch (error) {
        console.error('Get user context error:', error);
        return null;
    }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
): Promise<void> {
    try {
        // Get existing context
        const existing = await getUserContext(userId);

        if (existing) {
            // Merge with existing preferences
            const merged = {
                ...existing.preferences,
                ...preferences
            };

            const { error } = await supabase
                .from('user_context')
                .update({
                    preferences: merged,
                    updated_at: new Date()
                })
                .eq('user_id', userId);

            if (error) throw error;
        } else {
            // Create new context
            const { error } = await supabase
                .from('user_context')
                .insert({
                    user_id: userId,
                    preferences,
                    statistics: {},
                    created_at: new Date(),
                    updated_at: new Date()
                });

            if (error) throw error;
        }

        console.log(`✅ User preferences updated: ${userId}`);
    } catch (error) {
        console.error('Update user preferences error:', error);
        throw error;
    }
}

/**
 * Update user statistics
 */
export async function updateUserStatistics(
    userId: string,
    stats: Partial<UserStatistics>
): Promise<void> {
    try {
        const existing = await getUserContext(userId);

        if (existing) {
            const merged = {
                ...existing.statistics,
                ...stats,
                lastActive: new Date()
            };

            const { error } = await supabase
                .from('user_context')
                .update({
                    statistics: merged,
                    updated_at: new Date()
                })
                .eq('user_id', userId);

            if (error) throw error;
        } else {
            // Create new context with stats
            const { error } = await supabase
                .from('user_context')
                .insert({
                    user_id: userId,
                    context_key: userId, // Required NOT NULL field
                    preferences: {},
                    statistics: { ...stats, lastActive: new Date() },
                    created_at: new Date(),
                    updated_at: new Date()
                });

            if (error) throw error;
        }
    } catch (error) {
        console.error('Update user statistics error:', error);
    }
}

/**
 * Get context-aware model recommendation
 */
export async function getContextAwareModelRecommendation(
    userId: string,
    agentType: string
): Promise<string | null> {
    const context = await getUserContext(userId);

    if (!context) {
        return null;
    }

    // Check if user has a preferred model for this agent
    if (context.preferences.preferredModels?.[agentType]) {
        return context.preferences.preferredModels[agentType];
    }

    // Use most used model if available
    if (context.statistics.mostUsedModel) {
        return context.statistics.mostUsedModel;
    }

    return null;
}

/**
 * Apply user preferences to request
 */
export function applyUserPreferences<T extends Record<string, any>>(
    request: T,
    context: UserContext
): T {
    const enhanced: any = { ...request };

    // Apply quality preference
    if (!enhanced.quality && context.preferences.defaultQuality) {
        enhanced.quality = context.preferences.defaultQuality;
    }

    // Apply language preference (for code gen)
    if (!enhanced.language && context.preferences.preferredLanguage) {
        enhanced.language = context.preferences.preferredLanguage;
    }

    // Apply style preference (for image gen)
    if (!enhanced.style && context.preferences.imageStyle) {
        enhanced.style = context.preferences.imageStyle;
    }

    // Apply coding style preference
    if (!enhanced.codingStyle && context.preferences.codingStyle) {
        enhanced.codingStyle = context.preferences.codingStyle;
    }

    return enhanced as T;
}

/**
 * Check if request exceeds user budget
 */
export function checkBudgetLimit(
    estimatedCost: number,
    context: UserContext
): { allowed: boolean; message?: string } {
    if (!context.preferences.budgetLimit) {
        return { allowed: true };
    }

    if (estimatedCost > context.preferences.budgetLimit) {
        return {
            allowed: false,
            message: `Estimated cost (${estimatedCost.toFixed(4)} pollen) exceeds your budget limit (${context.preferences.budgetLimit.toFixed(4)} pollen)`
        };
    }

    return { allowed: true };
}

/**
 * Increment session count for user
 */
export async function recordUserSession(
    userId: string,
    agentType: string,
    cost: number,
    rating?: number
): Promise<void> {
    const context = await getUserContext(userId);

    if (!context) {
        // Create initial context
        await updateUserStatistics(userId, {
            totalSessions: 1,
            totalCost: cost,
            avgRating: rating || 0,
            favoriteAgent: agentType
        });
        return;
    }

    // Update statistics
    const newStats: UserStatistics = {
        totalSessions: context.statistics.totalSessions + 1,
        totalCost: context.statistics.totalCost + cost,
        avgRating: rating
            ? ((context.statistics.avgRating * context.statistics.totalSessions) + rating) / (context.statistics.totalSessions + 1)
            : context.statistics.avgRating,
        favoriteAgent: context.statistics.favoriteAgent,
        mostUsedModel: context.statistics.mostUsedModel,
        lastActive: new Date()
    };

    await updateUserStatistics(userId, newStats);
}
