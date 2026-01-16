/**
 * Session Manager
 * Handles CRUD operations for sessions, messages, and agent states
 * Copyright © 2025 KilatCode Studio
 */

import { supabaseAdmin } from './supabase';
import type { Database } from './types';

type Session = Database['public']['Tables']['sessions']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type AgentState = Database['public']['Tables']['agent_states']['Row'];

export interface CreateSessionParams {
    agent_type: string;
    kb_name?: string;
    user_id?: string;
    metadata?: Record<string, any>;
}

export interface SessionWithStats extends Session {
    message_count?: number;
    agent_step_count?: number;
    latest_step?: number;
}

/**
 * Create a new session
 */
export async function createSession(params: CreateSessionParams): Promise<Session> {
    const { data, error } = await supabaseAdmin
        .from('sessions')
        .insert({
            agent_type: params.agent_type,
            kb_name: params.kb_name,
            user_id: params.user_id,
            metadata: params.metadata || {},
            status: 'active',
        } as any)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create session: ${error.message}`);
    }

    return data;
}

/**
 * Get session by ID
 */
export async function getSession(session_id: string): Promise<Session | null> {
    const { data, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('id', session_id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Failed to get session: ${error.message}`);
    }

    return data;
}

/**
 * Get session with statistics
 */
export async function getSessionWithStats(session_id: string): Promise<SessionWithStats | null> {
    const session = await getSession(session_id);
    if (!session) return null;

    const { data: stats } = await supabaseAdmin.rpc('get_session_stats', {
        session_uuid: session_id,
    } as any);

    if (!stats || (Array.isArray(stats as any) && (stats as any).length === 0)) {
        return session as SessionWithStats;
    }

    const statsArray = Array.isArray(stats) ? stats : [stats];

    return {
        ...session,
        ...(statsArray[0] as any),
    };
}

/**
 * Update session
 */
export async function updateSession(
    session_id: string,
    updates: Partial<Session>
): Promise<Session> {
    const { data, error } = await (supabaseAdmin
        .from('sessions') as any)
        .update(updates)
        .eq('id', session_id)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update session: ${error.message}`);
    }

    return data;
}

/**
 * Delete session (cascades to messages and agent_states)
 */
export async function deleteSession(session_id: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('sessions')
        .delete()
        .eq('id', session_id);

    if (error) {
        throw new Error(`Failed to delete session: ${error.message}`);
    }
}

/**
 * List sessions for a user
 */
export async function listSessions(user_id?: string, limit = 50): Promise<Session[]> {
    let query = supabaseAdmin
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (user_id) {
        query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to list sessions: ${error.message}`);
    }

    return data || [];
}

/**
 * Add message to session
 */
export async function addMessage(
    session_id: string,
    role: 'system' | 'user' | 'assistant' | 'tool',
    content: string,
    metadata?: Record<string, any>
): Promise<Message> {
    const { data, error } = await supabaseAdmin
        .from('messages')
        .insert({
            session_id,
            role,
            content,
            metadata: metadata || {},
        } as any)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to add message: ${error.message}`);
    }

    return data;
}

/**
 * Get session messages
 */
export async function getSessionMessages(session_id: string): Promise<Message[]> {
    const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });

    if (error) {
        throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data || [];
}

/**
 * Save agent state
 */
export async function saveAgentState(
    session_id: string,
    step_number: number,
    step_type: string,
    state_data: Record<string, any>,
    citations?: any[]
): Promise<AgentState> {
    const { data, error } = await supabaseAdmin
        .from('agent_states')
        .upsert({
            session_id,
            step_number,
            step_type,
            state_data,
            citations: citations || [],
        } as any)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save agent state: ${error.message}`);
    }

    return data;
}

/**
 * Load agent state for a specific step
 */
export async function loadAgentState(
    session_id: string,
    step_number?: number
): Promise<AgentState | null> {
    let query = supabaseAdmin
        .from('agent_states')
        .select('*')
        .eq('session_id', session_id);

    if (step_number !== undefined) {
        query = query.eq('step_number', step_number);
    } else {
        // Get latest step
        query = query.order('step_number', { ascending: false }).limit(1);
    }

    const { data, error } = await query.single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Failed to load agent state: ${error.message}`);
    }

    return data;
}

/**
 * Get all agent states for a session
 */
export async function getAgentStates(session_id: string): Promise<AgentState[]> {
    const { data, error } = await supabaseAdmin
        .from('agent_states')
        .select('*')
        .eq('session_id', session_id)
        .order('step_number', { ascending: true });

    if (error) {
        throw new Error(`Failed to get agent states: ${error.message}`);
    }

    return data || [];
}

/**
 * Get latest step number for a session
 */
export async function getLatestStepNumber(session_id: string): Promise<number> {
    const state = await loadAgentState(session_id);
    return state?.step_number || 0;
}

/**
 * Mark session as completed
 */
export async function completeSession(session_id: string): Promise<Session> {
    return updateSession(session_id, { status: 'completed' });
}

/**
 * Mark session as failed
 */
export async function failSession(
    session_id: string,
    error_message?: string
): Promise<Session> {
    return updateSession(session_id, {
        status: 'failed',
        metadata: { error: error_message },
    });
}
