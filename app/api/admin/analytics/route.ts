/**
 * Admin Analytics API
 * GET /api/admin/analytics
 * Returns dashboard analytics from admin views
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

import { getUserRole } from '@/lib/auth/user-tier';

// Check if user is admin
async function isAdmin(supabase: any): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Hardcoded whitelist (Superadmin override)
    if (user.email === 'matiloanjing69@gmail.com') return true;

    try {
        // Use Service Role via getUserRole to bypass RLS recursion
        const role = await getUserRole(user.id);
        return role === 'admin';
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const supabase = await createClient();

    // Admin check
    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get daily stats (last 30 days)
        const { data: dailyStats } = await supabase
            .from('admin_daily_stats')
            .select('*')
            .order('date', { ascending: false })
            .limit(30);

        // Get model stats
        const { data: modelStats } = await supabase
            .from('admin_model_stats')
            .select('*')
            .limit(20);

        // Get tier breakdown
        const { data: tierBreakdown } = await supabase
            .from('admin_tier_breakdown')
            .select('*');

        // Get agent stats
        const { data: agentStats } = await supabase
            .from('admin_agent_stats')
            .select('*');

        // Calculate summary
        const today = dailyStats?.[0] || {};
        const summary = {
            todayRequests: today.total_requests || 0,
            todayCost: parseFloat(today.total_cost_usd || 0),
            todayUsers: today.unique_users || 0,
            totalUsers: tierBreakdown?.reduce((acc: number, t: any) => acc + t.user_count, 0) || 0,
            totalRevenue: 0, // Calculate from subscriptions
        };

        return NextResponse.json({
            success: true,
            summary,
            dailyStats,
            modelStats,
            tierBreakdown,
            agentStats
        });

    } catch (error) {
        console.error('[Admin Analytics] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
