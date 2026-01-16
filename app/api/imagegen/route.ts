/**
 * ImageGen API Route
 * Handles image generation requests with validation
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateImages, applyStyleTransfer, generateUIMockup } from '@/lib/agents/imagegen/orchestrator';
import { saveGeneratedImage } from '@/lib/history/image-history';

// Request validation schema
const ImageGenRequestSchema = z.object({
    mode: z.enum(['text2image', 'image2image', 'style-transfer', 'ui-mockup', 'variations']),
    prompt: z.string().min(3).max(1000),
    referenceImageUrl: z.string().url().optional(),
    style: z.enum(['realistic', 'artistic', 'anime', 'minimalist', 'abstract']).optional(),
    quality: z.enum(['draft', 'standard', 'high', 'ultra']).optional().default('standard'),
    options: z.object({
        width: z.number().min(256).max(2048).optional(),
        height: z.number().min(256).max(2048).optional(),
        seed: z.number().optional(),
        variations: z.number().min(1).max(10).optional().default(1),
        enhance: z.boolean().optional().default(true)
    }).optional(),
    userId: z.string().optional()
});

// Style transfer specific schema
const StyleTransferSchema = z.object({
    contentImageUrl: z.string().url(),
    stylePrompt: z.string().min(3).max(500),
    intensity: z.number().min(0).max(1).optional().default(0.7),
    userId: z.string().optional()
});

// UI mockup specific schema
const UIMockupSchema = z.object({
    description: z.string().min(10).max(1000),
    theme: z.enum(['light', 'dark']).optional().default('light'),
    userId: z.string().optional()
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Check for special modes
        if (body.mode === 'style-transfer' && body.contentImageUrl) {
            // Validate style transfer request
            const validatedData = StyleTransferSchema.parse(body);

            const result = await applyStyleTransfer(
                validatedData.contentImageUrl,
                validatedData.stylePrompt,
                validatedData.intensity
            );

            const sessionId = 'style-transfer-' + Date.now();

            // Save to database (non-blocking)
            saveGeneratedImage(
                sessionId,
                result.url,
                result.prompt,
                {
                    userId: validatedData.userId,
                    modelUsed: result.model,
                    width: 1024,
                    height: 1024,
                    seed: result.seed,
                    cost: 1.25,
                    metadata: { mode: 'style-transfer', intensity: validatedData.intensity }
                }
            ).catch(err => console.error('Failed to save style transfer image:', err));

            return NextResponse.json({
                sessionId,
                status: 'completed',
                images: [result],
                cost: {
                    pollen: 1.25, // nanobanana-pro cost
                    imagesGenerated: 1
                }
            });
        }

        if (body.mode === 'ui-mockup') {
            // Validate UI mockup request
            const validatedData = UIMockupSchema.parse(body);

            const result = await generateUIMockup(
                validatedData.description,
                validatedData.theme
            );

            const sessionId = 'ui-mockup-' + Date.now();

            // Save to database (non-blocking)
            saveGeneratedImage(
                sessionId,
                result.url,
                result.prompt,
                {
                    userId: validatedData.userId,
                    modelUsed: result.model,
                    width: 1280,
                    height: 720,
                    seed: result.seed,
                    cost: 2.5,
                    metadata: { mode: 'ui-mockup', theme: validatedData.theme }
                }
            ).catch(err => console.error('Failed to save UI mockup image:', err));

            return NextResponse.json({
                sessionId,
                status: 'completed',
                images: [result],
                cost: {
                    pollen: 2.5, // gptimage cost
                    imagesGenerated: 1
                }
            });
        }

        // Standard image generation
        const validatedData = ImageGenRequestSchema.parse(body);

        // Validate mode-specific requirements
        if (['image2image', 'style-transfer'].includes(validatedData.mode)) {
            if (!validatedData.referenceImageUrl) {
                return NextResponse.json(
                    { error: `${validatedData.mode} requires referenceImageUrl` },
                    { status: 400 }
                );
            }
        }

        // Generate images
        const result = await generateImages({
            mode: validatedData.mode,
            prompt: validatedData.prompt,
            referenceImageUrl: validatedData.referenceImageUrl,
            style: validatedData.style,
            quality: validatedData.quality,
            options: validatedData.options,
            userId: validatedData.userId
        });

        // Save all generated images (fire and forget for performance)
        Promise.all(result.images.map(img =>
            saveGeneratedImage(
                result.sessionId,
                img.url,
                img.prompt,
                {
                    userId: validatedData.userId,
                    modelUsed: img.model,
                    width: validatedData.options?.width,
                    height: validatedData.options?.height,
                    seed: img.seed,
                    cost: result.cost.pollen / result.images.length, // Approximate per-image cost
                    metadata: {
                        mode: validatedData.mode,
                        quality: result.quality,
                        originalPrompt: result.originalPrompt
                    }
                }
            )
        )).catch(err => console.error('Failed to save generated images:', err));

        return NextResponse.json(result);

    } catch (error) {
        console.error('ImageGen API error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation error',
                    details: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET endpoint for image history
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (sessionId) {
        // TODO: Implement session retrieval
        return NextResponse.json({
            sessionId,
            status: 'completed',
            message: 'Session history not yet implemented'
        });
    }

    if (userId) {
        // TODO: Implement user image history
        return NextResponse.json({
            userId,
            images: [],
            message: 'User history not yet implemented'
        });
    }

    return NextResponse.json(
        { error: 'sessionId or userId query parameter required' },
        { status: 400 }
    );
}
