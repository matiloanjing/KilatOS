/**
 * Adaptive Model Selector
 * Learns from feedback to optimize model selection
 * Copyright © 2025 KilatCode Studio
 */

import { getFeedbackStats, getTopModels } from './feedback-collector';
import type { AgentType } from '@/lib/config/models';

export interface ModelSelectionCriteria {
    agentType: AgentType;
    taskType?: string;
    priority: 'speed' | 'quality' | 'cost' | 'balanced';
    userId?: string;
}

export interface ModelRecommendation {
    model: string;
    confidence: number; // 0-1
    reasoning: string;
    estimatedCost: number;
    expectedQuality: number; // 0-5
}

/**
 * Select best model based on historical performance
 */
export async function selectAdaptiveModel(
    criteria: ModelSelectionCriteria
): Promise<ModelRecommendation> {
    const { agentType, priority, taskType } = criteria;

    // Get top performing models for this agent
    const topModels = await getTopModels(agentType, 5);

    if (topModels.length === 0) {
        // No historical data, use default
        return getDefaultModelRecommendation(agentType, priority);
    }

    // Score models based on priority
    const scoredModels = topModels.map(({ model, stats }) => {
        let score = 0;
        let reasoning = '';

        switch (priority) {
            case 'speed':
                // Prioritize low execution time
                score = stats.avgExecutionTime > 0
                    ? 1000 / stats.avgExecutionTime
                    : 0;
                reasoning = `Selected for speed (avg: ${stats.avgExecutionTime}ms)`;
                break;

            case 'quality':
                // Prioritize high rating and success rate
                score = stats.avgRating * (stats.successRate / 100);
                reasoning = `Selected for quality (rating: ${stats.avgRating}/5, success: ${stats.successRate}%)`;
                break;

            case 'cost':
                // Prioritize low cost but maintain quality
                score = stats.avgCost > 0
                    ? stats.avgRating / stats.avgCost
                    : stats.avgRating;
                reasoning = `Selected for cost efficiency (${stats.avgCost.toFixed(4)} pollen, rating: ${stats.avgRating}/5)`;
                break;

            case 'balanced':
            default:
                // Balance all factors
                const qualityScore = stats.avgRating * (stats.successRate / 100);
                const costScore = stats.avgCost > 0 ? 1 / stats.avgCost : 1;
                const speedScore = stats.avgExecutionTime > 0 ? 1000 / stats.avgExecutionTime : 1;
                score = (qualityScore * 0.5) + (costScore * 0.3) + (speedScore * 0.2);
                reasoning = `Balanced selection (quality: ${stats.avgRating}/5, cost: ${stats.avgCost.toFixed(4)}, speed: ${stats.avgExecutionTime}ms)`;
                break;
        }

        return {
            model,
            score,
            stats,
            reasoning
        };
    });

    // Sort by score
    scoredModels.sort((a, b) => b.score - a.score);

    const best = scoredModels[0];
    const confidence = calculateConfidence(best.stats.totalFeedback);

    return {
        model: best.model,
        confidence,
        reasoning: `${best.reasoning}. Based on ${best.stats.totalFeedback} feedback entries.`,
        estimatedCost: best.stats.avgCost,
        expectedQuality: best.stats.avgRating
    };
}

/**
 * Calculate confidence score based on sample size
 */
function calculateConfidence(feedbackCount: number): number {
    // Confidence increases with more feedback
    // Uses sigmoid-like function
    if (feedbackCount === 0) return 0;
    if (feedbackCount >= 100) return 0.95;

    // 0-100 feedback maps to 0.3-0.95 confidence
    return 0.3 + (feedbackCount / 100) * 0.65;
}

/**
 * Get default model recommendation (no historical data)
 */
function getDefaultModelRecommendation(
    agentType: AgentType,
    priority: string
): ModelRecommendation {
    const defaults: Record<AgentType, { model: string; cost: number; quality: number }> = {
        solve: { model: 'gemini-fast', cost: 0.1, quality: 4.0 }, // Free tier (was perplexity-reasoning)
        question: { model: 'openai', cost: 0.15, quality: 4.0 },
        research: { model: 'gemini-fast', cost: 0.1, quality: 4.0 }, // Free tier (was gemini-search)
        guide: { model: 'gemini-fast', cost: 0.1, quality: 4.0 },
        ideagen: { model: 'gemini-fast', cost: 0.1, quality: 4.2 }, // Free tier (was claude)
        cowriter: { model: 'gemini-fast', cost: 0.1, quality: 4.0 }, // Free tier (was claude-fast)
        codegen: { model: 'gemini-fast', cost: 0.0, quality: 4.5 }, // Reliable JSON for code generation
        imagegen: { model: 'flux', cost: 0.0002, quality: 3.8 }, // Free tier (was seedream)
        audit: { model: 'gemini-fast', cost: 0.1, quality: 4.0 } // Free tier (was claude)
    };

    const defaultModel = defaults[agentType];

    return {
        model: defaultModel.model,
        confidence: 0.5, // Medium confidence with no data
        reasoning: `Default model for ${agentType} (no historical data available)`,
        estimatedCost: defaultModel.cost,
        expectedQuality: defaultModel.quality
    };
}

/**
 * Compare multiple models and get recommendations
 */
export async function compareModelsForTask(
    agentType: AgentType,
    models: string[]
): Promise<Array<{
    model: string;
    stats: any;
    recommendation: 'excellent' | 'good' | 'average' | 'poor';
}>> {
    const comparisons = await Promise.all(
        models.map(async (model) => {
            const stats = await getFeedbackStats(agentType, model);

            // Calculate composite score
            const qualityScore = stats.avgRating;
            const successScore = stats.successRate / 100;
            const compositeScore = (qualityScore * 0.6) + (successScore * 0.4) * 5;

            let recommendation: 'excellent' | 'good' | 'average' | 'poor';
            if (compositeScore >= 4.5) recommendation = 'excellent';
            else if (compositeScore >= 3.5) recommendation = 'good';
            else if (compositeScore >= 2.5) recommendation = 'average';
            else recommendation = 'poor';

            return {
                model,
                stats,
                recommendation
            };
        })
    );

    return comparisons.sort((a, b) => {
        const scoreA = (a.stats.avgRating * 0.6) + (a.stats.successRate / 100 * 0.4) * 5;
        const scoreB = (b.stats.avgRating * 0.6) + (b.stats.successRate / 100 * 0.4) * 5;
        return scoreB - scoreA;
    });
}

/**
 * Get personalized model recommendation based on user history
 */
export async function getPersonalizedRecommendation(
    userId: string,
    agentType: AgentType
): Promise<ModelRecommendation> {
    // TODO: Implement user-specific preference learning
    // For now, use standard adaptive selection
    return selectAdaptiveModel({
        agentType,
        priority: 'balanced',
        userId
    });
}
