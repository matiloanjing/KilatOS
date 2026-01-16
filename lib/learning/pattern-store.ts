/**
 * Pattern Store
 * Stores and retrieves successful patterns for AI optimization
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

export interface ProvenPattern {
    id: string;
    agent_type: string;
    task_type: string;
    pattern_name: string;
    pattern_data: Record<string, any>;
    success_rate: number;
    usage_count: number;
    avg_cost: number;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// Pattern Store Functions
// ============================================================================

/**
 * Save a proven pattern
 */
export async function savePattern(
    agentType: string,
    taskType: string,
    patternName: string,
    patternData: Record<string, any>,
    successRate: number,
    avgCost: number
): Promise<string | null> {
    try {
        // Use UPSERT to handle race conditions atomically
        // This avoids the infinite recursion issue with the previous approach
        const { data, error } = await supabase
            .from('proven_patterns')
            .upsert({
                agent_type: agentType,
                task_type: taskType,
                pattern_name: patternName,
                pattern_content: JSON.stringify(patternData),
                success_rate: successRate,
                usage_count: 1,
                avg_cost: avgCost,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'agent_type,pattern_name,version', // Match unique constraint
                ignoreDuplicates: false // Actually update on conflict
            })
            .select('id')
            .single();

        if (error) {
            // If upsert fails, log and return null (non-critical)
            console.warn(`[PatternStore] Failed to save/update pattern ${patternName}:`, error.message);
            return null;
        }

        return data?.id || null;
    } catch (error) {
        console.error('[PatternStore] Failed to save pattern:', error);
        return null;
    }
}

/**
 * Get top patterns for an agent
 */
export async function getTopPatterns(
    agentType: string,
    limit: number = 5
): Promise<ProvenPattern[]> {
    try {
        const { data, error } = await supabase
            .from('proven_patterns')
            .select('*')
            .eq('agent_type', agentType)
            .gte('success_rate', 0.7)
            .order('success_rate', { ascending: false })
            .order('usage_count', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[PatternStore] Failed to get patterns:', error);
        return [];
    }
}

/**
 * Get pattern by type
 */
export async function getPatternByType(
    agentType: string,
    taskType: string
): Promise<ProvenPattern | null> {
    try {
        const { data, error } = await supabase
            .from('proven_patterns')
            .select('*')
            .eq('agent_type', agentType)
            .eq('task_type', taskType)
            .order('success_rate', { ascending: false })
            .limit(1)
            .single();

        if (error) return null;
        return data;
    } catch (error) {
        return null;
    }
}

console.log('✅ Pattern Store initialized');
