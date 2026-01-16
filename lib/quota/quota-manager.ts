/**
 * Quota Manager
 * Tracks and enforces user usage quotas using usage_quotas table
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

export interface UsageQuota {
    id: string;
    user_id: string;
    agent_id: string;
    date: string; // YYYY-MM-DD
    count: number;
    created_at: string;
    updated_at: string;
}

export interface QuotaStatus {
    used: number;
    limit: number;
    remaining: number;
    isExceeded: boolean;
    resetAt: Date;
}

// ============================================================================
// Quota Manager Class
// ============================================================================

class QuotaManager {

    /**
     * Check if user has quota remaining for an agent
     */
    /**
     * Check if user has quota remaining for an agent
     */
    async checkQuota(
        userId: string,
        agentId: string = 'default'
    ): Promise<QuotaStatus> {
        const today = this.getTodayDate();

        // 1. Get current usage
        const { data: usageData, error: usageError } = await supabase
            .from('usage_quotas')
            .select('count')
            .eq('user_id', userId)
            .eq('agent_id', agentId)
            .eq('date', today)
            .single();

        const used = usageData?.count || 0;

        // 2. Get user tier
        const { getUserTier } = await import('@/lib/auth/user-tier');
        const tier = await getUserTier(userId);

        // 3. Get specific limit for this agent & tier from DB
        const { data: limitData, error: limitError } = await supabase
            .from('tier_limits')
            .select('limit_daily')
            .eq('tier', tier)
            .eq('agent_id', this.mapAgentToCategory(agentId))
            .single();

        // Fallback limits if DB query fails or row missing
        // Free: 20 code / 5 image
        // Paid: 100 code / 20 image (legacy name 'pro' handled via tier mapping if needed)
        // Enterprise: 500 code / 50 image
        let limit = 20; // Default safety fallback

        if (limitData?.limit_daily) {
            limit = limitData.limit_daily;
        } else {
            // Hardcoded fallback logic matching spec
            const category = this.mapAgentToCategory(agentId);
            if (tier === 'free') limit = category === 'image' ? 5 : 20;
            else if (tier === 'pro') limit = category === 'image' ? 20 : 100;
            else if (tier === 'enterprise') limit = category === 'image' ? 50 : 500;
        }

        const remaining = Math.max(0, limit - used);

        return {
            used,
            limit,
            remaining,
            isExceeded: used >= limit,
            resetAt: this.getNextMidnight()
        };
    }

    /**
     * Map specific agent IDs to broad categories (code vs image)
     * agent_id in usage_quotas can be 'solve', 'write' etc.
     * agent_id in tier_limits is usually 'code' or 'image'
     */
    private mapAgentToCategory(agentId: string): string {
        if (['image', 'flux', 'ideagen'].includes(agentId)) return 'image';
        return 'code'; // Default to code limit for solve, write, research, etc.
    }

    /**
     * Increment usage count for a user
     */
    async incrementUsage(
        userId: string,
        agentId: string = 'default',
        amount: number = 1
    ): Promise<boolean> {
        // Skip DB operations for anonymous users (prevents UUID format error)
        if (!userId || userId === 'anon' || userId === 'anonymous' || userId.length < 10) {
            console.log(`📊 [QuotaManager] Anonymous user - skipping DB tracking`);
            return true; // Allow but don't track
        }

        const today = this.getTodayDate();

        try {
            // Try to update existing record
            const { data: existing } = await supabase
                .from('usage_quotas')
                .select('id, count')
                .eq('user_id', userId)
                .eq('agent_id', agentId)
                .eq('date', today)
                .single();

            if (existing) {
                // Update existing
                const { error } = await supabase
                    .from('usage_quotas')
                    .update({
                        count: existing.count + amount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (error) {
                    console.error('[QuotaManager] Failed to update usage:', error);
                    return false;
                }
            } else {
                // Create new record
                const { error } = await supabase
                    .from('usage_quotas')
                    .insert({
                        user_id: userId,
                        agent_id: agentId,
                        date: today,
                        count: amount
                    });

                if (error) {
                    console.error('[QuotaManager] Failed to insert usage:', error);
                    return false;
                }
            }

            console.log(`📊 [QuotaManager] User ${userId.substring(0, 8)}... used ${amount} for ${agentId}`);
            return true;
        } catch (error) {
            console.error('[QuotaManager] Exception:', error);
            return false;
        }
    }

    /**
     * Get total usage for today
     */
    async getTodayUsage(userId: string): Promise<Record<string, number>> {
        const today = this.getTodayDate();

        const { data, error } = await supabase
            .from('usage_quotas')
            .select('agent_id, count')
            .eq('user_id', userId)
            .eq('date', today);

        if (error || !data) return {};

        return data.reduce((acc, row) => {
            acc[row.agent_id] = row.count;
            return acc;
        }, {} as Record<string, number>);
    }

    /**
     * Get usage history for a user (last N days)
     */
    async getUsageHistory(
        userId: string,
        days: number = 7
    ): Promise<Array<{ date: string; total: number }>> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('usage_quotas')
            .select('date, count')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error || !data) return [];

        // Aggregate by date
        const byDate: Record<string, number> = {};
        for (const row of data) {
            byDate[row.date] = (byDate[row.date] || 0) + row.count;
        }

        return Object.entries(byDate).map(([date, total]) => ({ date, total }));
    }

    /**
     * Reset quota for testing (admin only)
     */
    async resetQuota(userId: string): Promise<boolean> {
        const today = this.getTodayDate();

        const { error } = await supabase
            .from('usage_quotas')
            .delete()
            .eq('user_id', userId)
            .eq('date', today);

        return !error;
    }

    // Helpers
    private getTodayDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    private getNextMidnight(): Date {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const quotaManager = new QuotaManager();

console.log('✅ Quota Manager initialized');
