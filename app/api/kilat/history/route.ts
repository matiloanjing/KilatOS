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
        // FALLBACK: Recover from job_queue if assistant message is missing
        // This handles cases where addToImmediate silently fails in async route
        // =====================================================================
        const hasAssistantMessage = messages.some((m: any) => m.role === 'assistant');

        if (!hasAssistantMessage && messages.length > 0) {
            console.log('[History API] ⚠️ No assistant messages found - checking job_queue fallback');

            // Get completed jobs for this session
            const { data: jobs } = await supabase
                .from('job_queue')
                .select('id, output_content, completed_at, agent_type')
                .eq('session_id', sessionId)
                .eq('status', 'completed')
                .order('completed_at', { ascending: true });

            if (jobs && jobs.length > 0) {
                console.log(`[History API] 📦 Found ${jobs.length} completed jobs in fallback`);

                // Add all completed job outputs as assistant messages
                for (const job of jobs) {
                    if (job.output_content) {
                        messages.push({
                            id: `job_${job.id}`,
                            role: 'assistant',
                            content: job.output_content,
                            timestamp: job.completed_at,
                            agent: job.agent_type || 'general',
                            type: 'text',
                            from_fallback: true  // Mark as recovered from fallback
                        });
                    }
                }

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

