/**
 * Feedback Collection System
 * Collects and stores user feedback for adaptive learning
 * Copyright © 2025 KilatCode Studio
 */

import { createClient } from '@supabase/supabase-js';

// Using 'any' type because agent_feedback table is not in generated Database types
const supabase: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface FeedbackData {
    sessionId: string;
    userId?: string;
    agentType: 'solve' | 'question' | 'research' | 'guide' | 'ideagen' | 'cowriter' | 'codegen' | 'imagegen' | 'audit';
    userRating?: 1 | 2 | 3 | 4 | 5; // Optional 1-5 stars
    feedbackText?: string;
    wasSuccessful: boolean;
    iterationCount?: number;
    modelUsed: string;
    executionTime?: number; // milliseconds
    costPollen?: number;
    metadata?: Record<string, any>;
}

export interface FeedbackStats {
    agentType: string;
    model: string;
    avgRating: number;
    successRate: number;
    totalFeedback: number;
    avgCost: number;
    avgExecutionTime: number;
}

/**
 * Submit user feedback
 */
export async function submitFeedback(feedback: FeedbackData): Promise<void> {
    try {
        const { error } = await supabase
            .from('agent_feedback')
            .insert({
                session_id: feedback.sessionId,
                user_id: feedback.userId,
                agent_type: feedback.agentType,
                user_rating: feedback.userRating,
                feedback_text: feedback.feedbackText,
                was_successful: feedback.wasSuccessful,
                iteration_count: feedback.iterationCount,
                model_used: feedback.modelUsed,
                execution_time: feedback.executionTime,
                cost_pollen: feedback.costPollen,
                created_at: new Date()
            });

        if (error) {
            throw new Error(`Failed to submit feedback: ${error.message}`);
        }

        console.log(`✅ Feedback submitted: ${feedback.agentType} - Rating: ${feedback.userRating}/5`);
    } catch (error) {
        console.error('Feedback submission error:', error);
        throw error;
    }
}

/**
 * Get feedback statistics for an agent/model combination
 */
export async function getFeedbackStats(
    agentType: string,
    model?: string,
    timeRange?: { start: Date; end: Date }
): Promise<FeedbackStats> {
    try {
        let query = supabase
            .from('agent_feedback')
            .select('*')
            .eq('agent_type', agentType);

        if (model) {
            query = query.eq('model_used', model);
        }

        if (timeRange) {
            query = query
                .gte('created_at', timeRange.start.toISOString())
                .lte('created_at', timeRange.end.toISOString());
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch feedback: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return {
                agentType,
                model: model || 'all',
                avgRating: 0,
                successRate: 0,
                totalFeedback: 0,
                avgCost: 0,
                avgExecutionTime: 0
            };
        }

        // Calculate statistics
        const totalFeedback = data.length;
        const avgRating = data.reduce((sum: number, f: any) => sum + (f.user_rating || 0), 0) / totalFeedback;
        const successCount = data.filter((f: any) => f.was_successful).length;
        const successRate = (successCount / totalFeedback) * 100;
        const avgCost = data.reduce((sum: number, f: any) => sum + (f.cost_pollen || 0), 0) / totalFeedback;
        const avgExecutionTime = data.reduce((sum: number, f: any) => sum + (f.execution_time || 0), 0) / totalFeedback;

        return {
            agentType,
            model: model || 'all',
            avgRating: Math.round(avgRating * 100) / 100,
            successRate: Math.round(successRate * 100) / 100,
            totalFeedback,
            avgCost: Math.round(avgCost * 10000) / 10000,
            avgExecutionTime: Math.round(avgExecutionTime)
        };
    } catch (error) {
        console.error('Get feedback stats error:', error);
        throw error;
    }
}

/**
 * Get top performing models for an agent
 */
export async function getTopModels(
    agentType: string,
    limit: number = 5
): Promise<Array<{ model: string; stats: FeedbackStats }>> {
    try {
        const { data, error } = await supabase
            .from('agent_feedback')
            .select('model_used')
            .eq('agent_type', agentType);

        if (error || !data) {
            return [];
        }

        // Get unique models
        const models = Array.from(new Set(data.map((d: any) => String(d.model_used)))) as string[];

        // Get stats for each model
        const modelStats = await Promise.all(
            models.map(async (model: string) => ({
                model,
                stats: await getFeedbackStats(agentType, model)
            }))
        );

        // Sort by success rate * avg rating (composite score)
        return modelStats
            .sort((a, b) => {
                const scoreA = (a.stats.successRate / 100) * a.stats.avgRating;
                const scoreB = (b.stats.successRate / 100) * b.stats.avgRating;
                return scoreB - scoreA;
            })
            .slice(0, limit);
    } catch (error) {
        console.error('Get top models error:', error);
        return [];
    }
}

/**
 * Get user-specific feedback trends
 */
export async function getUserFeedbackTrends(
    userId: string,
    agentType?: string
): Promise<{
    totalSessions: number;
    avgRating: number;
    favoriteAgent?: string;
    mostUsedModel?: string;
}> {
    try {
        let query = supabase
            .from('agent_feedback')
            .select('*')
            .eq('user_id', userId);

        if (agentType) {
            query = query.eq('agent_type', agentType);
        }

        const { data, error } = await query;

        if (error || !data || data.length === 0) {
            return {
                totalSessions: 0,
                avgRating: 0
            };
        }

        const totalSessions = data.length;
        const avgRating = data.reduce((sum: number, f: any) => sum + (f.user_rating || 0), 0) / totalSessions;

        // Find favorite agent (most used)
        const agentCounts = data.reduce((acc: Record<string, number>, f: any) => {
            acc[f.agent_type] = (acc[f.agent_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const favoriteAgent = (Object.entries(agentCounts) as [string, number][])
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        // Find most used model
        const modelCounts = data.reduce((acc: Record<string, number>, f: any) => {
            acc[f.model_used] = (acc[f.model_used] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostUsedModel = (Object.entries(modelCounts) as [string, number][])
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        return {
            totalSessions,
            avgRating: Math.round(avgRating * 100) / 100,
            favoriteAgent,
            mostUsedModel
        };
    } catch (error) {
        console.error('Get user trends error:', error);
        return {
            totalSessions: 0,
            avgRating: 0
        };
    }
}

/**
 * Record learned pattern for future optimization
 */
export async function recordLearnedPattern(
    agentType: string,
    taskType: string,
    patternData: Record<string, any>,
    successRate: number,
    avgCost: number
): Promise<void> {
    try {
        // Check if pattern already exists
        const { data: existing } = await supabase
            .from('learned_patterns')
            .select('*')
            .eq('agent_type', agentType)
            .eq('task_type', taskType)
            .single();

        if (existing) {
            // Update existing pattern
            const { error } = await supabase
                .from('learned_patterns')
                .update({
                    pattern_data: patternData,
                    success_rate: successRate,
                    avg_cost: avgCost,
                    usage_count: existing.usage_count + 1,
                    updated_at: new Date()
                })
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            // Insert new pattern
            const { error } = await supabase
                .from('learned_patterns')
                .insert({
                    agent_type: agentType,
                    task_type: taskType,
                    pattern_data: patternData,
                    success_rate: successRate,
                    usage_count: 1,
                    avg_cost: avgCost,
                    created_at: new Date(),
                    updated_at: new Date()
                });

            if (error) throw error;
        }

        console.log(`📊 Learned pattern recorded: ${agentType}/${taskType}`);
    } catch (error) {
        console.error('Record learned pattern error:', error);
    }
}
