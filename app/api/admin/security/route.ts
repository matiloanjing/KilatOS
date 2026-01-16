/**
 * Admin Security API
 * GET /api/admin/security - Get security alerts and audit summary
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

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get security alerts (last 7 days)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const { data: alerts, error: alertsError } = await supabase
            .from('audit_results')
            .select('*')
            .in('severity', ['warning', 'error', 'critical'])
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(50);

        // Get audit summary
        const { data: summary } = await supabase
            .from('audit_results')
            .select('event_type, severity')
            .gte('created_at', startDate.toISOString());

        const byType: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};

        (summary || []).forEach((event: { event_type: string; severity: string }) => {
            byType[event.event_type] = (byType[event.event_type] || 0) + 1;
            bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
        });

        return NextResponse.json({
            success: true,
            alerts: alerts || [],
            summary: {
                totalEvents: summary?.length || 0,
                byType,
                bySeverity,
            },
        });

    } catch (error) {
        console.error('[Admin Security GET]', error);
        return NextResponse.json({ error: 'Failed to fetch security data' }, { status: 500 });
    }
}
