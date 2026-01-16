import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron Job: Sync Generated Code to RAG
 * 
 * Runs daily to keep code examples fresh in embeddings.
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-code-rag",
 *     "schedule": "0 3 * * *"  // Daily at 3am UTC
 *   }]
 * }
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max

// Knowledge base for code examples
const CODE_EXAMPLES_KB_ID = '11111111-1111-1111-1111-111111111111';

function generateHashEmbedding(text: string): number[] {
    const dim = 384;
    const embedding = new Array(dim).fill(0);

    const fnv1a = (str: string, seed: number = 0): number => {
        let h = seed ^ 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    };

    for (let i = 0; i < dim; i++) {
        const hash = fnv1a(text, i * 7919);
        embedding[i] = (hash / 4294967295) * 2 - 1;
    }

    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / magnitude);
}

export async function GET(request: Request) {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 [Cron] Starting code-to-RAG sync...');

    try {
        // Get last sync timestamp
        const { data: config } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'code_rag_last_sync')
            .single();

        const lastSync = config?.value?.timestamp;

        // Get new generated_code entries since last sync
        let query = supabase
            .from('generated_code')
            .select('id, agent_type, prompt, code, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

        if (lastSync) {
            query = query.gt('created_at', lastSync);
        }

        const { data: codeEntries, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch generated_code: ${error.message}`);
        }

        let synced = 0;

        for (const entry of codeEntries || []) {
            // Skip if code too short
            if (!entry.code || entry.code.length < 200) continue;

            // Check if already synced
            const { data: existing } = await supabase
                .from('embeddings_v2')
                .select('id')
                .eq('chunk_metadata->>source_id', entry.id)
                .limit(1);

            if (existing && existing.length > 0) continue;

            // Create chunk
            const codePreview = entry.code.substring(0, 1000);
            const chunkText = `Agent: ${entry.agent_type}\nPrompt: ${entry.prompt}\n\nCode Example:\n${codePreview}`.trim();

            const embedding = generateHashEmbedding(chunkText);

            const { error: insertError } = await supabase
                .from('embeddings_v2')
                .insert({
                    kb_id: CODE_EXAMPLES_KB_ID,
                    chunk_text: chunkText,
                    embedding: embedding,
                    chunk_metadata: {
                        type: 'generated_code',
                        source_id: entry.id,
                        agent_type: entry.agent_type,
                        created_at: entry.created_at,
                        synced_at: new Date().toISOString()
                    }
                });

            if (!insertError) synced++;
        }

        // Update last sync timestamp
        await supabase
            .from('app_configs')
            .upsert({
                key: 'code_rag_last_sync',
                value: {
                    timestamp: new Date().toISOString(),
                    synced_count: synced
                }
            });

        console.log(`✅ [Cron] Synced ${synced} new code examples`);

        return NextResponse.json({
            success: true,
            synced,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [Cron] Sync failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
