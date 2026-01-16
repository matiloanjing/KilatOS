/**
 * Question API Route
 * POST /api/question - Generate and validate practice questions
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/agents/question/orchestrator';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        if (!body.mode || !['custom', 'mimic'].includes(body.mode)) {
            return NextResponse.json(
                { error: 'Mode must be "custom" or "mimic"', code: 'INVALID_MODE' },
                { status: 400 }
            );
        }

        if (!body.kbName) {
            return NextResponse.json(
                { error: 'Knowledge base name is required', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        if (body.mode === 'custom' && !body.requirements) {
            return NextResponse.json(
                { error: 'Requirements are required for custom mode', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        if (body.mode === 'mimic' && !body.examPdfContent) {
            return NextResponse.json(
                { error: 'Exam PDF content is required for mimic mode', code: 'INVALID_INPUT' },
                { status: 400 }
            );
        }

        // Generate questions
        const result = await generateQuestions({
            mode: body.mode,
            requirements: body.requirements,
            examPdfContent: body.examPdfContent,
            kbName: body.kbName,
            count: body.count || 5,
            difficulty: body.difficulty || 'medium',
            questionType: body.questionType || 'mixed',
            userId: body.userId,
            locale: body.locale || 'en',
        });

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Question API error:', error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Internal server error',
                code: 'QUESTION_ERROR',
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
