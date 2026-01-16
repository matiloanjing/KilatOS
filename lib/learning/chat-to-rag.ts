/**
 * Chat History to RAG Pipeline
 * 
 * Extracts successful conversations from agent_states
 * and stores them in embeddings_v2 for RAG search.
 * 
 * Uses existing EnhancedRAG.addDocument() - NO DUPLICATION.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { createClient } from '@/lib/auth/server';
import { enhancedRAG } from '@/lib/rag/EnhancedRAG';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    metadata?: Record<string, any>;
}

interface ConversationPair {
    sessionId: string;
    userMessage: string;
    assistantResponse: string;
    hasFiles: boolean;
    mode: 'fast' | 'planning';
    createdAt: string;
}

interface SyncResult {
    processed: number;
    synced: number;
    skipped: number;
    errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

// Knowledge base ID for chat history (create if not exists)
const CHAT_HISTORY_KB_NAME = 'chat_history_knowledge';
const CHAT_HISTORY_KB_DESCRIPTION = 'Successful AI conversations for RAG context';

// ============================================================================
// Chat to RAG Pipeline
// ============================================================================

/**
 * Get or create the chat history knowledge base
 */
async function getOrCreateChatHistoryKB(): Promise<string> {
    const supabase = await createClient();

    // Check if KB exists
    const { data: existing } = await supabase
        .from('knowledge_bases')
        .select('id')
        .eq('name', CHAT_HISTORY_KB_NAME)
        .single();

    if (existing) {
        return existing.id;
    }

    // Create new KB
    const { data: newKb, error } = await supabase
        .from('knowledge_bases')
        .insert({
            name: CHAT_HISTORY_KB_NAME,
            description: CHAT_HISTORY_KB_DESCRIPTION,
            embedding_model: 'text-embedding-3-small',
            embedding_dim: 384, // Match Xenova dimension
            metadata: { type: 'chat_history', auto_sync: true }
        })
        .select('id')
        .single();

    if (error) {
        throw new Error(`Failed to create chat history KB: ${error.message}`);
    }

    console.log(`📚 Created chat history KB: ${newKb.id}`);
    return newKb.id;
}

/**
 * Extract conversation pairs from agent_states
 * Only extracts complete user-assistant pairs
 */
async function extractConversations(
    limit: number = 50,
    afterDate?: string
): Promise<ConversationPair[]> {
    const supabase = await createClient();

    // Get agent_states with chat messages
    let query = supabase
        .from('agent_states')
        .select('session_id, state_data, created_at')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more since we need pairs

    if (afterDate) {
        query = query.gte('created_at', afterDate);
    }

    const { data, error } = await query;

    if (error || !data) {
        console.error('Failed to fetch agent_states:', error);
        return [];
    }

    // Group by session and pair user/assistant messages
    const sessionMessages = new Map<string, ChatMessage[]>();

    for (const row of data) {
        const sessionId = row.session_id;
        const stateData = row.state_data as ChatMessage;

        if (!stateData?.role || !stateData?.content) continue;

        if (!sessionMessages.has(sessionId)) {
            sessionMessages.set(sessionId, []);
        }

        sessionMessages.get(sessionId)!.push({
            ...stateData,
            timestamp: row.created_at
        });
    }

    // Extract conversation pairs
    const pairs: ConversationPair[] = [];

    for (const [sessionId, messages] of sessionMessages) {
        // Sort by timestamp
        messages.sort((a, b) =>
            new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
        );

        // Find user-assistant pairs
        for (let i = 0; i < messages.length - 1; i++) {
            const current = messages[i];
            const next = messages[i + 1];

            if (current.role === 'user' && next.role === 'assistant') {
                // Skip if response too short (likely error)
                if (next.content.length < 50) continue;

                pairs.push({
                    sessionId,
                    userMessage: current.content,
                    assistantResponse: next.content,
                    hasFiles: next.metadata?.hasFiles || false,
                    mode: next.metadata?.mode || 'planning',
                    createdAt: next.timestamp || new Date().toISOString()
                });
            }
        }
    }

    return pairs;
}

/**
 * Check if conversation is already synced to embeddings
 */
async function isAlreadySynced(sessionId: string, userMessage: string): Promise<boolean> {
    const supabase = await createClient();

    // Check by metadata
    const { data } = await supabase
        .from('embeddings_v2')
        .select('id')
        .eq('chunk_metadata->>session_id', sessionId)
        .eq('chunk_metadata->>type', 'chat_history')
        .limit(1);

    return (data?.length || 0) > 0;
}

