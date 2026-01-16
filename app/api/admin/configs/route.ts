/**
 * Admin App Configs API
 * GET /api/admin/configs - List all app configs
 * PUT /api/admin/configs - Update config
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

// GET: List all configs
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: configs, error } = await supabase
            .from('app_configs')
            .select('*')
            .order('config_key');

        if (error) throw error;

        return NextResponse.json({ success: true, configs });
    } catch (error) {
        console.error('[Admin Configs GET]', error);
        return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 });
    }
}

// PUT: Update config
export async function PUT(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, config_key, config_value, description } = body;

        let query = supabase.from('app_configs').update({
            config_value,
            description,
            updated_at: new Date().toISOString()
        });

        if (id) {
            query = query.eq('id', id);
        } else if (config_key) {
            query = query.eq('config_key', config_key);
        } else {
            return NextResponse.json({ error: 'id or config_key required' }, { status: 400 });
        }

        const { data, error } = await query.select().single();

        if (error) throw error;

        return NextResponse.json({ success: true, config: data });
    } catch (error) {
        console.error('[Admin Configs PUT]', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}

// POST: Create new config
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { config_key, config_value, description } = body;

        if (!config_key) {
            return NextResponse.json({ error: 'config_key required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('app_configs')
            .insert({
                config_key,
                config_value: config_value || {},
                description: description || '',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, config: data });
    } catch (error) {
        console.error('[Admin Configs POST]', error);
        return NextResponse.json({ error: 'Failed to create config' }, { status: 500 });
    }
}
