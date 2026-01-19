/**
 * Job Status Polling Endpoint
 * 
 * GET /api/kilat/status?jobId=xxx
 * - Returns current job status, progress, and result
 * - Client polls every 5 seconds until status is 'completed' or 'failed'
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextResponse } from 'next/server';
import { jobQueue } from '@/lib/queue/job-queue';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return NextResponse.json({
                success: false,
                error: 'jobId parameter is required'
            }, { status: 400 });
        }

        // FIX 2026-01-19: Use getJobWithCleanup to auto-fail stuck jobs (>10 min processing)
        const job = await jobQueue.getJobWithCleanup(jobId, 10);

        if (!job) {
            return NextResponse.json({
                success: false,
                error: 'Job not found'
            }, { status: 404 });
        }

        // Return status for polling
        return NextResponse.json({
            success: true,
            job: {
                id: job.id,
                status: job.status,
                progress: job.progress,
                currentStep: job.current_step,

                // Only include result when completed
                ...(job.status === 'completed' && {
                    result: {
                        content: job.output_content,
                        files: job.files,
                        metadata: job.metadata
                    }
                }),

                // Include error if failed
                ...(job.status === 'failed' && {
                    error: job.error_message
                }),

                // Timing info
                createdAt: job.created_at,
                startedAt: job.started_at,
                completedAt: job.completed_at
            }
        });

    } catch (error) {
        console.error('Status API Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
