import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { count: v1Count } = await supabase.from('embeddings').select('*', { count: 'exact', head: true });
    const { count: v2Count } = await supabase.from('embeddings_v2').select('*', { count: 'exact', head: true });

    return NextResponse.json({
        v1_count: v1Count,
        v2_count: v2Count
    });
}
