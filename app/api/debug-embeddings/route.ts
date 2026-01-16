import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/auth/server';

/**
 * Debug endpoint to check embeddings data
 */
export async function GET() {
    try {
        const supabaseAdmin = createAdminClient();

        // Get first embeddings from kilat_tutor_kb (new data)
        const { data: kb } = await supabaseAdmin
            .from('knowledge_bases')
            .select('id')
            .eq('name', 'kilat_tutor_kb')
            .single();

        const { data: embeddings, error } = await supabaseAdmin
            .from('embeddings_v2')
            .select('id, kb_id, chunk_text, embedding')
            .eq('kb_id', kb?.id)
            .limit(3);

        if (error) throw error;

        // Check embedding data
        const analysis = embeddings?.map((e: { id: string; kb_id: string; chunk_text: string | null; embedding: number[] | null }) => ({
            id: e.id.substring(0, 8),
            kb_id: e.kb_id.substring(0, 8),
            chunk_preview: e.chunk_text?.substring(0, 100) + '...',
            embedding_type: typeof e.embedding,
            embedding_is_array: Array.isArray(e.embedding),
            embedding_length: Array.isArray(e.embedding) ? e.embedding.length : 'N/A',
            embedding_first_value: Array.isArray(e.embedding) ? e.embedding[0] : 'N/A'
        }));

        return NextResponse.json({
            total_checked: embeddings?.length || 0,
            embeddings_analysis: analysis
        });

    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
