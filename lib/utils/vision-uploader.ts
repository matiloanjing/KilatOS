/**
 * Vision Image Uploader
 * Uploads images to Supabase Storage for temporary vision analysis
 * Copyright © 2025 KilatCode Studio
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UploadResult {
    url: string;
    path: string;
    expiresAt: Date;
}

/**
 * Upload image for vision analysis
 * Images are stored temporarily and auto-deleted after 24 hours
 */
export async function uploadImageForVision(
    imageFile: File | Buffer,
    userId?: string
): Promise<UploadResult> {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `vision/${userId || 'anonymous'}/${timestamp}-${random}.png`;

    try {
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('temp-images')
            .upload(fileName, imageFile, {
                cacheControl: '3600', // 1 hour cache
                upsert: false,
                contentType: imageFile instanceof File ? imageFile.type : 'image/png'
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('temp-images')
            .getPublicUrl(fileName);

        // Schedule cleanup after 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await scheduleCleanup(fileName, 86400); // 24 hours in seconds

        return {
            url: publicUrl,
            path: fileName,
            expiresAt
        };
    } catch (error) {
        console.error('Image upload error:', error);
        throw error;
    }
}

/**
 * Upload image from base64
 */
export async function uploadImageFromBase64(
    base64Data: string,
    userId?: string
): Promise<UploadResult> {
    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    return uploadImageForVision(buffer, userId);
}

/**
 * Upload image from URL (download first, then upload)
 */
export async function uploadImageFromUrl(
    imageUrl: string,
    userId?: string
): Promise<UploadResult> {
    try {
        // Download image
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return uploadImageForVision(buffer, userId);
    } catch (error) {
        console.error('Image download error:', error);
        throw error;
    }
}

/**
 * Schedule image cleanup (deletion after specified time)
 * Uses Supabase Edge Functions or simple setTimeout for demo
 */
async function scheduleCleanup(fileName: string, delaySeconds: number): Promise<void> {
    // Option 1: Use Supabase Edge Function (recommended for production)
    // await supabase.functions.invoke('schedule-cleanup', {
    //     body: { fileName, delaySeconds }
    // });

    // Option 2: Simple setTimeout (for demo/development)
    // Note: This won't persist across server restarts
    if (typeof setTimeout !== 'undefined') {
        setTimeout(async () => {
            await deleteImage(fileName);
        }, delaySeconds * 1000);
    }

    // Option 3: Store cleanup task in database
    // await supabase.from('cleanup_tasks').insert({
    //     file_path: fileName,
    //     scheduled_at: new Date(Date.now() + delaySeconds * 1000)
    // });
}

/**
 * Delete image from storage
 */
export async function deleteImage(fileName: string): Promise<void> {
    try {
        const { error } = await supabase.storage
            .from('temp-images')
            .remove([fileName]);

        if (error) {
            console.error('Delete error:', error);
        }
    } catch (error) {
        console.error('Delete image error:', error);
    }
}

/**
 * Clean up all expired images
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredImages(): Promise<number> {
    try {
        // List all files in vision folder
        const { data: files, error } = await supabase.storage
            .from('temp-images')
            .list('vision', {
                limit: 1000,
                sortBy: { column: 'created_at', order: 'asc' }
            });

        if (error || !files) {
            throw error;
        }

        // Filter files older than 24 hours
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const expiredFiles = files.filter(file => {
            const createdAt = new Date(file.created_at).getTime();
            return createdAt < oneDayAgo;
        });

        if (expiredFiles.length === 0) {
            return 0;
        }

        // Delete expired files
        const filePaths = expiredFiles.map(f => `vision/${f.name}`);
        const { error: deleteError } = await supabase.storage
            .from('temp-images')
            .remove(filePaths);

        if (deleteError) {
            console.error('Bulk delete error:', deleteError);
            return 0;
        }

        console.log(`Cleaned up ${expiredFiles.length} expired images`);
        return expiredFiles.length;
    } catch (error) {
        console.error('Cleanup error:', error);
        return 0;
    }
}
