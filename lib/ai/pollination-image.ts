/**
 * Pollination Image Generation
 * Uses gen.pollinations.ai for image generation
 * Copyright © 2025 KilatCode Studio
 */

import { PollinationImageModel, getImageModelCost } from '@/lib/config/models';

const API_BASE = 'https://gen.pollinations.ai';
const API_KEY = process.env.POLLINATION_API_KEY;

export interface ImageGenerationOptions {
    model?: PollinationImageModel;
    width?: number;
    height?: number;
    seed?: number;
    enhance?: boolean;
    nologo?: boolean;
    private?: boolean;
}

export interface ImageResult {
    url: string;
    base64?: string;
    model: PollinationImageModel;
    seed: number;
    cost: number;
}

/**
 * Standard resolution presets for consistent output
 */
export const IMAGE_RESOLUTIONS = {
    square: { width: 1024, height: 1024 },      // Default, most compatible
    landscape: { width: 1280, height: 720 },    // 16:9 wide
    portrait: { width: 720, height: 1280 },     // 9:16 tall (mobile)
    social: { width: 1080, height: 1080 },      // Instagram square
    banner: { width: 1920, height: 480 },       // Website banner
} as const;

/**
 * Generate a single image
 * Uses GET /image/{prompt} with query params
 */
export async function generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
): Promise<ImageResult> {
    const {
        model = 'flux',  // Default to free tier model
        width = IMAGE_RESOLUTIONS.square.width,   // Consistent 1024
        height = IMAGE_RESOLUTIONS.square.height, // Consistent 1024
        seed = Math.floor(Math.random() * 1000000),
        enhance = false,
        nologo = true,
        private: isPrivate = false
    } = options;

    if (!API_KEY) {
        throw new Error('POLLINATION_API_KEY not configured in .env.local');
    }

    // Build query params
    const params = new URLSearchParams({
        model,
        width: width.toString(),
        height: height.toString(),
        seed: seed.toString(),
        nologo: nologo.toString(),
        enhance: enhance.toString()
    });

    if (isPrivate) {
        params.append('private', 'true');
    }

    // URL-encode prompt and build full URL
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `${API_BASE}/image/${encodedPrompt}?${params.toString()}`;

    try {
        // Fetch image with auth header
        const response = await fetch(imageUrl, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Image generation failed: ${response.status} - ${error}`);
        }

        // Check content type - should be image
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            throw new Error(`Expected image, got ${contentType}`);
        }

        // Convert image to base64
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');

        return {
            url: imageUrl,  // Public URL to image
            base64: `data:${contentType};base64,${base64}`,
            model,
            seed,
            cost: calculateImageCost(model)
        };
    } catch (error) {
        console.error('Image generation error:', error);
        throw error;
    }
}

/**
 * Generate multiple variations with different seeds
 */
export async function generateImageVariations(
    prompt: string,
    count: number,
    options: ImageGenerationOptions = {}
): Promise<ImageResult[]> {
    const promises: Promise<ImageResult>[] = [];

    for (let i = 0; i < count; i++) {
        // Generate random seed for each variation
        const variationOptions = {
            ...options,
            seed: Math.floor(Math.random() * 1000000)
        };
        promises.push(generateImage(prompt, variationOptions));
    }

    return Promise.all(promises);
}

/**
 * Calculate image generation cost in pollen
 */
function calculateImageCost(model: PollinationImageModel): number {
    return getImageModelCost(model);
}
