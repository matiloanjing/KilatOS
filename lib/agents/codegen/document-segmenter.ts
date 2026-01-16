/**
 * Document Segmenter for KilatCode
 * Handles large documents (papers, specs) exceeding LLM token limits
 * 
 * Features:
 * - Auto-detect when document exceeds token limit
 * - Semantic chunking (preserve algorithms, formulas, concepts)
 * - Context overlap between chunks
 * - Intelligent reassembly of results
 * 
 * Copyright © 2026 KilatOS
 */

import { aiMandor } from '@/lib/ai/mandor';

// ============================================================================
// Types
// ============================================================================

export interface ChunkConfig {
    maxTokens: number;
    overlapTokens: number;
    preserveAlgorithms: boolean;
    preserveFormulas: boolean;
    preserveCodeBlocks: boolean;
    preserveHeaders: boolean;
    model?: string;  // User-selected model for AI calls
}

export interface DocumentChunk {
    content: string;
    index: number;
    type: 'full' | 'segment';
    startOffset: number;
    endOffset: number;
    metadata: {
        hasAlgorithm: boolean;
        hasFormula: boolean;
        hasCode: boolean;
        sectionTitle?: string;
    };
}

export interface ProcessedChunkResult {
    chunk: DocumentChunk;
    result: string;
    summary: string;
    codeGenerated?: string;
}

export interface ReassembledResult {
    success: boolean;
    content: string;
    code: string;
    chunksProcessed: number;
    totalTokens: number;
}

// ============================================================================
// Semantic Patterns
// ============================================================================

const SEMANTIC_PATTERNS = {
    // Markdown/Document headers
    headers: /^#{1,6}\s+.+$/gm,

    // LaTeX algorithms
    algorithms: /\\begin\{algorithm\}[\s\S]*?\\end\{algorithm\}/g,

    // Math formulas (LaTeX style)
    formulas: /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^$]+\$/g,

    // Code blocks (markdown)
    codeBlocks: /```[\s\S]*?```/g,

    // Function/Class definitions (various languages)
    definitions: /(?:^|\n)(?:def|class|function|const|let|var|interface|type|export)\s+\w+/g,

    // Section breaks
    sectionBreaks: /(?:\n---\n|\n\*\*\*\n|\n___\n)/g,

    // Pseudocode blocks
    pseudocode: /(?:Algorithm|Procedure|Function)\s*\d*:?[\s\S]*?(?=\n\n|\n(?:Algorithm|Procedure|Function)|$)/gi,
};

// ============================================================================
// Document Segmenter Class
// ============================================================================

export class DocumentSegmenter {
    private config: ChunkConfig;

    constructor(config?: Partial<ChunkConfig>) {
        this.config = {
            maxTokens: 80000,          // Safe limit for most LLMs
            overlapTokens: 300,        // Context overlap
            preserveAlgorithms: true,
            preserveFormulas: true,
            preserveCodeBlocks: true,
            preserveHeaders: true,
            ...config
        };
    }

    // ==========================================================================
    // Public Methods
    // ==========================================================================

    /**
     * Estimate token count (approximation: 4 chars ≈ 1 token)
     */
    countTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Check if document needs segmentation
     */
    needsSegmentation(document: string): boolean {
        const tokens = this.countTokens(document);
        return tokens > this.config.maxTokens;
    }

    /**
     * Segment document into chunks
     */
    async segment(document: string): Promise<DocumentChunk[]> {
        // If small enough, return as single chunk
        if (!this.needsSegmentation(document)) {
            return [{
                content: document,
                index: 0,
                type: 'full',
                startOffset: 0,
                endOffset: document.length,
                metadata: this.extractMetadata(document)
            }];
        }

        console.log(`📄 Document requires segmentation (${this.countTokens(document)} tokens)`);

        // 1. Find semantic boundaries
        const boundaries = this.findSemanticBoundaries(document);

        // 2. Split at boundaries respecting token limits
        const chunks = this.splitAtBoundaries(document, boundaries);

        // 3. Add overlap for context continuity
        return this.addOverlap(chunks);
    }

    /**
     * Process a large document through multiple chunks
     */
    async processLargeDocument(
        document: string,
        processor: (chunk: string, context: string) => Promise<string>
    ): Promise<ReassembledResult> {
        const chunks = await this.segment(document);

        console.log(`📄 Processing ${chunks.length} chunks...`);

        const results: ProcessedChunkResult[] = [];
        let runningContext = '';

        for (const chunk of chunks) {
            console.log(`  → Processing chunk ${chunk.index + 1}/${chunks.length}`);

            // Process with accumulated context
            const result = await processor(chunk.content, runningContext);

            // Generate summary for context passing
            const summary = await this.summarizeResult(result);

            results.push({
                chunk,
                result,
                summary,
                codeGenerated: this.extractCode(result)
            });

            // Update running context (keep it bounded)
            runningContext = this.buildContext(results.slice(-3));
        }

        // Reassemble all results
        return this.reassemble(results);
    }

    // ==========================================================================
    // Private Methods
    // ==========================================================================

