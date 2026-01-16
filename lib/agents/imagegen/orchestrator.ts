/**
 * ImageGen Agent Main Orchestrator
 * Adaptive image generation with 9 Pollination models
 * Copyright © 2025 KilatCode Studio
 */

import { generateImage, generateImageVariations } from '@/lib/ai/pollination-image';
import { optimizePrompt } from './prompt-optimizer';
import { selectOptimalModel } from './model-selector';
import type { PollinationImageModel } from '@/lib/config/models';

export interface ImageGenParams {
    mode: 'text2image' | 'image2image' | 'style-transfer' | 'ui-mockup' | 'variations';
    prompt: string;
    referenceImageUrl?: string; // For image2image, style-transfer
    style?: 'realistic' | 'artistic' | 'anime' | 'minimalist' | 'abstract';
    quality?: 'draft' | 'standard' | 'high' | 'ultra';
    options?: {
        width?: number;
        height?: number;
        seed?: number;
        variations?: number; // Number of variations to generate
        enhance?: boolean; // Use prompt enhancement
    };
    userId?: string;
    textModel?: string; // User's selected text model (for prompt optimization)
}

export interface ImageGenResponse {
    sessionId: string;
    status: 'optimizing' | 'generating' | 'completed' | 'failed';
    images: {
        url: string;
        base64?: string;
        model: PollinationImageModel;
        seed: number;
        prompt: string; // Optimized prompt
    }[];
    originalPrompt: string;
    optimizedPrompt?: string;
    cost: {
        pollen: number;
        imagesGenerated: number;
    };
    quality: 'draft' | 'standard' | 'high' | 'ultra';
}

/**
 * Main ImageGen orchestrator
 */
