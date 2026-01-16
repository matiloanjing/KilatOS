import { NextResponse } from 'next/server';
import { runRLHFProcessing } from '@/lib/learning/rlhf';

/**
 * Cron Job: RLHF Processing
 * 
 * Analyzes user feedback to generate prompt improvements.
 * Schedule: Daily at 4am UTC (11am WIB)
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/rlhf-process",
 *     "schedule": "0 4 * * *"
 *   }]
 * }
 */

const CRON_SECRET = process.env.CRON_SECRET;

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧠 [Cron] Starting RLHF processing...');

    try {
        const result = await runRLHFProcessing();

        console.log(`✅ [Cron] RLHF completed: ${result.patterns_found} patterns, ${result.adjustments_saved} adjustments`);

        return NextResponse.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [Cron] RLHF failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
