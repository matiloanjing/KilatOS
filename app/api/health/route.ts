/**
 * Health Check Endpoint
 * 
 * Simple health check for monitoring.
 * Uses Edge Runtime for global CDN caching.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextResponse } from 'next/server';

// Enable Edge Runtime for faster global response
export const runtime = 'edge';

// Cache for 60 seconds
export const revalidate = 60;

export async function GET() {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: {
            patternLearning: true,
            selfHealing: true,
            semanticCache: true,
            prefetching: true,
            edgeCaching: true
        }
    };

    return NextResponse.json(health, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
    });
}
