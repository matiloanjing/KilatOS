/**
 * User Feedback API Endpoint
 * 
 * Receives user ratings (good/bad) for chat responses
 * Updates quality_score in agent_usage_logs
 * 
 * Copyright © 2026 KilatOS
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { messageId, rating, score } = await request.json();

        if (!messageId || !rating) {
            return NextResponse.json(
                { error: 'Missing messageId or rating' },
                { status: 400 }
            );
        }

        // Import usage tracker and log feedback
        const { usageTracker } = await import('@/lib/tracking/usage-tracker');

        // Map rating to score
        const userScore = rating === 'good' ? 100 : 20;

        // Log feedback (this updates the existing log entry)
        await usageTracker.logFeedback({
            requestId: messageId,
            userRating: userScore,
            userFeedback: rating,
            userAccepted: rating === 'good'
        });

        console.log(`✅ Feedback received: ${rating} (score: ${userScore}) for ${messageId}`);

        return NextResponse.json({
            success: true,
            messageId,
            rating,
            score: userScore
        });

    } catch (error) {
        console.error('❌ Feedback API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Feedback failed' },
            { status: 500 }
        );
    }
}
