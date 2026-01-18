import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

/**
 * GET /api/kilat/history
 * Retrieves conversation history for a specific session ID.
 * 
 * FIX: Directly query agent_states with step_type='context_message'
 * FALLBACK (2026-01-18): If assistant message missing from agent_states,
 * recover from job_queue to handle silent save failures.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 });
    }

    try {
        const supabase = await createClient();

        // Query DIRECTLY from agent_states where messages are actually stored
        const { data, error } = await supabase
            .from('agent_states')
            .select('*')
            .eq('session_id', sessionId)
            .eq('step_type', 'context_message')
            .order('step_number', { ascending: true });

        if (error) {
            console.error('[History API] Supabase error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Map database records to Frontend Message interface
        const messages: any[] = (data || []).map((item: any, index: number) => ({
            id: `hist_${sessionId}_${index}`,
            role: item.state_data?.role || 'user',
            content: item.state_data?.content || '',
            timestamp: item.state_data?.timestamp || item.created_at,
            // Restore metadata if available
            files: item.state_data?.metadata?.files,
            agent: item.state_data?.metadata?.agent,
            type: item.state_data?.metadata?.type || 'text',
        }));

        // =====================================================================
        // ALWAYS MERGE FROM JOB_QUEUE
        // Agent_states may be missing entries due to addToImmediate failures
        // This ensures all completed jobs are shown regardless of save issues
        // =====================================================================
        const { data: jobs } = await supabase
            .from('job_queue')
            .select('id, output_content, completed_at, agent_type')
            .eq('session_id', sessionId)
            .eq('status', 'completed')
            .order('completed_at', { ascending: true });

        if (jobs && jobs.length > 0) {
            // Get existing message IDs to avoid duplicates
            const existingJobIds = new Set(
                messages
                    .filter((m: any) => m.id?.startsWith('job_'))
                    .map((m: any) => m.id)
            );

            // Get existing content hashes to detect duplicates by content
            const existingContents = new Set(
                messages
                    .filter((m: any) => m.role === 'assistant')
                    .map((m: any) => m.content?.substring(0, 100))
            );

            let addedCount = 0;
            for (const job of jobs) {
                const jobId = `job_${job.id}`;
                const contentPreview = job.output_content?.substring(0, 100);

                // Skip if already added or content already exists
                if (existingJobIds.has(jobId) || existingContents.has(contentPreview)) {
                    continue;
                }

                if (job.output_content) {
                    messages.push({
                        id: jobId,
                        role: 'assistant',
                        content: job.output_content,
                        timestamp: job.completed_at,
                        agent: job.agent_type || 'general',
                        type: 'text',
                        from_fallback: true
                    });
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                console.log(`[History API] 📦 Recovered ${addedCount} messages from job_queue`);
                // Re-sort messages by timestamp
                messages.sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
            }
        }

        if (messages.length === 0) {
            console.log('[History API] No messages found for session:', sessionId);
            return NextResponse.json({ success: true, messages: [] });
        }

        console.log(`[History API] Found ${messages.length} messages for session:`, sessionId);

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        console.error('[History API] Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load history' }, { status: 500 });
    }
}