export async function generateImages(params: ImageGenParams): Promise<ImageGenResponse> {
    // Generate unique session ID for tracking
    const sessionId = `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const startTime = Date.now();

    try {
        console.log(`🎨 ImageGen: Starting generation (session: ${sessionId})`);

        // STEP 1: Detect user tier and smart-select model based on style
        const { getUserTier } = await import('@/lib/auth/user-tier');
        const { smartSelectImageModel, getNextFallback } = await import('./smart-model-selector');

        const userTier = await getUserTier(params.userId) as 'free' | 'pro' | 'enterprise';

        // Smart selection: detects style from prompt + respects tier limits
        // Filter mode to compatible types for smart selector
        const selectorMode = (params.mode === 'text2image' || params.mode === 'style-transfer' || params.mode === 'ui-mockup')
            ? params.mode
            : undefined;
        const modelSelection = smartSelectImageModel(params.prompt, userTier, selectorMode);
        let selectedModel = modelSelection.model;

        console.log(`🎨 Smart Model Selection:`);
        console.log(`   → Tier: ${userTier}`);
        console.log(`   → Style: ${modelSelection.style}`);
        console.log(`   → Model: ${selectedModel}`);
        console.log(`   → Reason: ${modelSelection.reason}`);

        // STEP 2: Optimize prompt if requested
        let finalPrompt = params.prompt;
        if (params.options?.enhance !== false) {
            console.log('🎨 Optimizing prompt...');
            finalPrompt = await optimizePrompt(params.prompt, {
                mode: params.mode,
                style: params.style,
                textModel: params.textModel // Forward user's model selection
            });
            console.log(`✅ Optimized: "${finalPrompt.substring(0, 80)}..."`);
        }

        // STEP 3: Generate image(s)
        const variationsCount = params.options?.variations || 1;
        const images: ImageGenResponse['images'] = [];
        let totalCost = 0;

        if (variationsCount > 1) {
            // Generate multiple variations with different seeds
            console.log(`🖼️ Generating ${variationsCount} variations...`);

            const variations = await generateImageVariations(
                finalPrompt,
                variationsCount,
                {
                    model: selectedModel,
                    width: params.options?.width || 1024,
                    height: params.options?.height || 1024,
                    enhance: true
                }
            );

            for (const variation of variations) {
                images.push({
                    url: variation.url,
                    base64: variation.base64,
                    model: selectedModel,
                    seed: variation.seed,
                    prompt: finalPrompt
                });
                totalCost += variation.cost;
            }
        } else {
            // Generate single image
            console.log('🖼️ Generating single image...');

            const result = await generateImage(
                finalPrompt,
                {
                    model: selectedModel,
                    width: params.options?.width || 1024,
                    height: params.options?.height || 1024,
                    seed: params.options?.seed,
                    enhance: true
                }
            );

            images.push({
                url: result.url,
                base64: result.base64,
                model: selectedModel,
                seed: result.seed,
                prompt: finalPrompt
            });
            totalCost = result.cost;
        }

        const latencyMs = Date.now() - startTime;

        // STEP 4: Log usage with image-specific tracking
        const { logImageUsage } = await import('@/lib/tracking/pollination-usage');
        await logImageUsage({
            userId: params.userId,
            sessionId,
            model: selectedModel,
            imagesGenerated: images.length,
            pollenCost: totalCost,
            taskInput: params.prompt,
            success: true,
            latencyMs
        });

        console.log(`✅ Generated ${images.length} image(s) - Cost: ${totalCost.toFixed(4)} pollen`);

        return {
            sessionId,
            status: 'completed',
            images,
            originalPrompt: params.prompt,
            optimizedPrompt: params.options?.enhance !== false ? finalPrompt : undefined,
            cost: {
                pollen: totalCost,
                imagesGenerated: images.length
            },
            quality: userTier === 'free' ? 'draft' : (params.quality || 'standard')
        };

    } catch (error) {
        console.error('ImageGen error:', error);

        // Log failed usage
        try {
            const { logImageUsage } = await import('@/lib/tracking/pollination-usage');
            await logImageUsage({
                userId: params.userId,
                sessionId,
                model: 'flux',
                imagesGenerated: 0,
                pollenCost: 0,
                taskInput: params.prompt,
                success: false,
                latencyMs: Date.now() - startTime
            });
        } catch (logError) {
            console.error('Failed to log error usage:', logError);
        }

        throw error;
    }
}

/**
 * Generate image with style transfer
 */
export async function applyStyleTransfer(
    contentImageUrl: string,
    stylePrompt: string,
    intensity: number = 0.7,
    userId?: string // User ID for tier-based model selection
): Promise<ImageGenResponse['images'][0]> {
    // Get tier-based model instead of hardcoding
    const { getUserTier, getModelForTier } = await import('@/lib/auth/user-tier');
    const userTier = await getUserTier(userId);
    const model = getModelForTier(userTier, 'image') as PollinationImageModel;
    // Combine content and style into prompt
    const prompt = `Apply style: ${stylePrompt}. Intensity: ${intensity}. Reference image for content structure.`;

    const result = await generateImage(prompt, {
        model, // Use tier-based model
        width: 1024,
        height: 1024,
        enhance: true
    });

    return {
        url: result.url,
        base64: result.base64,
        model,
        seed: result.seed,
        prompt
    };
}

/**
 * Generate UI mockup
 */
export async function generateUIMockup(
    description: string,
    theme: 'light' | 'dark' = 'light',
    userId?: string // User ID for tier-based model selection
): Promise<ImageGenResponse['images'][0]> {
    // Get tier-based model instead of hardcoding
    const { getUserTier, getModelForTier } = await import('@/lib/auth/user-tier');
    const userTier = await getUserTier(userId);
    const model = getModelForTier(userTier, 'image') as PollinationImageModel;

    const enhancedPrompt = `UI/UX design mockup: ${description}. ${theme} theme. Modern, clean, professional interface. High-fidelity mockup.`;

    const result = await generateImage(enhancedPrompt, {
        model, // Use tier-based model
        width: 1280,
        height: 720, // 16:9 aspect ratio
        enhance: true
    });

    return {
        url: result.url,
        base64: result.base64,
        model,
        seed: result.seed,
        prompt: enhancedPrompt
    };
}

