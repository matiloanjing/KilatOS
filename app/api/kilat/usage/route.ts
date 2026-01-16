/**
 * Usage API
 * GET /api/kilat/usage?userId=xxx
 * Returns daily usage counts and limits for a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    try {
        // Get user tier
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('tier')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        const tier = subscription?.tier || 'free';

        // Get today's usage counts
        const { data: usageData } = await supabase
            .from('usage_quotas')
            .select('agent_id, count')
            .eq('user_id', userId)
            .eq('date', today);

        // Get tier limits
        const { data: tierLimits } = await supabase
            .from('tier_limits')
            .select('agent_id, limit_daily')
            .eq('tier', tier);

        // Calculate code and image usage
        const codeAgents = ['code', 'solve', 'question', 'guide', 'idea', 'write', 'research'];
        const imageAgents = ['image'];

        let codeUsed = 0;
        let imageUsed = 0;
        let codeLimit = 20;
        let imageLimit = 5;

        // Sum up usage
        usageData?.forEach((u: any) => {
            if (codeAgents.includes(u.agent_id)) {
                codeUsed += u.count || 0;
            }
            if (imageAgents.includes(u.agent_id)) {
                imageUsed += u.count || 0;
            }
        });

        // Get limits from tier_limits
        tierLimits?.forEach((t: any) => {
            if (t.agent_id === 'code') {
                codeLimit = t.limit_daily || codeLimit;
            }
            if (t.agent_id === 'image') {
                imageLimit = t.limit_daily || imageLimit;
            }
        });

        return NextResponse.json({
            tier,
            codeUsed,
            codeLimit,
            imageUsed,
            imageLimit,
            date: today,
        });

    } catch (error) {
        console.error('[Usage API] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
