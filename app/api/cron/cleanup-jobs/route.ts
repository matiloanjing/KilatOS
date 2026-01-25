/**
 * Cleanup Stuck Jobs Cron
 * 
 * Runs every 5 minutes to:
 * 1. Mark stuck processing jobs as failed (>10 min)
 * 2. Delete old completed/failed jobs (>7 days)
 * 
 * Schedule: every 5 minutes
 * 
 * Copyright (c) 2026 KilatOS
 */


import { NextResponse } from 'next/server';
import { jobQueue } from '@/lib/queue/job-queue';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
    // Optional: Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 [Cron] Starting job cleanup...');

    const results = {
        stuckJobsCleaned: 0,
        oldJobsCleaned: 0,
        errors: [] as string[]
    };

    try {
        // Step 1: Cleanup stuck jobs (processing > 10 minutes)
        results.stuckJobsCleaned = await jobQueue.cleanupStuckJobs(10);

        // Step 2: Cleanup old completed/failed jobs (> 7 days)
        results.oldJobsCleaned = await jobQueue.cleanupOldJobs(7);

        console.log(`✅ [Cron] Job cleanup complete: ${results.stuckJobsCleaned} stuck, ${results.oldJobsCleaned} old`);

        return NextResponse.json({
            success: true,
            ...results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [Cron] Job cleanup failed:', error);
        results.errors.push(error instanceof Error ? error.message : 'Unknown error');

        return NextResponse.json({
            success: false,
            ...results,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
