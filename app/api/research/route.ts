/**
 * Research API Route
 * POST /api/research - DR-in-KG deep research system
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { research } from '@/lib/agents/research/orchestrator';

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

        const validPresets = ['quick', 'medium', 'deep'];
        if (body.preset && !validPresets.includes(body.preset)) {
            return NextResponse.json(
                { error: 'Preset must be "quick", "medium", or "deep"', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        // Execute research workflow
        const result = await research({
            topic: body.topic,
            preset: body.preset || 'medium',
            kbName: body.kbName,
            userId: body.userId,
            locale: body.locale || 'en',
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Research API error:', error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                code: 'RESEARCH_ERROR',
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
