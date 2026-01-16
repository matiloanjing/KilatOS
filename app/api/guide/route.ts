/**
 * Guide API Route
 * POST /api/guide - Interactive learning guide with HTML visualizations
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { guide } from '@/lib/agents/guide/orchestrator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        if (!body.notebooks || !Array.isArray(body.notebooks) || body.notebooks.length === 0) {
            return NextResponse.json(
                { error: 'Notebooks array is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        if (!body.kbName) {
            return NextResponse.json(
                { error: 'Knowledge base name is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        // Execute guide workflow
        const result = await guide({
            notebooks: body.notebooks,
            kbName: body.kbName,
            userId: body.userId,
            locale: body.locale || 'en',
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Guide API error:', error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                code: 'GUIDE_ERROR',
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
