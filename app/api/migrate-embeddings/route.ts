import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/auth/server';
import { generateEmbedding } from '@/lib/ai/embedding-service';

/**
 * Migration API: Embeddings V1 -> V2
 * 
 * Process:
 * 1. Read rows from `embeddings` (v1)
 * 2. Generate new 384-dim embedding for `chunk_text`
 * 3. Insert into `embeddings_v2` (using Admin Client)
 * 4. Mark progress
 */
export async function POST(req: NextRequest) {
    try {
        const supabaseAdmin = createAdminClient();
        const { limit = 50, offset = 0 } = await req.json().catch(() => ({}));

        // 1. Get raw documents from V1 table (use Admin Client)
        const { data: oldRows, error: fetchError } = await supabaseAdmin
            .from('embeddings')
            .select('*')
            .range(offset, offset + limit - 1);

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!oldRows || oldRows.length === 0) {
            return NextResponse.json({ message: 'No more rows to migrate', count: 0 });
        }

        const results = [];
        let successCount = 0;

        // 2. Process each row
        for (const row of oldRows) {
            try {
                // Generate new embedding (384-dim)
                const newEmbedding = await generateEmbedding(row.chunk_text);

                // Insert into v2
                const { error: insertError } = await supabaseAdmin
                    .from('embeddings_v2')
                    .insert({
                        // reuse ID if possible, or let it gen new one? 
                        // Let's gen new one to avoid PK conflicts if schemas differ slightly
                        kb_id: row.kb_id,
                        chunk_text: row.chunk_text,
                        chunk_metadata: row.chunk_metadata,
                        embedding: newEmbedding,
                        created_at: row.created_at
                    });

                if (insertError) throw insertError;
                successCount++;
                results.push({ id: row.id, status: 'migrated' });

                // Small delay to prevent rate limiting/overload if needed
                // await new Promise(r => setTimeout(r, 100));

            } catch (err) {
                console.error(`Failed to migrate row ${row.id}:`, err);
                results.push({ id: row.id, status: 'error', error: err });
            }
        }

        return NextResponse.json({
            message: `Migrated ${successCount}/${oldRows.length} rows`,
            next_offset: offset + limit,
            results
        });

    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Migration failed'
        }, { status: 500 });
    }
}
