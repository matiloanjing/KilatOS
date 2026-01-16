/**
 * Code History Manager
 * Stores and retrieves generated code history
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

export interface GeneratedCode {
    id: string;
    session_id: string;
    user_id?: string;
    agent_type: string;
    language: string;
    filename?: string;
    code: string;
    prompt: string;
    model_used: string;
    tokens_used?: number;
    metadata?: Record<string, any>;
    created_at: string;
}

export interface CodeIteration {
    id: string;
    generated_code_id: string;
    version: number;
    code: string;
    diff?: string;
    change_reason?: string;
    created_at: string;
}

// ============================================================================
// Code History Functions
// ============================================================================

/**
 * Save generated code
 */
export async function saveGeneratedCode(
    sessionId: string,
    code: string,
    options: {
        userId?: string;
        agentType?: string;
        language?: string;
        filename?: string;
        prompt?: string;
        modelUsed?: string;
        tokensUsed?: number;
        metadata?: Record<string, any>;
    }
): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('generated_code')
            .insert({
                session_id: sessionId,
                user_id: options.userId,
                agent_type: options.agentType || 'codegen',
                language: options.language || 'typescript',
                filename: options.filename,
                code,
                prompt: options.prompt || '',
                model_used: options.modelUsed || 'unknown',
                tokens_used: options.tokensUsed,
                metadata: options.metadata
            })
            .select('id')
            .single();

        if (error) throw error;
        console.log(`💾 [CodeHistory] Saved code: ${options.filename || 'unnamed'}`);
        return data?.id || null;
    } catch (error) {
        console.error('[CodeHistory] Failed to save code:', error);
        return null;
    }
}

/**
 * Get code history for a session
 */
export async function getCodeHistory(
    sessionId: string,
    limit: number = 20
): Promise<GeneratedCode[]> {
    try {
        const { data, error } = await supabase
            .from('generated_code')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[CodeHistory] Failed to get history:', error);
        return [];
    }
}

/**
 * Get user's code history (across all sessions)
 */
export async function getUserCodeHistory(
    userId: string,
    limit: number = 50
): Promise<GeneratedCode[]> {
    try {
        const { data, error } = await supabase
            .from('generated_code')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[CodeHistory] Failed to get user history:', error);
        return [];
    }
}

/**
 * Save a code iteration (for versioning)
 */
export async function saveCodeIteration(
    generatedCodeId: string,
    newCode: string,
    changeReason?: string
): Promise<string | null> {
    try {
        // Get current version number
        const { data: existing } = await supabase
            .from('code_iterations')
            .select('version')
            .eq('generated_code_id', generatedCodeId)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        const version = (existing?.version || 0) + 1;

        // Get original code for diff
        const { data: original } = await supabase
            .from('generated_code')
            .select('code')
            .eq('id', generatedCodeId)
            .single();

        // Simple diff (line count change)
        const oldLines = (original?.code || '').split('\n').length;
        const newLines = newCode.split('\n').length;
        const diff = `Lines: ${oldLines} → ${newLines}`;

        const { data, error } = await supabase
            .from('code_iterations')
            .insert({
                generated_code_id: generatedCodeId,
                version,
                code: newCode,
                diff,
                change_reason: changeReason
            })
            .select('id')
            .single();

        if (error) throw error;
        console.log(`📝 [CodeHistory] Saved iteration v${version}`);
        return data?.id || null;
    } catch (error) {
        console.error('[CodeHistory] Failed to save iteration:', error);
        return null;
    }
}

/**
 * Get iterations for a generated code
 */
export async function getCodeIterations(
    generatedCodeId: string
): Promise<CodeIteration[]> {
    try {
        const { data, error } = await supabase
            .from('code_iterations')
            .select('*')
            .eq('generated_code_id', generatedCodeId)
            .order('version', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[CodeHistory] Failed to get iterations:', error);
        return [];
    }
}

console.log('✅ Code History Manager initialized');
