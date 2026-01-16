/**
 * Agentic RAG Integration for Code Generation
 * Supports Fast/Fresh/Hybrid modes
 * 
 * Copyright © 2026 KilatOS
 */

import { EnhancedRAG } from '@/lib/rag/EnhancedRAG';
import { kilatCrawl } from '../crawl/kilatcrawl';
import { quotaManager } from '@/lib/quota/quota-manager';
import { fireAndForget } from '@/lib/utils/non-blocking-db';

// ============================================================================
// Types
// ============================================================================

export interface RAGStrategy {
    mode: 'fast' | 'fresh' | 'hybrid';
    searchQuery: string;
    language: string;
    framework?: string;
}

export interface RAGResult {
    mode: 'fast' | 'fresh' | 'hybrid';
    examples: string[];
    documentation: string;
    bestPractices: string[];
    citations: Array<{
        source: string;
        url?: string;
        timestamp?: Date;
        relevance?: number;
    }>;
}

// ============================================================================
// Main RAG Function
// ============================================================================

export async function agenticRAGForCode(strategy: RAGStrategy): Promise<RAGResult> {
    const { mode, searchQuery, language, framework } = strategy;

    switch (mode) {
        case 'fast':
            return await fastRAG(searchQuery, language, framework);

        case 'fresh':
            return await freshRAG(searchQuery, language, framework);

        case 'hybrid':
            return await hybridRAG(searchQuery, language, framework);

        default:
            throw new Error(`Unknown RAG mode: ${mode}`);
    }
}

// ============================================================================
// Fast Mode - Cached Examples
// ============================================================================

async function fastRAG(
    query: string,
    language: string,
    framework?: string
): Promise<RAGResult> {
    const rag = new EnhancedRAG();

    // Build search query - include original query for general knowledge
    const enhancedQuery = framework
        ? `${language} ${framework} ${query} code example`
        : query; // For general questions, use query as-is

    // Search cached knowledge - hybridSearch returns RAGResult[] array
    const results = await rag.hybridSearch({
        query: enhancedQuery,
        limit: 10,
        threshold: 0.3 // Lower threshold for better recall
    });

    // Extract code examples (optional - may be empty for non-code queries)
    const examples = results
        .filter(result => result.chunk_text && result.chunk_text.includes('```'))
        .map(result => extractCodeBlock(result.chunk_text))
        .filter(Boolean) as string[];

    // Extract best practices
    const bestPractices = results
        .filter(result =>
            result.chunk_text && (
                result.chunk_text.toLowerCase().includes('best practice') ||
                result.chunk_text.toLowerCase().includes('recommended')
            )
        )
        .map(result => result.chunk_text);

    // IMPORTANT: Include ALL relevant text for general knowledge queries
    // Sort by score and take top results
    const sortedResults = results.sort((a, b) => b.combined_score - a.combined_score);
    const documentation = sortedResults
        .slice(0, 5)
        .map(r => `[Score: ${(r.combined_score * 100).toFixed(1)}%]\n${r.chunk_text}`)
        .join('\n\n---\n\n');

    return {
        mode: 'fast',
        examples,
        documentation, // Now contains ALL relevant text, not just code
        bestPractices,
        citations: results.map(result => ({
            source: result.source || 'cached',
            relevance: result.combined_score
        }))
    };
}

// ============================================================================
// Fresh Mode - Real-time Scraping
// ============================================================================

async function freshRAG(
    query: string,
    language: string,
    framework?: string
): Promise<RAGResult> {
    // Get documentation URL
    const docUrl = getDocumentationUrl(language, framework);

    // Scrape latest docs
    console.log(`🔍 Scraping fresh docs from: ${docUrl}`);
    const crawlResult = await kilatCrawl.crawl(docUrl);

    // NOTE: Internal RAG crawls are NOT tracked to user quota table
    // System-initiated calls don't have a valid user_id (FK constraint)
    // Analytics for system calls tracked separately via logging only
    console.log('📊 [System] Internal RAG crawl completed');

    // Use markdown content from CrawlResult
    const scrapedContent = crawlResult.markdown || '';

    // Extract code examples
    const examples = extractCodeExamples(scrapedContent);

    // Extract best practices
    const bestPractices = extractBestPractices(scrapedContent);

    return {
        mode: 'fresh',
        examples,
        documentation: scrapedContent.substring(0, 2000), // Limit size
        bestPractices,
        citations: [{
            source: 'official_docs',
            url: docUrl,
            timestamp: new Date()
        }]
    };
}

// ============================================================================
// Hybrid Mode - Best of Both
// ============================================================================

async function hybridRAG(
    query: string,
    language: string,
    framework?: string
): Promise<RAGResult> {
    // Run both in parallel
    const [cachedResults, freshResults] = await Promise.all([
        fastRAG(query, language, framework),
        freshRAG(query, language, framework)
    ]);

    // Merge results
    return {
        mode: 'hybrid',
        examples: [
            ...cachedResults.examples.slice(0, 3),
            ...freshResults.examples.slice(0, 2)
        ],
        documentation: `# Cached Knowledge:\n${cachedResults.documentation}\n\n# Latest Docs:\n${freshResults.documentation}`,
        bestPractices: [
            ...new Set([
                ...cachedResults.bestPractices,
                ...freshResults.bestPractices
            ])
        ],
        citations: [
            ...cachedResults.citations,
            ...freshResults.citations
        ]
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDocumentationUrl(language: string, framework?: string): string {
    const urls: Record<string, string> = {
        'typescript': 'https://www.typescriptlang.org/docs/',
        'typescript-react': 'https://react.dev/learn',
        'typescript-nextjs': 'https://nextjs.org/docs',
        'python': 'https://docs.python.org/3/',
        'python-fastapi': 'https://fastapi.tiangolo.com/',
        'go': 'https://go.dev/doc/',
        'rust': 'https://doc.rust-lang.org/'
    };

    const key = framework ? `${language}-${framework}` : language;
    return urls[key] || urls[language] || 'https://github.com';
}

function extractCodeBlock(text: string): string | null {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
    const match = text.match(codeBlockRegex);
    return match ? match[1].trim() : null;
}

function extractCodeExamples(content: string): string[] {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const examples: string[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        examples.push(match[1].trim());
        if (examples.length >= 5) break; // Limit to 5 examples
    }

    return examples;
}

function extractBestPractices(content: string): string[] {
    const practices: string[] = [];

    // Look for best practice sections
    const bestPracticeRegex = /(?:best practice|recommended|tip|note):?\s*(.+?)(?:\n\n|\n#)/gi;
    let match;

    while ((match = bestPracticeRegex.exec(content)) !== null) {
        practices.push(match[1].trim());
        if (practices.length >= 5) break;
    }

    return practices;
}

// ============================================================================
// Export
// ============================================================================

export default agenticRAGForCode;