    /**
     * Find semantic boundaries in document
     */
    private findSemanticBoundaries(document: string): number[] {
        const boundaries: Set<number> = new Set([0, document.length]);

        // Find all header positions
        if (this.config.preserveHeaders) {
            const headerMatches = document.matchAll(SEMANTIC_PATTERNS.headers);
            for (const match of headerMatches) {
                if (match.index !== undefined) {
                    boundaries.add(match.index);
                }
            }
        }

        // Find section breaks
        const breakMatches = document.matchAll(SEMANTIC_PATTERNS.sectionBreaks);
        for (const match of breakMatches) {
            if (match.index !== undefined) {
                boundaries.add(match.index);
            }
        }

        // Find paragraph breaks (double newline)
        let pos = 0;
        while ((pos = document.indexOf('\n\n', pos)) !== -1) {
            boundaries.add(pos);
            pos += 2;
        }

        return Array.from(boundaries).sort((a, b) => a - b);
    }

    /**
     * Split document at boundaries while respecting token limits
     */
    private splitAtBoundaries(document: string, boundaries: number[]): DocumentChunk[] {
        const chunks: DocumentChunk[] = [];
        const maxChars = this.config.maxTokens * 4; // Convert tokens to chars

        let chunkStart = 0;
        let currentIndex = 0;

        for (let i = 1; i < boundaries.length; i++) {
            const boundary = boundaries[i];
            const potentialContent = document.slice(chunkStart, boundary);

            // If this would exceed limit, create chunk at previous boundary
            if (potentialContent.length > maxChars && i > 1) {
                const previousBoundary = boundaries[i - 1];
                const content = document.slice(chunkStart, previousBoundary);

                if (content.trim()) {
                    chunks.push({
                        content: content.trim(),
                        index: currentIndex++,
                        type: 'segment',
                        startOffset: chunkStart,
                        endOffset: previousBoundary,
                        metadata: this.extractMetadata(content)
                    });
                }

                chunkStart = previousBoundary;
            }
        }

        // Add final chunk
        const finalContent = document.slice(chunkStart);
        if (finalContent.trim()) {
            chunks.push({
                content: finalContent.trim(),
                index: currentIndex,
                type: 'segment',
                startOffset: chunkStart,
                endOffset: document.length,
                metadata: this.extractMetadata(finalContent)
            });
        }

        return chunks;
    }

    /**
     * Add overlap between chunks for context continuity
     */
    private addOverlap(chunks: DocumentChunk[]): DocumentChunk[] {
        if (chunks.length <= 1) return chunks;

        const overlapChars = this.config.overlapTokens * 4;

        return chunks.map((chunk, index) => {
            if (index === 0) return chunk;

            // Get ending of previous chunk as prefix
            const prevChunk = chunks[index - 1];
            const overlapContent = prevChunk.content.slice(-overlapChars);

            return {
                ...chunk,
                content: `[CONTEXT FROM PREVIOUS SECTION]\n${overlapContent}\n[END CONTEXT]\n\n${chunk.content}`
            };
        });
    }

    /**
     * Extract metadata from chunk content
     */
    private extractMetadata(content: string): DocumentChunk['metadata'] {
        return {
            hasAlgorithm: SEMANTIC_PATTERNS.algorithms.test(content) ||
                SEMANTIC_PATTERNS.pseudocode.test(content),
            hasFormula: SEMANTIC_PATTERNS.formulas.test(content),
            hasCode: SEMANTIC_PATTERNS.codeBlocks.test(content),
            sectionTitle: this.extractSectionTitle(content)
        };
    }

    /**
     * Extract section title from content
     */
    private extractSectionTitle(content: string): string | undefined {
        const match = content.match(/^#{1,3}\s+(.+)$/m);
        return match ? match[1].trim() : undefined;
    }

    /**
     * Summarize a result for context passing
     */
    private async summarizeResult(result: string): Promise<string> {
        // If result is short, use as-is
        if (result.length < 500) return result;

        // Otherwise, generate summary
        const response = await aiMandor.call({
            prompt: `Summarize the key points from this section in 2-3 sentences. Focus on:
- Main concepts/algorithms introduced
- Key code structures generated
- Important decisions made

Content:
${result.slice(0, 2000)}`,
            complexity: 'light',
            model: this.config.model  // Pass user-selected model
        });

        return response.result;
    }

    /**
     * Extract code from result
     */
    private extractCode(result: string): string | undefined {
        const codeBlocks = result.match(/```[\w]*\n([\s\S]*?)```/g);
        if (!codeBlocks) return undefined;

        return codeBlocks
            .map(block => block.replace(/```[\w]*\n/, '').replace(/```$/, ''))
            .join('\n\n');
    }

    /**
     * Build context string from recent results
     */
    private buildContext(recentResults: ProcessedChunkResult[]): string {
        return recentResults
            .map(r => `[Section: ${r.chunk.metadata.sectionTitle || 'Unknown'}]\n${r.summary}`)
            .join('\n\n');
    }

    /**
     * Reassemble all processed chunks into final result
     */
    private reassemble(results: ProcessedChunkResult[]): ReassembledResult {
        // Combine all content
        const content = results
            .map(r => r.result)
            .join('\n\n---\n\n');

        // Combine all code
        const code = results
            .filter(r => r.codeGenerated)
            .map(r => `// From section: ${r.chunk.metadata.sectionTitle || `Chunk ${r.chunk.index + 1}`}\n${r.codeGenerated}`)
            .join('\n\n');

        // Calculate total tokens
        const totalTokens = results.reduce(
            (sum, r) => sum + this.countTokens(r.chunk.content),
            0
        );

        return {
            success: true,
            content,
            code,
            chunksProcessed: results.length,
            totalTokens
        };
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const documentSegmenter = new DocumentSegmenter();

export default DocumentSegmenter;
