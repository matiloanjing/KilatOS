/**
 * CoWriter API Route
 * POST /api/co-writer - AI-assisted markdown editing
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { coWrite } from '@/lib/agents/cowriter/orchestrator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        const validOperations = ['rewrite', 'expand', 'shorten', 'auto-mark', 'narrate'];
        if (!body.operation || !validOperations.includes(body.operation)) {
            return NextResponse.json(
                {
                    error: `Operation must be one of: ${validOperations.join(', ')}`,
                    code: 'INVALID_OPERATION',
                },
                { status: 400 }
            );
        }

        if (!body.content || typeof body.content !== 'string') {
            return NextResponse.json(
                { error: 'Content is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        // Execute co-writing operation
        const result = await coWrite({
            operation: body.operation,
            content: body.content,
            instruction: body.instruction,
            userId: body.userId,
            locale: body.locale || 'en',
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('CoWriter API error:', error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                code: 'COWRITER_ERROR',
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
