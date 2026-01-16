/**
 * Image History Manager
 * Stores and retrieves generated image history
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

export interface GeneratedImage {
    id: string;
    session_id: string;
    user_id?: string;
    prompt: string;
    negative_prompt?: string;
    image_url: string;
    thumbnail_url?: string;
    model_used: string;
    width: number;
    height: number;
    seed?: number;
    cost?: number;
    metadata?: Record<string, any>;
    created_at: string;
}

// ============================================================================
// Image History Functions
// ============================================================================

/**
 * Save generated image
 */
export async function saveGeneratedImage(
    sessionId: string,
    imageUrl: string,
    prompt: string,
    options: {
        userId?: string;
        negativePrompt?: string;
        thumbnailUrl?: string;
        modelUsed?: string;
        width?: number;
        height?: number;
        seed?: number;
        cost?: number;
        metadata?: Record<string, any>;
    }
): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('generated_images')
            .insert({
                session_id: sessionId,
                user_id: options.userId,
                prompt,
                negative_prompt: options.negativePrompt,
                image_url: imageUrl,
                thumbnail_url: options.thumbnailUrl,
                model_used: options.modelUsed || 'flux',
                width: options.width || 1024,
                height: options.height || 1024,
                seed: options.seed,
                cost: options.cost,
                metadata: options.metadata
            })
            .select('id')
            .single();

        if (error) throw error;
        console.log(`🖼️ [ImageHistory] Saved image for prompt: ${prompt.substring(0, 30)}...`);
        return data?.id || null;
    } catch (error) {
        console.error('[ImageHistory] Failed to save image:', error);
        return null;
    }
}

/**
 * Get image history for a session
 */
export async function getImageHistory(
    sessionId: string,
    limit: number = 20
): Promise<GeneratedImage[]> {
    try {
        const { data, error } = await supabase
            .from('generated_images')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[ImageHistory] Failed to get history:', error);
        return [];
    }
}

/**
 * Get user's image gallery (across all sessions)
 */
export async function getUserImageGallery(
    userId: string,
    limit: number = 50
): Promise<GeneratedImage[]> {
    try {
        const { data, error } = await supabase
            .from('generated_images')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[ImageHistory] Failed to get gallery:', error);
        return [];
    }
}

/**
 * Search images by prompt
 */
export async function searchImages(
    userId: string,
    query: string,
    limit: number = 20
): Promise<GeneratedImage[]> {
    try {
        const { data, error } = await supabase
            .from('generated_images')
            .select('*')
            .eq('user_id', userId)
            .ilike('prompt', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[ImageHistory] Failed to search:', error);
        return [];
    }
}

/**
 * Delete an image
 */
export async function deleteImage(
    imageId: string,
    userId: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('generated_images')
            .delete()
            .eq('id', imageId)
            .eq('user_id', userId); // Ensure user owns this image

        return !error;
    } catch (error) {
        console.error('[ImageHistory] Failed to delete:', error);
        return false;
    }
}

/**
 * Get image stats for user
 */
export async function getImageStats(
    userId: string
): Promise<{
    totalImages: number;
    totalCost: number;
    favoriteModel: string | null;
}> {
    try {
        const { data, error } = await supabase
            .from('generated_images')
            .select('model_used, cost')
            .eq('user_id', userId);

        if (error || !data) {
            return { totalImages: 0, totalCost: 0, favoriteModel: null };
        }

        const totalImages = data.length;
        const totalCost = data.reduce((sum, img) => sum + (img.cost || 0), 0);

        // Find most used model
        const modelCounts: Record<string, number> = {};
        for (const img of data) {
            modelCounts[img.model_used] = (modelCounts[img.model_used] || 0) + 1;
        }
        const favoriteModel = Object.entries(modelCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        return { totalImages, totalCost, favoriteModel };
    } catch (error) {
        return { totalImages: 0, totalCost: 0, favoriteModel: null };
    }
}

console.log('✅ Image History Manager initialized');
