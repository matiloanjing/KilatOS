/**
 * User Preferences API Route
 * Manage user context and preferences
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    getUserContext,
    updateUserPreferences,
    updateUserStatistics
} from '@/lib/agents/adaptive/context-manager';

// Preferences update schema
const PreferencesSchema = z.object({
    userId: z.string(),
    preferences: z.object({
        preferredModels: z.record(z.string()).optional(),
        defaultQuality: z.enum(['draft', 'standard', 'high', 'ultra']).optional(),
        budgetLimit: z.number().optional(),
        codingStyle: z.enum(['concise', 'verbose', 'commented']).optional(),
        preferredLanguage: z.enum(['typescript', 'python', 'go', 'rust']).optional(),
        testCoverage: z.number().min(0).max(100).optional(),
        imageStyle: z.enum(['realistic', 'artistic', 'anime', 'minimalist', 'abstract']).optional(),
        defaultImageSize: z.object({
            width: z.number(),
            height: z.number()
        }).optional(),
        enableAutoOptimization: z.boolean().optional(),
        feedbackFrequency: z.enum(['always', 'sometimes', 'never']).optional()
    })
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId query parameter required' },
                { status: 400 }
            );
        }

        const context = await getUserContext(userId);

        if (!context) {
            return NextResponse.json(
                { error: 'User context not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(context);

    } catch (error) {
        console.error('Get preferences error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const validatedData = PreferencesSchema.parse(body);

        await updateUserPreferences(
            validatedData.userId,
            validatedData.preferences
        );

        return NextResponse.json({
            success: true,
            message: 'Preferences updated successfully'
        });

    } catch (error) {
        console.error('Update preferences error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
export const dynamic = 'force-dynamic';
