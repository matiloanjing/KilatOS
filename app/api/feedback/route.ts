/**
 * Feedback API Route
 * Submit and retrieve user feedback
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    submitFeedback,
    getFeedbackStats,
    getTopModels,
    getUserFeedbackTrends
} from '@/lib/agents/adaptive/feedback-collector';

// Feedback submission schema
const FeedbackSubmissionSchema = z.object({
    sessionId: z.string(),
    userId: z.string().optional(),
    agentType: z.enum(['solve', 'question', 'research', 'guide', 'ideagen', 'cowriter', 'codegen', 'imagegen', 'audit']),
    userRating: z.number().min(1).max(5),
    feedbackText: z.string().optional(),
    wasSuccessful: z.boolean(),
    iterationCount: z.number().optional(),
    modelUsed: z.string(),
    executionTime: z.number().optional(),
    costPollen: z.number().optional(),
    metadata: z.record(z.any()).optional()
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validatedData = FeedbackSubmissionSchema.parse(body);

        // Ensure userRating is valid 1-5 star rating
        const userRating = Math.max(1, Math.min(5, Math.round(validatedData.userRating))) as 1 | 2 | 3 | 4 | 5;

        await submitFeedback({
            ...validatedData,
            userRating
        });

        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully'
        });

    } catch (error) {
        console.error('Feedback API error:', error);

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

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');
        const agentType = searchParams.get('agentType');
        const model = searchParams.get('model');
        const userId = searchParams.get('userId');

        if (action === 'stats' && agentType) {
            // Get feedback statistics
            const stats = await getFeedbackStats(agentType, model || undefined);
            return NextResponse.json(stats);
        }

        if (action === 'top-models' && agentType) {
            // Get top performing models
            const limit = parseInt(searchParams.get('limit') || '5');
            const topModels = await getTopModels(agentType, limit);
            return NextResponse.json(topModels);
        }

        if (action === 'user-trends' && userId) {
            // Get user-specific trends
            const trends = await getUserFeedbackTrends(userId, agentType || undefined);
            return NextResponse.json(trends);
        }

        return NextResponse.json(
            { error: 'Invalid action or missing parameters' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Feedback GET error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
