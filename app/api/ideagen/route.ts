/**
 * IdeaGen API Route
 * POST /api/ideagen - Automated idea generation and brainstorming
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateIdeas } from '@/lib/agents/ideagen/orchestrator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        if (!body.topic || typeof body.topic !== 'string') {
            return NextResponse.json(
                { error: 'Topic is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        if (!body.kbName) {
            return NextResponse.json(
                { error: 'Knowledge base name is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        // Generate ideas
        const result = await generateIdeas({
            topic: body.topic,
            kbName: body.kbName,
            count: body.count || 10,
            userId: body.userId,
            locale: body.locale || 'en',
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('IdeaGen API error:', error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                code: 'IDEAGEN_ERROR',
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
