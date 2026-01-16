/**
 * Session Details API
 * GET /api/kilat/sessions/[id]
 * - Returns session metadata and message history
 * - Enforces correct user usage
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    // Next.js 14: params is now a Promise, must await
    const { id: sessionId } = await params;

    console.log('[Session API] Fetching session:', sessionId);

    // Strict Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Get Session (verify ownership)
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }

        // 2. Get Messages (agent_states)
        // We look for 'context_message' steps which represent chat history
        const { data: messages, error: msgError } = await supabase
            .from('agent_states')
            .select('*')
            .eq('session_id', sessionId)
            .eq('step_type', 'context_message') // FIX: Only fetch chat messages
            .order('created_at', { ascending: true });

        if (msgError) {
            console.error('Failed to fetch messages:', msgError);
            return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
        }

        // Map generic agent_states to Message format
        // Database column is 'state_data', not 'step_data'
        const formattedMessages = messages.map(row => {
            const data = row.state_data || {};  // FIX: was step_data, should be state_data

            // Heuristic to determine if it's a message row
            // If step_type is 'context_message', trust it.
            // Or if data has role/content.
            if (row.step_type === 'context_message' || (data.role && data.content)) {
                return {
                    id: row.id,
                    role: data.role || 'assistant', // Default to assistant if missing
                    content: data.content || '',
                    timestamp: row.created_at,
                    agent: data.agent,
                    status: 'complete'
                };
            }
            return null;
        }).filter(Boolean);

        // Extract generated files from session context if available
        const generatedFiles = (session.context as any)?.files || null;

        return NextResponse.json({
            success: true,
            session,
            messages: formattedMessages,
            files: generatedFiles  // Return generated files for reload
        });

    } catch (error) {
        console.error('[Session Details] Exception:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
