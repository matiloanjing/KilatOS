/**
 * KilatOS Unified API Endpoint
 * 
 * ONE endpoint for ALL agents.
 * User sends message → OS routes → Agent executes → Response returns.
 * 
 * Philosophy:
 * - Simple API, powerful backend
 * - User doesn't choose agent (OS auto-detects)
 * - But can override if needed
 * 
 * Usage:
 * POST /api/kilat
 * {
 *   "message": "Buatkan landing page",
 *   "agent": "KilatCode" (optional, forces specific agent)
 *   "context": { ... } (optional)
 * }
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextResponse } from 'next/server';
import { kilatOS, initializeApps } from '@/lib/core';

// Initialize apps on first request
let initialized = false;

function ensureInitialized() {
    if (!initialized) {
        initializeApps();
        initialized = true;
    }
}

// ============================================================================
// POST - Main Processing (Streaming Support)
// ============================================================================

export async function POST(request: Request) {
    try {
        ensureInitialized();

        const body = await request.json();
        const { message, agent, context, stream = true } = body;

        // Validate input
        if (!message || typeof message !== 'string') {
            return NextResponse.json({
                success: false,
                type: 'error',
                content: 'Message is required',
                metadata: { agent: 'KilatOS' }
            }, { status: 400 });
        }

        // ============================================================
        // STREAMING MODE (Default)
        // ============================================================
        if (stream) {
            const encoder = new TextEncoder();

            const customStream = new ReadableStream({
                async start(controller) {
                    try {
                        const onProgress = async (progress: number, msg: string) => {
                            const chunk = JSON.stringify({
                                type: 'progress',
                                progress,
                                message: msg
                            }) + '\n';
                            controller.enqueue(encoder.encode(chunk));
                        };

                        // Add onProgress to context
                        const enrichedContext = {
                            ...context,
                            onProgress
                        };

                        // Process request
                        let result;
                        if (agent) {
                            result = await kilatOS.processWithApp(agent, message, enrichedContext);
                        } else {
                            result = await kilatOS.process(message, enrichedContext);
                        }

                        // Send final result
                        const finalChunk = JSON.stringify({
                            type: 'result',
                            result
                        }) + '\n';
                        controller.enqueue(encoder.encode(finalChunk));
                        controller.close();

                        // Log usage (Async, don't block stream)
                        logUsageInBackground(result, message).catch(console.error);

                    } catch (error) {
                        const errorChunk = JSON.stringify({
                            type: 'error',
                            error: error instanceof Error ? error.message : 'Detailed processing failed'
                        }) + '\n';
                        controller.enqueue(encoder.encode(errorChunk));
                        controller.close();
                    }
                }
            });

            return new Response(customStream, {
                headers: {
                    'Content-Type': 'application/x-ndjson',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache'
                }
            });
        }

        // ============================================================
        // LEGACY / SYNC MODE
        // ============================================================

        // Process request
        let result;
        if (agent) {
            result = await kilatOS.processWithApp(agent, message, context);
        } else {
            result = await kilatOS.process(message, context);
        }

        // Log usage
        await logUsageInBackground(result, message);

        return NextResponse.json(result);

    } catch (error) {
        console.error('❌ API Error:', error);
        return NextResponse.json({
            success: false,
            type: 'error',
            content: 'Internal server error',
            metadata: { error: String(error) }
        }, { status: 500 });
    }
}

/**
 * Background logging helper
 */
async function logUsageInBackground(result: any, message: string) {
    try {
        const { usageTracker } = await import('@/lib/tracking/usage-tracker');

        const outputContent = typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content);

        await usageTracker.logUsage({
            sessionId: undefined,
            userId: undefined,
            agentType: result.metadata?.agent || 'KilatOS',
            taskInput: message,
            taskComplexity: result.metadata?.complexity || 'medium',

            aiProvider: result.metadata?.aiProvider || result.metadata?.tier || 'unknown',
            modelUsed: result.metadata?.model || 'unknown',
            costUsd: result.metadata?.costUsd || result.metadata?.cost || 0,

            baseTemplateUsed: 'sync-api',
            enhancementsApplied: result.metadata?.enhancementsApplied || [],
            qualityChecksRun: result.metadata?.qualityChecksRun || [],

            priority: 'normal',
            success: result.success,
            outputText: outputContent,
            qualityScore: result.metadata?.qualityScore || 80,
            validationPassed: result.success,

            latencyMs: result.metadata?.executionTime || result.metadata?.duration || 0,
            tokensInput: result.metadata?.tokensInput || 0,
            tokensOutput: result.metadata?.tokensOutput || Math.ceil(outputContent.length / 4)
        });

        console.log('✅ Usage logged via background helper');
    } catch (e) {
        console.warn('   ⚠️ Failed to log usage:', e);
    }
}

// ============================================================================
// GET - Status & Info
// ============================================================================

export async function GET() {
    try {
        ensureInitialized();

        const status = kilatOS.getStatus();

        return NextResponse.json({
            success: true,
            message: 'KilatOS is running',
            version: '1.0.0',
            ...status
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to get status'
        }, { status: 500 });
    }
}
