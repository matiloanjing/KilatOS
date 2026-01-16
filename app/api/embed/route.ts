/**
 * Xenova Embedding API - Server-Side with Singleton Pattern
 * 
 * Optimized for Vercel Serverless:
 * - Global singleton to reuse model across requests
 * - Downloads from HuggingFace CDN (no local storage)
 * - ~23MB quantized model, ~0.5-1s cold start
 * 
 * Model: all-MiniLM-L6-v2 (384 dimensions)
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';

// ============================================================================
// Vercel Serverless Config
// ============================================================================

// IMPORTANT: Disable local model loading (Vercel is read-only filesystem)
env.allowLocalModels = false;
env.useBrowserCache = false;

// Global singleton - survives across warm requests
let pipelineInstance: FeatureExtractionPipeline | null = null;
let isLoading = false;

/**
 * Get or create pipeline instance (singleton pattern)
 */
async function getPipeline(): Promise<FeatureExtractionPipeline> {
    if (pipelineInstance) {
        return pipelineInstance;
    }

    if (isLoading) {
        // Wait for existing load to complete
        while (isLoading) {
            await new Promise(r => setTimeout(r, 100));
        }
        return pipelineInstance!;
    }

    isLoading = true;
    console.log('❄️ Cold Start: Downloading Xenova model (all-MiniLM-L6-v2)...');
    const startTime = Date.now();

    try {
        pipelineInstance = await pipeline(
            'feature-extraction',
            'Xenova/all-MiniLM-L6-v2'
        );
        console.log(`✅ Xenova model loaded in ${Date.now() - startTime}ms`);
        return pipelineInstance;
    } finally {
        isLoading = false;
    }
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, texts } = body;

        // Support both single and batch
        const inputTexts = texts || (text ? [text] : null);

        if (!inputTexts || inputTexts.length === 0) {
            return NextResponse.json(
                { error: 'No text provided. Use { text: "..." } or { texts: ["..."] }' },
                { status: 400 }
            );
        }

        const extractor = await getPipeline();
        const results: number[][] = [];

        for (const t of inputTexts) {
            const output = await extractor(t, {
                pooling: 'mean',
                normalize: true
            });
            results.push(Array.from(output.data));
        }

        return NextResponse.json({
            embeddings: results,
            model: 'all-MiniLM-L6-v2',
            dimensions: 384,
            source: 'xenova-server'
        });

    } catch (error) {
        console.error('Embedding error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Embedding generation failed' },
            { status: 500 }
        );
    }
}

// Health check
export async function GET() {
    const isReady = pipelineInstance !== null;
    return NextResponse.json({
        status: isReady ? 'ready' : 'cold',
        model: 'all-MiniLM-L6-v2',
        dimensions: 384
    });
}
