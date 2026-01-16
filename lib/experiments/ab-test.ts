/**
 * A/B Testing Framework
 * Manages experiments and variant assignment
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

export interface ABExperiment {
    id: string;
    experiment_name: string;
    description: string;
    variants: Record<string, any>; // { control: {...}, variant_a: {...} }
    traffic_split: Record<string, number>; // { control: 50, variant_a: 50 }
    status: 'draft' | 'running' | 'paused' | 'completed';
    start_date: string;
    end_date?: string;
    created_at: string;
}

export interface VariantAssignment {
    experimentId: string;
    variantName: string;
    variantData: Record<string, any>;
}

// Cache for user assignments (session-level)
const assignmentCache: Map<string, Map<string, string>> = new Map();

// ============================================================================
// A/B Testing Functions
// ============================================================================

/**
 * Get all active experiments
 */
export async function getActiveExperiments(): Promise<ABExperiment[]> {
    try {
        const { data, error } = await supabase
            .from('ab_test_experiments')
            .select('*')
            .eq('status', 'running')
            .lte('start_date', new Date().toISOString());

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[ABTest] Failed to get experiments:', error);
        return [];
    }
}

/**
 * Assign user to a variant for an experiment
 * Uses consistent hashing to ensure same user always gets same variant
 */
export async function assignVariant(
    userId: string,
    experimentId: string
): Promise<VariantAssignment | null> {
    try {
        // Check cache first
        const userCache = assignmentCache.get(userId);
        if (userCache?.has(experimentId)) {
            const cachedVariant = userCache.get(experimentId)!;
            const experiment = await getExperiment(experimentId);
            if (experiment) {
                return {
                    experimentId,
                    variantName: cachedVariant,
                    variantData: experiment.variants[cachedVariant] || {}
                };
            }
        }

        // Get experiment
        const experiment = await getExperiment(experimentId);
        if (!experiment || experiment.status !== 'running') return null;

        // Consistent hash for variant assignment
        const hash = simpleHash(userId + experimentId);
        const percentage = hash % 100;

        // Determine variant based on traffic split
        let cumulative = 0;
        let assignedVariant = 'control';

        for (const [variant, split] of Object.entries(experiment.traffic_split)) {
            cumulative += split;
            if (percentage < cumulative) {
                assignedVariant = variant;
                break;
            }
        }

        // Cache assignment
        if (!assignmentCache.has(userId)) {
            assignmentCache.set(userId, new Map());
        }
        assignmentCache.get(userId)!.set(experimentId, assignedVariant);

        return {
            experimentId,
            variantName: assignedVariant,
            variantData: experiment.variants[assignedVariant] || {}
        };
    } catch (error) {
        console.error('[ABTest] Failed to assign variant:', error);
        return null;
    }
}

/**
 * Get a specific experiment
 */
export async function getExperiment(experimentId: string): Promise<ABExperiment | null> {
    try {
        const { data, error } = await supabase
            .from('ab_test_experiments')
            .select('*')
            .eq('id', experimentId)
            .single();

        if (error) return null;
        return data;
    } catch (error) {
        return null;
    }
}

/**
 * Create a new experiment
 */
export async function createExperiment(
    name: string,
    description: string,
    variants: Record<string, any>,
    trafficSplit: Record<string, number>
): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('ab_test_experiments')
            .insert({
                experiment_name: name,
                description,
                variants,
                traffic_split: trafficSplit,
                status: 'draft',
                start_date: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) throw error;
        return data?.id || null;
    } catch (error) {
        console.error('[ABTest] Failed to create experiment:', error);
        return null;
    }
}

/**
 * Update experiment status
 */
export async function updateExperimentStatus(
    experimentId: string,
    status: ABExperiment['status']
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('ab_test_experiments')
            .update({ status })
            .eq('id', experimentId);

        return !error;
    } catch (error) {
        return false;
    }
}

// Simple hash function for consistent variant assignment
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

console.log('✅ A/B Testing Framework initialized');
