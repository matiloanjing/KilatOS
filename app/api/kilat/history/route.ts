import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

/**
 * GET /api/kilat/history
 * Retrieves conversation history for a specific session ID.
 * 
 * FIX: Directly query agent_states with step_type='context_message'
 * instead of using loadSession() which requires a parent 'sessions' record.
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

        if (!data || data.length === 0) {
            console.log('[History API] No messages found for session:', sessionId);
            return NextResponse.json({ success: true, messages: [] });
        }

        console.log(`[History API] Found ${data.length} messages for session:`, sessionId);

        // Map database records to Frontend Message interface
        const messages = data.map((item: any, index: number) => ({
            id: `hist_${sessionId}_${index}`,
            role: item.state_data?.role || 'user',
            content: item.state_data?.content || '',
            timestamp: item.state_data?.timestamp || item.created_at,
            // Restore metadata if available
            files: item.state_data?.metadata?.files,
            agent: item.state_data?.metadata?.agent,
            type: item.state_data?.metadata?.type || 'text',
        }));

        return NextResponse.json({ success: true, messages });
    } catch (error) {
        console.error('[History API] Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load history' }, { status: 500 });
    }
}
