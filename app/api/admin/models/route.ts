/**
 * Admin Models API
 * GET /api/admin/models - List all models
 * POST /api/admin/models - Create new model
 * PUT /api/admin/models/:id - Update model
 * DELETE /api/admin/models/:id - Delete model
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

// GET: List all models
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: models, error } = await supabase
            .from('llm_models')
            .select('*')
            .order('tier_required', { ascending: true })
            .order('priority', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, models });
    } catch (error) {
        console.error('[Admin Models GET]', error);
        return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}

// POST: Create new model
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { model_id, display_name, provider, model_type, tier_required, cost_per_request, priority } = body;

        if (!model_id || !display_name) {
            return NextResponse.json({ error: 'model_id and display_name required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('llm_models')
            .insert({
                model_id,
                display_name,
                provider: provider || 'pollinations',
                model_type: model_type || 'text',
                tier_required: tier_required || 'free',
                cost_per_request: cost_per_request || 0,
                priority: priority || 0,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, model: data });
    } catch (error) {
        console.error('[Admin Models POST]', error);
        return NextResponse.json({ error: 'Failed to create model' }, { status: 500 });
    }
}

// PUT: Update model
export async function PUT(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { model_id, ...updates } = body;

        if (!model_id) {
            return NextResponse.json({ error: 'model_id required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('llm_models')
            .update(updates)
            .eq('model_id', model_id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, model: data });
    } catch (error) {
        console.error('[Admin Models PUT]', error);
        return NextResponse.json({ error: 'Failed to update model' }, { status: 500 });
    }
}

// DELETE: Delete model
export async function DELETE(request: NextRequest) {
    const supabase = await createClient();

    if (!await isAdmin(supabase)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const model_id = searchParams.get('model_id');

        if (!model_id) {
            return NextResponse.json({ error: 'model_id required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('llm_models')
            .delete()
            .eq('model_id', model_id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Admin Models DELETE]', error);
        return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
    }
}
