/**
 * Enhanced RAG System
 * Retrieval-Augmented Generation with Hybrid Search
 * 
 * Features:
 * - Vector similarity search (pgvector)
 * - Keyword-based search (PostgreSQL full-text)
 * - Hybrid ranking (vector + keyword)
 * - Context window management
 * - Citation tracking
 * 
 * Integration with:
 * - Supabase pgvector for embeddings
 * - Pollination AI for embedding generation
 * - Agent Pipeline for context augmentation
 */

import { supabaseAdmin } from '@/lib/db/supabase';
import { generateEmbedding as pollinationEmbedding } from '@/lib/ai/pollination-client';

// ============================================================================
// Types
// ============================================================================

export interface RAGQuery {
    query: string;
    limit?: number;
    threshold?: number;
    vector_weight?: number;  // 0-1, weight for vector similarity
    keyword_weight?: number; // 0-1, weight for keyword match
    filters?: Record<string, any>;
}

export interface RAGResult {
    id: string;
    chunk_text: string;
    similarity_score: number;
    keyword_score: number;
    combined_score: number;
    metadata: Record<string, any>;
    source: string;
}

export interface EmbeddingModel {
    name: string;
    dimensions: number;
    provider: 'pollination' | 'openai' | 'custom';
}

// ============================================================================
// Enhanced RAG Class
// ============================================================================

export class EnhancedRAG {
    private embeddingModel: EmbeddingModel;

    constructor(embeddingModel: EmbeddingModel = {
        name: 'text-embedding-gemini',
        dimensions: 1024,
        provider: 'pollination'
    }) {
        this.embeddingModel = embeddingModel;
    }

    // ========================================================================
    // Embedding Generation
    // ========================================================================

    /**
     * Generate embedding using Pollination AI
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            // Use Pollination AI embedding (deterministic hash-based)
            const embedding = await pollinationEmbedding(text);
            return embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    // ========================================================================
    // Vector Search
    // ========================================================================

    /**
     * Perform vector similarity search using pgvector
     */
    async vectorSearch(
        query: string,
        limit: number = 10,
        threshold: number = 0.7,
        kbId?: string,
        supabaseClient?: any
    ): Promise<RAGResult[]> {
        const supabase = supabaseClient || supabaseAdmin;

        // Generate query embedding
        const queryEmbedding = await this.generateEmbedding(query);

        // Get KB with most embeddings if not provided (dynamic selection)
        let targetKbId = kbId;
        if (!targetKbId) {
            // Find KB with highest embedding count
            const { data: kbs } = await supabase
                .from('knowledge_bases')
                .select('id, name');

            if (kbs && kbs.length > 0) {
                // Get counts for each KB
                const kbCounts = await Promise.all(kbs.map(async (kb: { id: string; name: string }) => {
                    const { count } = await supabase
                        .from('embeddings_v2')
                        .select('*', { count: 'exact', head: true })
                        .eq('kb_id', kb.id);
                    return { id: kb.id, name: kb.name, count: count || 0 };
                }));

                // Sort by count descending, pick the one with most embeddings
                const bestKb = kbCounts.sort((a, b) => b.count - a.count)[0];
                if (bestKb && bestKb.count > 0) {
                    targetKbId = bestKb.id;
                    console.log(`[RAG] Auto-selected KB: ${bestKb.name} (${bestKb.count} embeddings)`);
                }
            }
        }

        if (!targetKbId) {
            console.warn('No knowledge base found for vector search');
            return [];
        }

        // Perform vector similarity search using match_embeddings_v2 (Xenova 384-dim)
        const { data, error } = await supabase.rpc('match_embeddings_v2', {
            query_embedding: queryEmbedding,
            p_kb_id: targetKbId,
            match_count: limit,
            match_threshold: threshold
        });

        if (error) {
            console.error('Vector search error:', error);
            return [];
        }

        return (data || []).map((item: any) => ({
            id: item.id || crypto.randomUUID(),
            chunk_text: item.chunk_text,
            similarity_score: item.similarity,
            keyword_score: 0,
            combined_score: item.similarity,
            metadata: item.chunk_metadata || {},
            source: item.chunk_metadata?.source || 'default_kb'
        }));
    }

    // ========================================================================
    // Keyword Search
    // ========================================================================

    /**
     * Perform keyword-based full-text search
     */
    async keywordSearch(
        query: string,
        limit: number = 10,
        supabaseClient?: any
    ): Promise<RAGResult[]> {
        const supabase = supabaseClient || supabaseAdmin;

        // Use PostgreSQL full-text search
        const { data, error } = await supabase
            .from('embeddings_v2') // Use v2 table
            .select('*')
            .textSearch('chunk_text', query, {
                type: 'websearch',
                config: 'english'
            })
            .limit(limit);

        if (error) {
            console.error('Keyword search error:', error);
            return [];
        }

        return (data || []).map((item: any, index: number) => ({
            id: item.id,
            chunk_text: item.chunk_text,
            similarity_score: 0,
            keyword_score: 1 - (index / limit), // Ranking based on position
            combined_score: 1 - (index / limit),
            metadata: item.chunk_metadata || {},
            source: item.chunk_metadata?.source || 'unknown'
        }));
    }

