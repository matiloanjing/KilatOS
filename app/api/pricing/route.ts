/**
 * Public Pricing API
 * GET /api/pricing
 * Returns tier pricing and limits from database (public endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Get tier limits for code and image agents
        const { data: tierLimits } = await supabase
            .from('tier_limits')
            .select('tier, agent_id, limit_daily, limit_monthly, max_daily_cost_usd')
            .in('agent_id', ['code', 'image'])
            .order('tier');

        // Get app_configs for pricing
        const { data: appConfigs } = await supabase
            .from('app_configs')
            .select('config_key, config_value')
            .eq('config_key', 'tier_pricing')
            .single();

        // Default pricing if not in DB
        const defaultPricing = {
            free: { price: 0, period: 'forever' },
            pro: { price: 29, period: 'month' },
            enterprise: { price: 149, period: 'month' },
        };

        const pricing = appConfigs?.config_value || defaultPricing;

        // Build response
        const tiers = ['free', 'pro', 'enterprise'].map((tier) => {
            const codeLimits = tierLimits?.find(t => t.tier === tier && t.agent_id === 'code');
            const imageLimits = tierLimits?.find(t => t.tier === tier && t.agent_id === 'image');

            return {
                tier,
                name: tier.charAt(0).toUpperCase() + tier.slice(1),
                price: pricing[tier]?.price || 0,
                period: pricing[tier]?.period || 'month',
                limits: {
                    codeDaily: codeLimits?.limit_daily || 0,
                    codeMonthly: codeLimits?.limit_monthly || 0,
                    imageDaily: imageLimits?.limit_daily || 0,
                    imageMonthly: imageLimits?.limit_monthly || 0,
                    maxDailyCost: codeLimits?.max_daily_cost_usd || 0,
                },
                features: tier === 'free' ? [
                    'Basic AI agents',
                    'Community support',
                    'Standard models',
                ] : tier === 'pro' ? [
                    'All AI agents',
                    'Priority support',
                    'Premium models',
                    'RAG search',
                    'Custom knowledge base',
                ] : [
                    'Everything in Pro',
                    'Dedicated support',
                    'Enterprise models',
                    'Team collaboration',
                    'Custom integrations',
                    'SLA guarantee',
                ],
            };
        });

        return NextResponse.json({
            success: true,
            tiers,
            updatedAt: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[Pricing API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
    }
}
