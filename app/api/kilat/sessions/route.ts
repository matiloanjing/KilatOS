/**
 * Sessions API - Multi-Chat Management
 * 
 * GET    /api/kilat/sessions           - List user's sessions
 * POST   /api/kilat/sessions           - Create new session
 * DELETE /api/kilat/sessions?id=xxx    - Delete session
 * PATCH  /api/kilat/sessions?id=xxx    - Rename session
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';
import { getUserTier, getTierLimits } from '@/lib/auth/user-tier';

// ============================================================================
// GET - List Sessions
// ============================================================================

// ============================================================================
// GET - List Sessions
// ============================================================================

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    // STRICT AUTH REQUREMENT
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get query params for filtering
        const { searchParams } = new URL(request.url);
        const agentTypeFilter = searchParams.get('agent_type'); // Optional filter

        // Get sessions with message counts
        // Get session limit from user tier
        const userTier = await getUserTier(user.id);
        const tierLimits = getTierLimits(userTier);
        const maxSessions = tierLimits.maxSessions === -1 ? 1000 : tierLimits.maxSessions;

        // Build query
        let query = supabase
            .from('sessions')
            .select(`
                id,
                title,
                created_at,
                updated_at,
                agent_type
            `)
            .eq('user_id', user.id) // Strict filtering
            .order('updated_at', { ascending: false })
            .limit(maxSessions);

        // Apply agent_type filter if specified
        if (agentTypeFilter && agentTypeFilter !== 'all') {
            query = query.eq('agent_type', agentTypeFilter);
        }

        const { data: sessions, error } = await query;

        if (error) {
            console.error('[Sessions API] List error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Get message count for each session
        const sessionsWithCounts = await Promise.all(
            (sessions || []).map(async (session) => {
                const { count } = await supabase
                    .from('agent_states')
                    .select('*', { count: 'exact', head: true })
                    .eq('session_id', session.id)
                    .eq('step_type', 'context_message');

                return {
                    ...session,
                    messageCount: count || 0
                };
            })
        );

        return NextResponse.json({
            success: true,
            sessions: sessionsWithCounts,
            filter: agentTypeFilter || 'all'
        });

    } catch (error) {
        console.error('[Sessions API] Exception:', error);
        return NextResponse.json({ success: false, error: 'Failed to list sessions' }, { status: 500 });
    }
}

// ============================================================================
// POST - Create Session
// ============================================================================

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // STRICT AUTH REQUREMENT
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title = 'New Chat', sessionId, firstMessage } = body;

        // Auto-generate title from first message if available
        let sessionTitle = title;
        if (firstMessage && title === 'New Chat') {
            // Take first 40 chars of message as title
            sessionTitle = firstMessage.substring(0, 40).trim();
            if (firstMessage.length > 40) sessionTitle += '...';
        }

        // Check session limit (from tier config)
        const userTier = await getUserTier(user.id);
        const tierLimits = getTierLimits(userTier);
        const maxSessions = tierLimits.maxSessions;

        const { count } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if ((count || 0) >= maxSessions) {
            return NextResponse.json({
                success: false,
                error: `Maximum ${maxSessions} sessions allowed. Delete old sessions to create new ones.`
            }, { status: 403 });
        }

        // Create new session
        const newSession = {
            id: sessionId || `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: user.id, // Enforce user_id
            title: sessionTitle,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('sessions')
            .insert(newSession)
            .select()
            .single();

        if (error) {
            console.error('[Sessions API] Create error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        console.log('[Sessions API] ✅ Created session:', data.id);

        return NextResponse.json({
            success: true,
            session: data
        });

    } catch (error) {
        console.error('[Sessions API] Exception:', error);
        return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 });
    }
}

// ============================================================================
// DELETE - Delete Session
// ============================================================================

// ============================================================================
// DELETE - Delete Session
// ============================================================================

export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    // STRICT AUTH REQUREMENT
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Delete session strictly for the user
        // Note: Due to RLS, deleting by ID should be safe, but adding user_id filter is safer

        // First delete agent_states (child rows)
        // Ideally handled by ON DELETE CASCADE, but manual for safety
        await supabase
            .from('agent_states')
            .delete()
            .eq('session_id', sessionId); // Policies will handle ownership check

        // Delete session
        const { error, count } = await supabase
            .from('sessions')
            .delete()
            .eq('id', sessionId)
            .eq('user_id', user.id); // Strict ownership

        if (error) {
            console.error('[Sessions API] Delete error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        console.log('[Sessions API] 🗑️ Deleted session:', sessionId);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Sessions API] Exception:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete session' }, { status: 500 });
    }
}

// ============================================================================
// PATCH - Rename Session
// ============================================================================

export async function PATCH(request: NextRequest) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
        return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    // STRICT AUTH REQUREMENT
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title } = body;

        if (!title) {
            return NextResponse.json({ success: false, error: 'Title required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('sessions')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', sessionId)
            .eq('user_id', user.id) // Strict ownership check
            .select()
            .single();

        if (error) {
            console.error('[Sessions API] Update error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        console.log('[Sessions API] ✏️ Renamed session:', sessionId, '->', title);

        return NextResponse.json({
            success: true,
            session: data
        });

    } catch (error) {
        console.error('[Sessions API] Exception:', error);
        return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
    }
}
