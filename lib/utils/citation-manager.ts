/**
 * Citation Manager (Stateless)
 * Manages citations for research and solve agents
 * Copyright © 2025 KilatCode Studio
 */

export interface Citation {
    id: string;
    type: 'rag' | 'web' | 'paper' | 'code' | 'plan';
    source: string;
    content: string;
    url?: string;
    metadata?: Record<string, any>;
    ref_number?: number;
}

export interface CitationWithRef extends Citation {
    ref_number: number;
}

/**
 * Generate citation ID
 */
export function generateCitationId(type: string, index: number): string {
    const prefix = type.toUpperCase().substring(0, 3);
    return `${prefix}-${String(index).padStart(2, '0')}`;
}

/**
 * Add citation to list (deduplicates papers)
 */
export function addCitation(
    citations: Citation[],
    newCitation: Omit<Citation, 'id' | 'ref_number'>
): CitationWithRef {
    // Check for duplicates (papers only)
    if (newCitation.type === 'paper') {
        const existing = citations.find(
            (c) =>
                c.type === 'paper' &&
                c.source === newCitation.source &&
                c.url === newCitation.url
        );

        if (existing && existing.ref_number !== undefined) {
            return existing as CitationWithRef;
        }
    }

    // Generate new citation
    const ref_number = citations.length + 1;
    const id = generateCitationId(newCitation.type, ref_number);

    const citation: CitationWithRef = {
        ...newCitation,
        id,
        ref_number,
    };

    citations.push(citation);
    return citation;
}

/**
 * Get citation by ID
 */
export function getCitation(
    citations: Citation[],
    id: string
): Citation | undefined {
    return citations.find((c) => c.id === id);
}

/**
 * Get citation by reference number
 */
export function getCitationByRef(
    citations: Citation[],
    ref_number: number
): Citation | undefined {
    return citations.find((c) => c.ref_number === ref_number);
}

/**
 * Format citations as markdown references section
 */
export function formatCitationsMarkdown(citations: Citation[]): string {
    if (citations.length === 0) {
        return '';
    }

    const lines: string[] = ['## References\n'];

    citations.forEach((citation) => {
        const refNum = citation.ref_number || 0;
        const prefix = `[${refNum}]`;

        switch (citation.type) {
            case 'rag':
                lines.push(
                    `${prefix} **Knowledge Base** - ${citation.source}\n   > ${citation.content.substring(0, 100)}...`
                );
                break;
            case 'web':
                lines.push(
                    `${prefix} **Web** - [${citation.source}](${citation.url})\n   > ${citation.content.substring(0, 100)}...`
                );
                break;
            case 'paper':
                lines.push(
                    `${prefix} **Paper** - ${citation.source}${citation.url ? ` - [Link](${citation.url})` : ''}\n   > ${citation.content.substring(0, 100)}...`
                );
                break;
            case 'code':
                lines.push(
                    `${prefix} **Code Execution**\n   \`\`\`\n   ${citation.content.substring(0, 100)}...\n   \`\`\``
                );
                break;
            case 'plan':
                lines.push(`${prefix} **Planning** - ${citation.source}`);
                break;
            default:
                lines.push(`${prefix} ${citation.source} - ${citation.content.substring(0, 100)}...`);
        }

        lines.push('');
    });

    return lines.join('\n');
}

/**
 * Format inline citation
 */
export function formatInlineCitation(ref_number: number): string {
    return `[${ref_number}]`;
}

/**
 * Extract citation references from text
 * Finds all [N] patterns and returns unique numbers
 */
export function extractCitationRefs(text: string): number[] {
    const regex = /\[(\d+)\]/g;
    const refs = new Set<number>();
    let match;

    while ((match = regex.exec(text)) !== null) {
        refs.add(parseInt(match[1], 10));
    }

    return Array.from(refs).sort((a, b) => a - b);
}

/**
 * Validate all citations in text exist
 */
export function validateCitations(
    text: string,
    citations: Citation[]
): { valid: boolean; missing: number[] } {
    const refs = extractCitationRefs(text);
    const missing: number[] = [];

    refs.forEach((ref) => {
        if (!getCitationByRef(citations, ref)) {
            missing.push(ref);
        }
    });

    return {
        valid: missing.length === 0,
        missing,
    };
}
