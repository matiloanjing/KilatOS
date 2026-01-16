import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/auth/server';
import * as fs from 'fs';
import * as path from 'path';

const KNOWLEDGE_DIR = 'docs/knowledge';

/**
 * POST /api/ingest-knowledge
 * Re-ingest knowledge documents from docs/knowledge folder
 */
export async function POST(req: NextRequest) {
    try {
        const supabaseAdmin = createAdminClient();

        // 1. Get or create knowledge base
        let { data: kb } = await supabaseAdmin
            .from('knowledge_bases')
            .select('id')
            .eq('name', 'kilat_tutor_kb')
            .single();

        if (!kb) {
            const { data: newKb, error } = await supabaseAdmin
                .from('knowledge_bases')
                .insert({
                    name: 'kilat_tutor_kb',
                    description: 'KilatOS knowledge base',
                    embedding_model: 'all-MiniLM-L6-v2',
                    embedding_dim: 384
                })
                .select()
                .single();
            if (error) throw error;
            kb = newKb;
        }

        // 2. Read knowledge files
        const knowledgePath = path.join(process.cwd(), KNOWLEDGE_DIR);
        const files = fs.readdirSync(knowledgePath).filter(f => f.endsWith('.md'));

        // 3. Delete old embeddings for this KB (clean re-ingest)
        await supabaseAdmin
            .from('embeddings_v2')
            .delete()
            .eq('kb_id', kb.id);

        const results: { file: string; chunks: number; success: boolean }[] = [];

        // 4. Process each file
        for (const file of files) {
            const filePath = path.join(knowledgePath, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Smart chunking: split by headers and sections
            const rawChunks = content
                .split(/(?=^#{1,3}\s)/m) // Split before headers
                .flatMap(section => {
                    if (section.length > 1000) {
                        return section.split(/\n\n+/);
                    }
                    return [section];
                })
                .map(c => c.trim())
                .filter(c => c.length > 30);

            let insertedCount = 0;

            for (const chunk of rawChunks) {
                try {
                    // Get embedding from local API
                    const embedResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/embed`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: chunk })
                    });

                    if (!embedResponse.ok) continue;

                    const { embeddings } = await embedResponse.json();

                    // API returns array of arrays: [[...]]. Extract first for single text.
                    const embedding = Array.isArray(embeddings) && embeddings.length > 0 ? embeddings[0] : embeddings;

                    // Debug log
                    console.log(`[Ingest] ${file}: embedding length=${Array.isArray(embedding) ? embedding.length : 'N/A'}`);

                    // Insert into database
                    const { error: insertError } = await supabaseAdmin.from('embeddings_v2').insert({
                        kb_id: kb.id,
                        chunk_text: chunk,
                        embedding: embedding,
                        chunk_metadata: { source: 'docs', file }
                    });

                    if (insertError) {
                        console.error(`[Ingest] Insert failed for ${file}:`, insertError);
                        continue;
                    }

                    insertedCount++;
                } catch (e) {
                    console.error(`Failed to embed chunk from ${file}:`, e);
                }
            }

            results.push({ file, chunks: insertedCount, success: insertedCount > 0 });
        }

        // 5. Get total count
        const { count } = await supabaseAdmin
            .from('embeddings_v2')
            .select('*', { count: 'exact', head: true })
            .eq('kb_id', kb.id);

        return NextResponse.json({
            success: true,
            message: '✅ Knowledge base re-ingested!',
            kb_id: kb.id,
            total_embeddings: count,
            files_processed: results
        });

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        usage: 'POST /api/ingest-knowledge to re-ingest docs/knowledge/*.md files'
    });
}
