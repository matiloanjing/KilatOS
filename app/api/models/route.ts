/**
 * Models API - List and Select LLM Models
 * 
 * GET /api/models?type=text|image|audio - List available models
 * POST /api/models/select - Save user's model preference
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';
import { modelService } from '@/lib/models/model-service';
import { getUserTier } from '@/lib/auth/user-tier';
import type { ModelType } from '@/lib/models/model-service';

export const runtime = 'nodejs';

/**
 * GET /api/models - List available models for current user
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = (searchParams.get('type') || 'text') as ModelType;

        // Get user from session
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Get user tier (defaults to 'free' if not authenticated)
        const userTier = await getUserTier(user?.id);

        // Get available models
        const models = await modelService.getAvailableModels(userTier, type);

        // Get user's current selection
        const selectedModel = user?.id
            ? await modelService.getUserSelectedModel(user.id)
            : null;

        return NextResponse.json({
            success: true,
            models: models.map(m => ({
                model_id: m.model_id,
                display_name: m.display_name,
                provider: m.provider,
                tier_required: m.tier_required
            })),
            selected: selectedModel,
            userTier
        });

    } catch (error) {
        console.error('[API /models] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch models' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/models - Save user's model preference
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { modelId } = body;

        if (!modelId) {
            return NextResponse.json(
                { success: false, error: 'modelId is required' },
                { status: 400 }
            );
        }

        // Get user from session
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get user tier and validate model access
        const userTier = await getUserTier(user.id);
        const canAccess = await modelService.canUserAccessModel(userTier, modelId);

        if (!canAccess) {
            return NextResponse.json(
                { success: false, error: 'Model not available for your tier' },
                { status: 403 }
            );
        }

        // Save preference
        const saved = await modelService.setUserSelectedModel(user.id, modelId);

        if (!saved) {
            return NextResponse.json(
                { success: false, error: 'Failed to save preference' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Model preference saved',
            selected: modelId
        });

    } catch (error) {
        console.error('[API /models POST] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save model preference' },
            { status: 500 }
        );
    }
}
