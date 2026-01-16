/**
 * Session Analytics
 * Tracks user engagement and session behavior
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Types
// ============================================================================

export interface SessionAnalytics {
    id: string;
    user_id: string;
    session_id: string;
    start_time: string;
    end_time?: string;
    duration_seconds?: number;
    page_views: number;
    actions: string[]; // e.g., ['chat', 'code_gen', 'image_gen']
    device_type?: string;
    referrer?: string;
    created_at: string;
}

// ============================================================================
// Session Analytics Functions
// ============================================================================

/**
 * Track session start
 */
export async function trackSessionStart(
    userId: string,
    sessionId: string,
    metadata?: {
        deviceType?: string;
        referrer?: string;
    }
): Promise<string | null> {
    try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        const safeUserId = isUuid ? userId : null; // Use null for 'anon' or invalid IDs

        const { data, error } = await supabase
            .from('user_session_analytics')
            .insert({
                user_id: safeUserId,
                session_id: sessionId,
                started_at: new Date().toISOString(), // FIX: DB column is 'started_at', not 'start_time'
                page_views: 1,
                actions: [],
                device_type: metadata?.deviceType,
                referrer: metadata?.referrer
            })
            .select('id')
            .single();

        if (error) throw error;
        console.log(`📊 [SessionAnalytics] Session started: ${sessionId}`);
        return data?.id || null;
    } catch (error) {
        console.error('[SessionAnalytics] Failed to track session start:', error);
        return null;
    }
}

/**
 * Track an action within a session
 */
export async function trackAction(
    sessionId: string,
    action: string
): Promise<boolean> {
    try {
        // Get current session
        const { data: session } = await supabase
            .from('user_session_analytics')
            .select('id, actions, page_views')
            .eq('session_id', sessionId)
            .single();

        if (!session) return false;

        const actions = [...(session.actions || []), action];

        const { error } = await supabase
            .from('user_session_analytics')
            .update({
                actions,
                page_views: session.page_views + 1
            })
            .eq('id', session.id);

        return !error;
    } catch (error) {
        console.error('[SessionAnalytics] Failed to track action:', error);
        return false;
    }
}

/**
 * Track session end
 */
export async function trackSessionEnd(sessionId: string): Promise<boolean> {
    try {
        const { data: session } = await supabase
            .from('user_session_analytics')
            .select('id, started_at') // FIX: DB column is 'started_at'
            .eq('session_id', sessionId)
            .single();

        if (!session) return false;

        const endTime = new Date();
        const startTime = new Date(session.started_at);
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        const { error } = await supabase
            .from('user_session_analytics')
            .update({
                ended_at: endTime.toISOString(), // FIX: DB column is 'ended_at'
                duration_seconds: durationSeconds
            })
            .eq('id', session.id);

        return !error;
    } catch (error) {
        console.error('[SessionAnalytics] Failed to track session end:', error);
        return false;
    }
}

/**
 * Get user engagement stats
 */
export async function getUserEngagement(
    userId: string,
    days: number = 7
): Promise<{
    totalSessions: number;
    avgDuration: number;
    totalActions: number;
    topActions: Array<{ action: string; count: number }>;
}> {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('user_session_analytics')
            .select('duration_seconds, actions')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString());

        if (error || !data) {
            return { totalSessions: 0, avgDuration: 0, totalActions: 0, topActions: [] };
        }

        const totalSessions = data.length;
        const totalDuration = data.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
        const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

        // Count actions
        const actionCounts: Record<string, number> = {};
        for (const session of data) {
            for (const action of (session.actions || [])) {
                actionCounts[action] = (actionCounts[action] || 0) + 1;
            }
        }

        const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0);
        const topActions = Object.entries(actionCounts)
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return { totalSessions, avgDuration, totalActions, topActions };
    } catch (error) {
        console.error('[SessionAnalytics] Failed to get engagement:', error);
        return { totalSessions: 0, avgDuration: 0, totalActions: 0, topActions: [] };
    }
}

console.log('✅ Session Analytics initialized');
