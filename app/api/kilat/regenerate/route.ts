/**
 * Regenerate Response Tracking API
 * 
 * POST /api/kilat/regenerate
 * - Logs regenerate events for AI training
 * - Tracks which responses users regenerate (indicates low satisfaction)
 * 
 * Copyright © 2026 KilatOS
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const { messageId, sessionId, agentType, reason } = await request.json();

        if (!messageId) {
            return NextResponse.json({
                success: false,
                error: 'messageId is required'
            }, { status: 400 });
        }

        // Log regenerate event
        const { error } = await supabase
            .from('agent_feedback')
            .insert({
                message_id: messageId,
                session_id: sessionId || null,
                agent_type: agentType || 'unknown',
                rating: 2, // Regenerate implies dissatisfaction (low rating)
                feedback: reason || 'User regenerated response',
                was_successful: false, // Previous response was not satisfactory
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('❌ Failed to log regenerate event:', error.message);
            return NextResponse.json({
                success: false,
                error: error.message
            }, { status: 500 });
        }

        console.log(`🔄 Regenerate logged: ${messageId} (${agentType})`);

        return NextResponse.json({
            success: true,
            message: 'Regenerate event logged for AI training'
        });

    } catch (error) {
        console.error('❌ Regenerate API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal error'
        }, { status: 500 });
    }
}
