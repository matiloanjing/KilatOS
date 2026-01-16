/**
 * CodeGen API Route
 * Handles code generation requests with validation
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateCode } from '@/lib/agents/codegen/orchestrator';

// Request validation schema
const CodeGenRequestSchema = z.object({
    mode: z.enum(['paper2code', 'text2web', 'text2backend', 'vision2code', 'refactor', 'test-gen']),
    input: z.union([
        z.string(),
        z.object({
            source: z.string(),
            imageUrl: z.string().url().optional()
        })
    ]),
    language: z.enum(['typescript', 'python', 'go', 'rust']).optional(),
    framework: z.string().optional(),
    options: z.object({
        maxIterations: z.number().min(1).max(5).optional(),
        includeTests: z.boolean().optional(),
        includeDocs: z.boolean().optional()
    }).optional(),
    userId: z.string().optional()
});

export async function POST(req: NextRequest) {
    try {
        // Parse and validate request
        const body = await req.json();
        const validatedData = CodeGenRequestSchema.parse(body);

        // Validate vision mode requirements
        if (validatedData.mode === 'vision2code') {
            if (typeof validatedData.input === 'string' || !validatedData.input.imageUrl) {
                return NextResponse.json(
                    { error: 'vision2code mode requires input.imageUrl' },
                    { status: 400 }
                );
            }
        }

        // Generate code
        const result = await generateCode({
            mode: validatedData.mode,
            input: validatedData.input,
            language: validatedData.language,
            framework: validatedData.framework,
            options: validatedData.options,
            userId: validatedData.userId
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error('CodeGen API error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// GET endpoint for session status
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json(
            { error: 'sessionId query parameter required' },
            { status: 400 }
        );
    }

    // TODO: Implement session status retrieval
    return NextResponse.json({
        sessionId,
        status: 'In progress',
        message: 'Session status retrieval not yet implemented'
    });
}
