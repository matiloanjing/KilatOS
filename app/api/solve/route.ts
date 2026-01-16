/**
 * Solve API Route
 * POST /api/solve - Problem solving with dual-loop reasoning
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { solve } from '@/lib/agents/solve/orchestrator';
import { CONSOLE_LOGO } from '@/lib/constants/branding';

// Log branding on server start
CONSOLE_LOGO();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        if (!body.question || typeof body.question !== 'string') {
            return NextResponse.json(
                { error: 'Question is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        if (!body.kbName || typeof body.kbName !== 'string') {
            return NextResponse.json(
                { error: 'Knowledge base name is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        // Execute solve workflow
        const result = await solve({
            question: body.question,
            kbName: body.kbName,
            userId: body.userId,
            locale: body.locale || 'en',
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Solve API error:', error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                code: 'SOLVE_ERROR',
            },
            { status: 500 }
        );
    }
}

// OPTIONS for CORS
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