/**
 * Sync a conversation pair to RAG embeddings
 * Uses existing EnhancedRAG.addDocument() - NO DUPLICATION
 */
async function syncConversationToRAG(
    kbId: string,
    pair: ConversationPair
): Promise<boolean> {
    try {
        // Format as searchable document
        const documentText = `
User Question: ${pair.userMessage}

AI Response: ${pair.assistantResponse}
        `.trim();

        // Use existing EnhancedRAG.addDocument()
        await enhancedRAG.addDocument({
            kb_id: kbId,
            text: documentText,
            metadata: {
                type: 'chat_history',
                session_id: pair.sessionId,
                has_files: pair.hasFiles,
                mode: pair.mode,
                synced_at: new Date().toISOString(),
                source: 'agent_states'
            },
            chunk_size: 256 // Smaller chunks for chat
        });

        return true;
    } catch (error) {
        console.error(`Failed to sync conversation from ${pair.sessionId}:`, error);
        return false;
    }
}

/**
 * Main sync function - extracts chat history and stores in embeddings
 * 
 * @param limit - Number of recent conversations to process
 * @param force - Skip duplicate check (re-sync all)
 */
export async function syncChatHistoryToRAG(
    limit: number = 50,
    force: boolean = false
): Promise<SyncResult> {
    console.log('🔄 Starting Chat History → RAG sync...');

    const result: SyncResult = {
        processed: 0,
        synced: 0,
        skipped: 0,
        errors: []
    };

    try {
        // Get or create KB
        const kbId = await getOrCreateChatHistoryKB();
        console.log(`📚 Using KB: ${kbId}`);

        // Extract conversations
        const conversations = await extractConversations(limit);
        console.log(`📝 Found ${conversations.length} conversation pairs`);

        result.processed = conversations.length;

        // Sync each conversation
        for (const pair of conversations) {
            // Check if already synced (unless force)
            if (!force) {
                const synced = await isAlreadySynced(pair.sessionId, pair.userMessage);
                if (synced) {
                    result.skipped++;
                    continue;
                }
            }

            // Sync to RAG
            const success = await syncConversationToRAG(kbId, pair);

            if (success) {
                result.synced++;
            } else {
                result.errors.push(`Failed: ${pair.sessionId}`);
            }
        }

        console.log(`✅ Sync complete: ${result.synced} synced, ${result.skipped} skipped`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(errorMessage);
        console.error('❌ Sync failed:', errorMessage);
    }

    return result;
}

/**
 * Search chat history via RAG
 * Uses existing EnhancedRAG.vectorSearch() - NO DUPLICATION
 */
export async function searchChatHistory(
    query: string,
    limit: number = 5
): Promise<Array<{ userMessage: string; assistantResponse: string; score: number }>> {
    try {
        const kbId = await getOrCreateChatHistoryKB();

        // Use existing vector search
        const results = await enhancedRAG.vectorSearch(query, limit, 0.5, kbId);

        // Parse results back into conversation format
        return results.map(r => {
            const text = r.chunk_text;
            const userMatch = text.match(/User Question:\s*([\s\S]*?)(?=AI Response:|$)/);
            const aiMatch = text.match(/AI Response:\s*([\s\S]*?)$/);

            return {
                userMessage: userMatch?.[1]?.trim() || '',
                assistantResponse: aiMatch?.[1]?.trim() || text,
                score: r.similarity_score
            };
        }).filter(r => r.userMessage || r.assistantResponse);

    } catch (error) {
        console.error('Chat history search failed:', error);
        return [];
    }
}

// ============================================================================
// Scheduled Sync (for background jobs)
// ============================================================================

/**
 * Run incremental sync (only new conversations since last sync)
 * Call this from a cron job or after each successful conversation
 */
export async function runIncrementalSync(): Promise<SyncResult> {
    // Get last sync timestamp from app_configs
    const supabase = await createClient();

    const { data: config } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', 'chat_rag_last_sync')
        .single();

    const lastSync = config?.value?.timestamp;

    // Run sync with limit
    const result = await syncChatHistoryToRAG(20, false);

    // Update last sync timestamp
    await supabase
        .from('app_configs')
        .upsert({
            key: 'chat_rag_last_sync',
            value: { timestamp: new Date().toISOString(), result }
        });

    return result;
}

// ============================================================================
// Export
// ============================================================================

export default {
    syncChatHistoryToRAG,
    searchChatHistory,
    runIncrementalSync
};