    // ========================================================================
    // Hybrid Search
    // ========================================================================

    /**
     * Combine vector and keyword search with weighted ranking
     */
    async hybridSearch(params: RAGQuery): Promise<RAGResult[]> {
        const {
            query,
            limit = 10,
            threshold = 0.7,
            vector_weight = 0.7,
            keyword_weight = 0.3
        } = params;

        // Perform both searches in parallel
        const [vectorResults, keywordResults] = await Promise.all([
            this.vectorSearch(query, limit, threshold),
            this.keywordSearch(query, limit)
        ]);

        // Merge and re-rank results
        const mergedResults = this.mergeAndRank(
            vectorResults,
            keywordResults,
            vector_weight,
            keyword_weight
        );

        return mergedResults.slice(0, limit);
    }

    /**
     * Merge vector and keyword results with weighted scoring
     */
    private mergeAndRank(
        vectorResults: RAGResult[],
        keywordResults: RAGResult[],
        vectorWeight: number,
        keywordWeight: number
    ): RAGResult[] {
        const resultsMap = new Map<string, RAGResult>();

        // Add vector results
        vectorResults.forEach(result => {
            resultsMap.set(result.id, {
                ...result,
                combined_score: result.similarity_score * vectorWeight
            });
        });

        // Merge keyword results
        keywordResults.forEach(result => {
            const existing = resultsMap.get(result.id);
            if (existing) {
                // Combine scores
                existing.keyword_score = result.keyword_score;
                existing.combined_score += result.keyword_score * keywordWeight;
            } else {
                // New result from keyword search
                resultsMap.set(result.id, {
                    ...result,
                    combined_score: result.keyword_score * keywordWeight
                });
            }
        });

        // Sort by combined score (descending)
        return Array.from(resultsMap.values())
            .sort((a, b) => b.combined_score - a.combined_score);
    }

    // ========================================================================
    // Context Augmentation
    // ========================================================================

    /**
     * Augment user query with relevant context from knowledge base
     */
    async augmentContext(query: string, options?: Partial<RAGQuery>): Promise<{
        augmented_query: string;
        retrieved_chunks: RAGResult[];
        total_tokens: number;
    }> {
        // Retrieve relevant chunks
        const chunks = await this.hybridSearch({
            query,
            limit: options?.limit || 5,
            threshold: options?.threshold || 0.7,
            vector_weight: options?.vector_weight || 0.7,
            keyword_weight: options?.keyword_weight || 0.3
        });

        // Build augmented context
        const contextParts = chunks.map((chunk, index) =>
            `[Source ${index + 1}: ${chunk.source}]\n${chunk.chunk_text}`
        );

        const augmentedQuery = `
Context from knowledge base:

${contextParts.join('\n\n---\n\n')}

User Query: ${query}
    `.trim();

        // Estimate token count (rough: 1 token ≈ 4 characters)
        const totalTokens = Math.ceil(augmentedQuery.length / 4);

        return {
            augmented_query: augmentedQuery,
            retrieved_chunks: chunks,
            total_tokens: totalTokens
        };
    }

    // ========================================================================
    // Citation Generation
    // ========================================================================

    /**
     * Generate citations from retrieved chunks
     */
    generateCitations(chunks: RAGResult[]): string[] {
        return chunks.map((chunk, index) => {
            const source = chunk.source || 'Unknown source';
            const score = (chunk.combined_score * 100).toFixed(1);
            return `[${index + 1}] ${source} (relevance: ${score}%)`;
        });
    }

    // ========================================================================
    // Knowledge Base Management
    // ========================================================================

    /**
     * Add document to knowledge base
     */
    async addDocument(params: {
        kb_id: string;
        text: string;
        metadata?: Record<string, any>;
        chunk_size?: number;
    }, supabaseClient?: any): Promise<void> {
        const supabase = supabaseClient || supabaseAdmin;
        const { kb_id, text, metadata = {}, chunk_size = 512 } = params;

        // Chunk the document
        const chunks = this.chunkText(text, chunk_size);

        // Generate embeddings and insert
        for (const chunk of chunks) {
            const embedding = await this.generateEmbedding(chunk);

            await supabase.from('embeddings_v2').insert({ // Use v2 table
                kb_id,
                chunk_text: chunk,
                embedding,
                chunk_metadata: metadata
            });
        }
    }

    /**
     * Chunk text into smaller pieces
     */
    private chunkText(text: string, chunkSize: number): string[] {
        const words = text.split(/\s+/);
        const chunks: string[] = [];

        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize).join(' '));
        }

        return chunks;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const enhancedRAG = new EnhancedRAG();

export default EnhancedRAG;
