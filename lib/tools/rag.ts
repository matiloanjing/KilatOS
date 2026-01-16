/**
 * RAG Tool - Vector Search with Supabase
 * Now with Knowledge Graph augmentation + Security Layer
 * Copyright © 2025 KilatCode Studio
 */

import { supabaseAdmin } from '../db/supabase';
import { generateEmbedding } from '../ai/pollination-client';
import { knowledgeGraph } from '../knowledge/KnowledgeGraph';
import { sanitizeRAGQuery, sanitizeRAGOutput, isSensitiveQuery, getSafeResponse } from '../security/query-sanitizer';

export interface RAGResult {
    text: string;
    score: number;
    metadata?: Record<string, any>;
}

export interface GraphAugmentedResult extends RAGResult {
    relatedEntities?: Array<{
        name: string;
        type: string;
        relationship: string;
    }>;
}

/**
 * Vector similarity search in knowledge base
 * WITH SECURITY SANITIZATION
 */
export async function vectorSearch(
    query: string,
    kbName: string,
    topK: number = 10,
    similarityThreshold: number = 0.7
): Promise<RAGResult[]> {
    // SECURITY: Sanitize query first
    const sanitizationResult = sanitizeRAGQuery(query);

    if (sanitizationResult.riskLevel === 'blocked') {
        console.warn('🔒 RAG Query BLOCKED:', sanitizationResult.blockedTerms);
        return [{
            text: getSafeResponse(sanitizationResult.blockedTerms),
            score: 1.0,
            metadata: { blocked: true, reason: 'security' }
        }];
    }

    // Use sanitized query
    const safeQuery = sanitizationResult.sanitizedQuery;
    // 1. Get knowledge base ID
    const { data: kb, error: kbError } = await supabaseAdmin
        .from('knowledge_bases')
        .select('id')
        .eq('name', kbName)
        .single();

    if (kbError || !kb) {
        throw new Error(`Knowledge base "${kbName}" not found`);
    }

    // 2. Generate query embedding (using sanitized query)
    const queryEmbedding = await generateEmbedding(safeQuery);

    // 3. Search similar embeddings (Xenova 384-dim)
    const kbId = (kb as { id: string }).id; // Type assertion for TS inference
    const { data: results, error: searchError } = await supabaseAdmin.rpc(
        'match_embeddings_v2',
        {
            query_embedding: queryEmbedding,
            match_count: topK,
            match_threshold: similarityThreshold,
            p_kb_id: kbId
        } as any
    );

    if (searchError) {
        throw new Error(`Vector search failed: ${searchError.message}`);
    }

    return (
        (results as any)?.map((r: any) => ({
            text: r.chunk_text,
            score: r.similarity,
            metadata: r.chunk_metadata,
        })) || []
    );
}

/**
 * Graph-augmented search - combines vector search with knowledge graph
 * Returns results enriched with related entities from the graph
 */
export async function graphAugmentedSearch(
    query: string,
    kbName: string,
    topK: number = 10
): Promise<GraphAugmentedResult[]> {
    // 1. Get vector search results
    const vectorResults = await vectorSearch(query, kbName, topK);

    // 2. Extract key terms for entity search
    const keyTerms = query.split(' ')
        .filter(word => word.length > 3)
        .slice(0, 5);

    // 3. Find related entities from knowledge graph
    const augmentedResults: GraphAugmentedResult[] = [];

    for (const result of vectorResults) {
        const augmented: GraphAugmentedResult = { ...result };

        try {
            // Search for entities matching key terms
            const relatedEntities: GraphAugmentedResult['relatedEntities'] = [];

            for (const term of keyTerms) {
                const entities = await knowledgeGraph.searchEntities(term);

                for (const entity of entities.slice(0, 2)) {
                    // Get relationships for this entity
                    const relationships = await knowledgeGraph.getRelationships(entity.id, 'outgoing');

                    relatedEntities.push({
                        name: entity.name,
                        type: entity.type,
                        relationship: relationships.length > 0
                            ? relationships[0].type
                            : 'related_to'
                    });
                }
            }

            if (relatedEntities.length > 0) {
                augmented.relatedEntities = relatedEntities.slice(0, 5);
            }
        } catch (error) {
            // Knowledge graph query failed, continue without augmentation
            console.warn('Knowledge graph augmentation failed:', error);
        }

        augmentedResults.push(augmented);
    }

    return augmentedResults;
}

/**
 * Format graph-augmented context for LLM
 */
export function formatGraphContext(results: GraphAugmentedResult[]): string {
    if (results.length === 0) {
        return 'No relevant context found.';
    }

    const contexts = results.map((result, index) => {
        let context = `[Context ${index + 1}] (Relevance: ${(result.score * 100).toFixed(1)}%)\n${result.text}`;

        if (result.relatedEntities && result.relatedEntities.length > 0) {
            const entityStr = result.relatedEntities
                .map(e => `${e.name} (${e.type})`)
                .join(', ');
            context += `\n📊 Related: ${entityStr}`;
        }

        return context;
    });

    return contexts.join('\n\n---\n\n');
}

/**
 * Hybrid search (vector + keyword)
 * Combines vector similarity with text matching
 */
export async function hybridSearch(
    query: string,
    kbName: string,
    topK: number = 10
): Promise<RAGResult[]> {
    // Get vector results
    const vectorResults = await vectorSearch(query, kbName, topK);

    // Get KB ID for keyword search
    const { data: kb } = await supabaseAdmin
        .from('knowledge_bases')
        .select('id')
        .eq('name', kbName)
        .single();

    if (!kb) return vectorResults;

    // Keyword search using full-text search
    const { data: keywordResults } = await supabaseAdmin
        .from('embeddings')
        .select('chunk_text, chunk_metadata')
        .eq('kb_id', (kb as any).id)
        .textSearch('chunk_text', query, {
            type: 'websearch',
            config: 'english',
        })
        .limit(topK);

    // Merge results (deduplicate by text)
    const merged = new Map<string, RAGResult>();

    vectorResults.forEach((r) => {
        merged.set(r.text, r);
    });

    keywordResults?.forEach((r: any) => {
        if (!merged.has(r.chunk_text)) {
            merged.set(r.chunk_text, {
                text: r.chunk_text,
                score: 0.5, // Lower score for keyword-only matches
                metadata: r.chunk_metadata,
            });
        }
    });

    // Sort by score descending
    return Array.from(merged.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

/**
 * Get context from RAG results
 * Formats results into a context string for LLM
 */
export function formatRAGContext(results: RAGResult[]): string {
    if (results.length === 0) {
        return 'No relevant context found in knowledge base.';
    }

    const contexts = results.map((result, index) => {
        return `[Context ${index + 1}] (Relevance: ${(result.score * 100).toFixed(1)}%)\n${result.text}`;
    });

    return contexts.join('\n\n---\n\n');
}
