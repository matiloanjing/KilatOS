/**
 * Adaptive Intelligence Integration Helpers
 * Helper functions to integrate adaptive features into agents
 * Copyright © 2025 KilatCode Studio
 */

import { selectAdaptiveModel } from './model-selector';
import { getUserContext, applyUserPreferences, checkBudgetLimit, recordUserSession } from './context-manager';
import { autoOptimizePrompt, getPromptSuggestions } from './prompt-optimizer';
import { submitFeedback, recordLearnedPattern } from './feedback-collector';
import type { AgentType } from '@/lib/config/models';

/**
 * Enhance agent request with adaptive intelligence
 */
export async function enhanceAgentRequest<T extends Record<string, any>>(
    request: T,
    userId?: string,
    agentType?: AgentType
): Promise<{
    enhancedRequest: T;
    recommendations: {
        model?: string;
        promptOptimization?: string;
        budgetWarning?: string;
    };
}> {
    const recommendations: any = {};

    // Apply user preferences if userId provided
    if (userId) {
        const context = await getUserContext(userId);
        if (context) {
            request = applyUserPreferences(request, context);

            // Check budget
            if (request.estimatedCost) {
                const budgetCheck = checkBudgetLimit(request.estimatedCost, context);
                if (!budgetCheck.allowed) {
                    recommendations.budgetWarning = budgetCheck.message;
                }
            }
        }
    }

    // Get adaptive model recommendation
    const reqAny = request as any;
    if (agentType && !reqAny.model) {
        const modelRec = await selectAdaptiveModel({
            agentType,
            priority: reqAny.priority || 'balanced',
            userId
        });

        reqAny.model = modelRec.model;
        recommendations.model = `Using ${modelRec.model} (confidence: ${(modelRec.confidence * 100).toFixed(0)}%)`;
    }

    // Optimize prompt if available
    if (reqAny.prompt && agentType && reqAny.model) {
        const optimization = await autoOptimizePrompt(
            reqAny.prompt,
            agentType,
            reqAny.model
        );

        if (optimization.confidence > 0.6) {
            reqAny.optimizedPrompt = optimization.optimizedPrompt;
            recommendations.promptOptimization = `Prompt optimized (${optimization.improvements.join(', ')})`;
        }
    }

    return {
        enhancedRequest: request,
        recommendations
    };
}

/**
 * Record agent execution result for learning
 */
export async function recordAgentExecution(
    sessionId: string,
    userId: string | undefined,
    agentType: AgentType,
    result: {
        success: boolean;
        model: string;
        executionTime?: number;
        cost?: number;
        iterationCount?: number;
    },
    userRating?: number
): Promise<void> {
    // Record session for user stats
    if (userId) {
        await recordUserSession(
            userId,
            agentType,
            result.cost || 0,
            userRating
        );
    }

    // ALWAYS submit execution data for learning (even without user rating)
    // This ensures all executions are logged to agent_feedback table
    const validRating = userRating
        ? Math.max(1, Math.min(5, Math.round(userRating))) as 1 | 2 | 3 | 4 | 5
        : undefined;

    await submitFeedback({
        sessionId,
        userId,
        agentType,
        userRating: validRating,
        wasSuccessful: result.success,
        iterationCount: result.iterationCount,
        modelUsed: result.model,
        executionTime: result.executionTime,
        costPollen: result.cost
    });

    // ALWAYS record learned pattern for future optimization
    // This works for ALL users including anonymous
    if (result.success) {
        await recordLearnedPattern(
            agentType,
            'code_generation', // task type
            {
                model: result.model,
                executionTime: result.executionTime,
                iterationCount: result.iterationCount
            },
            1.0, // success rate (100% since this is a success)
            result.cost || 0
        );
    }
}


/**
 * Get prompt quality score and suggestions
 */
export function analyzePromptQuality(prompt: string): {
    score: number;
    suggestions: string[];
    quality: 'poor' | 'fair' | 'good' | 'excellent';
} {
    const { score, suggestions } = getPromptSuggestions(prompt);

    let quality: 'poor' | 'fair' | 'good' | 'excellent';
    if (score >= 90) quality = 'excellent';
    else if (score >= 70) quality = 'good';
    else if (score >= 50) quality = 'fair';
    else quality = 'poor';

    return {
        score,
        suggestions,
        quality
    };
}
