/**
 * Admin Tier Limits API
 * GET /api/admin/tiers - List all tier limits
 * PUT /api/admin/tiers - Update tier limit
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

// GET: List all tier limits
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: tierLimits, error } = await supabase
            .from('tier_limits')
            .select('*')
            .order('tier', { ascending: true })
            .order('agent_id', { ascending: true });

        if (error) throw error;

        // Group by tier for easier UI
        const groupedLimits = tierLimits?.reduce((acc: any, limit: any) => {
            if (!acc[limit.tier]) {
                acc[limit.tier] = [];
            }
            acc[limit.tier].push(limit);
            return acc;
        }, {});

        return NextResponse.json({ success: true, tierLimits, grouped: groupedLimits });
    } catch (error) {
        console.error('[Admin Tiers GET]', error);
        return NextResponse.json({ error: 'Failed to fetch tier limits' }, { status: 500 });
    }
}

// PUT: Update tier limit
export async function PUT(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, tier, agent_id, limit_daily, limit_monthly, max_daily_cost_usd, enabled } = body;

        // Can update by id or by tier+agent_id
        let query = supabase.from('tier_limits').update({
            limit_daily,
            limit_monthly,
            max_daily_cost_usd,
            enabled,
            updated_at: new Date().toISOString()
        });

        if (id) {
            query = query.eq('id', id);
        } else if (tier && agent_id) {
            query = query.eq('tier', tier).eq('agent_id', agent_id);
        } else {
            return NextResponse.json({ error: 'id or tier+agent_id required' }, { status: 400 });
        }

        const { data, error } = await query.select().single();

        if (error) throw error;

        return NextResponse.json({ success: true, tierLimit: data });
    } catch (error) {
        console.error('[Admin Tiers PUT]', error);
        return NextResponse.json({ error: 'Failed to update tier limit' }, { status: 500 });
    }
}
