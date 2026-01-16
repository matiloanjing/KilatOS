/**
 * API Route: Sync Chat History to RAG
 * 
 * POST /api/rag/sync
 * - Manually trigger chat history → embeddings sync
 * 
 * GET /api/rag/sync
 * - Get sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncChatHistoryToRAG, searchChatHistory } from '@/lib/learning/chat-to-rag';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const limit = body.limit || 50;
        const force = body.force || false;

        console.log(`🔄 Manual RAG sync triggered (limit: ${limit}, force: ${force})`);

        const result = await syncChatHistoryToRAG(limit, force);

        return NextResponse.json({
            success: true,
            message: `Synced ${result.synced} conversations to RAG`,
            result
        });

    } catch (error) {
        console.error('RAG sync error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (query) {
        // Search mode
        try {
            const results = await searchChatHistory(query, 5);
            return NextResponse.json({
                success: true,
                query,
                results
            });
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: 'Search failed'
            }, { status: 500 });
        }
    }

    // Status mode
    return NextResponse.json({
        success: true,
        message: 'RAG sync endpoint active',
        usage: {
            sync: 'POST /api/rag/sync { limit?: number, force?: boolean }',
            search: 'GET /api/rag/sync?q=your+search+query'
        }
    });
}
