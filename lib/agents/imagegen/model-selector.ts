/**
 * Model Selector for Image Generation
 * Adaptive selection based on quality and use case
 * Copyright © 2025 KilatCode Studio
 */

import type { PollinationImageModel } from '@/lib/config/models';
import { IMAGE_MODEL_INFO, IMAGE_MODEL_STRATEGY } from '@/lib/config/models';

/**
 * Select optimal model based on quality requirement
 */
export function selectOptimalModel(
    quality: 'draft' | 'standard' | 'high' | 'ultra',
    mode?: string
): PollinationImageModel {
    // Mode-specific overrides
    if (mode === 'ui-mockup') {
        // UI mockups need high quality
        return quality === 'ultra' ? 'gptimage-large' : 'gptimage';
    }

    if (mode === 'style-transfer') {
        // Style transfer benefits from specialized models
        return quality === 'ultra' ? 'nanobanana-pro' : 'nanobanana';
    }

    // Use strategy for general cases
    return IMAGE_MODEL_STRATEGY[quality];
}

/**
 * Get model recommendations with reasoning
 */
export function getModelRecommendations(
    requirements: {
        quality: 'draft' | 'standard' | 'high' | 'ultra';
        budget?: 'low' | 'medium' | 'high';
        speed?: 'fast' | 'balanced' | 'quality';
        useCase?: string;
    }
): {
    recommended: PollinationImageModel;
    alternatives: PollinationImageModel[];
    reasoning: string;
} {
    const { quality, budget = 'medium', speed = 'balanced', useCase } = requirements;

    // Budget constraints
    const budgetMap = {
        low: ['turbo', 'zimage', 'seedream'],
        medium: ['seedream', 'seedream-pro', 'kontext', 'gptimage'],
        high: ['gptimage', 'gptimage-large', 'nanobanana-pro']
    };

    // Speed preferences
    const speedMap = {
        fast: ['turbo', 'zimage'],
        balanced: ['seedream', 'seedream-pro', 'gptimage'],
        quality: ['gptimage', 'gptimage-large']
    };

    // Start with quality-based selection
    let recommended = selectOptimalModel(quality, useCase);

    // Apply budget constraint
    const budgetModels = budgetMap[budget];
    if (!budgetModels.includes(recommended)) {
        // Find closest match in budget
        const qualityOrder: PollinationImageModel[] = [
            'turbo', 'zimage', 'seedream', 'seedream-pro',
            'kontext', 'nanobanana', 'gptimage', 'nanobanana-pro', 'gptimage-large'
        ];

        for (const model of qualityOrder.reverse()) {
            if (budgetModels.includes(model)) {
                recommended = model;
                break;
            }
        }
    }

    // Apply speed preference
    if (speed === 'fast' && !speedMap.fast.includes(recommended)) {
        recommended = 'turbo'; // Fallback to fastest
    }

    // Generate alternatives
    const allModels: PollinationImageModel[] = [
        'turbo', 'zimage', 'seedream', 'seedream-pro',
        'kontext', 'nanobanana', 'gptimage', 'nanobanana-pro', 'gptimage-large'
    ];

    const alternatives = allModels
        .filter(m => m !== recommended)
        .slice(0, 3);

    // Generate reasoning
    const modelInfo = IMAGE_MODEL_INFO[recommended];
    const reasoning = `Selected ${recommended} for ${quality} quality. 
Cost: ${modelInfo.cost.toFixed(4)} pollen. 
Speed: ${modelInfo.speed}. 
Capabilities: ${modelInfo.capabilities.join(', ')}.
${budget === 'low' ? 'Budget-optimized choice. ' : ''}
${speed === 'fast' ? 'Speed-optimized choice. ' : ''}`;

    return {
        recommended,
        alternatives,
        reasoning: reasoning.replace(/\s+/g, ' ').trim()
    };
}

/**
 * Compare models for user decision
 */
export function compareModels(models: PollinationImageModel[]): {
    model: PollinationImageModel;
    cost: number;
    speed: string;
    quality: string;
    bestFor: string[];
}[] {
    return models.map(model => {
        const info = IMAGE_MODEL_INFO[model];
        return {
            model,
            cost: info.cost,
            speed: info.speed,
            quality: info.quality,
            bestFor: info.capabilities
        };
    });
}

/**
 * Estimate total cost for batch generation
 */
export function estimateBatchCost(
    model: PollinationImageModel,
    count: number
): {
    totalCost: number;
    perImage: number;
    model: PollinationImageModel;
} {
    const info = IMAGE_MODEL_INFO[model];
    const perImage = info.cost;
    const totalCost = perImage * count;

    return {
        totalCost,
        perImage,
        model
    };
}
