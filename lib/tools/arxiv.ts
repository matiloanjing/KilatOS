/**
 * Arxiv Tool - Academic Paper Search
 * Copyright © 2025 KilatCode Studio
 */

export interface ArxivPaper {
    id: string;
    title: string;
    abstract: string;
    authors: string[];
    published: string;
    updated: string;
    url: string;
    pdfUrl: string;
    categories: string[];
}

/**
 * Search Arxiv papers
 * Uses Arxiv API v1
 */
export async function searchPapers(
    query: string,
    maxResults: number = 5
): Promise<ArxivPaper[]> {
    const apiUrl = 'http://export.arxiv.org/api/query';
    const params = new URLSearchParams({
        search_query: `all:${query}`,
        start: '0',
        max_results: maxResults.toString(),
        sortBy: 'relevance',
        sortOrder: 'descending',
    });

    const response = await fetch(`${apiUrl}?${params}`);

    if (!response.ok) {
        throw new Error(`Arxiv API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const papers = parseArxivXML(xmlText);

    return papers.slice(0, maxResults);
}

/**
 * Parse Arxiv API XML response
 */
function parseArxivXML(xml: string): ArxivPaper[] {
    const papers: ArxivPaper[] = [];

    // Simple regex-based XML parsing (good enough for Arxiv's consistent format)
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
        const entry = match[1];

        const paper: ArxivPaper = {
            id: extractTag(entry, 'id')?.replace('http://arxiv.org/abs/', '') || '',
            title: cleanText(extractTag(entry, 'title') || ''),
            abstract: cleanText(extractTag(entry, 'summary') || ''),
            authors: extractAuthors(entry),
            published: extractTag(entry, 'published') || '',
            updated: extractTag(entry, 'updated') || '',
            url: extractTag(entry, 'id') || '',
            pdfUrl: extractPdfUrl(entry),
            categories: extractCategories(entry),
        };

        papers.push(paper);
    }

    return papers;
}

function extractTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
}

function extractAuthors(xml: string): string[] {
    const authorRegex = /<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g;
    const authors: string[] = [];
    let match;

    while ((match = authorRegex.exec(xml)) !== null) {
        authors.push(match[1].trim());
    }

    return authors;
}

function extractPdfUrl(xml: string): string {
    const linkRegex = /<link[^>]*title="pdf"[^>]*href="([^"]+)"/i;
    const match = xml.match(linkRegex);
    return match ? match[1] : '';
}

function extractCategories(xml: string): string[] {
    const categoryRegex = /<category[^>]*term="([^"]+)"/g;
    const categories: string[] = [];
    let match;

    while ((match = categoryRegex.exec(xml)) !== null) {
        categories.push(match[1]);
    }

    return categories;
}

function cleanText(text: string): string {
    return text
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

/**
 * Format papers for LLM context
 */
export function formatPapersContext(papers: ArxivPaper[]): string {
    if (papers.length === 0) {
        return 'No papers found.';
    }

    const formatted = papers.map((paper, index) => {
        const authors = paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ', et al.' : '');

        return `[Paper ${index + 1}] ${paper.title}
Authors: ${authors}
Published: ${new Date(paper.published).toLocaleDateString()}
Categories: ${paper.categories.join(', ')}
URL: ${paper.url}
PDF: ${paper.pdfUrl}

Abstract: ${paper.abstract.substring(0, 300)}${paper.abstract.length > 300 ? '...' : ''}`;
    });

    return formatted.join('\n\n---\n\n');
}
