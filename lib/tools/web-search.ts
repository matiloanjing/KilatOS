/**
 * Web Search Tool
 * Supports Perplexity and Brave Search APIs
 * Copyright © 2025 KilatCode Studio
 */

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    source?: string;
}

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

/**
 * Web search using Perplexity AI
 */
async function perplexitySearch(query: string, count: number = 5): Promise<SearchResult[]> {
    if (!PERPLEXITY_API_KEY) {
        throw new Error('Perplexity API key not configured');
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful search assistant. Provide concise, accurate answers with sources.',
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
            max_tokens: 1000,
            temperature: 0.2,
            top_p: 0.9,
            search_domain_filter: [],
            return_images: false,
            return_related_questions: false,
            search_recency_filter: 'month',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Perplexity search failed: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const citations = data.citations || [];

    // Parse citations into search results
    const results: SearchResult[] = citations.slice(0, count).map((citation: string, index: number) => {
        return {
            title: `Source ${index + 1}`,
            url: citation,
            snippet: content.substring(0, 200),
            source: 'perplexity',
        };
    });

    return results;
}

/**
 * Web search using Brave Search API
 */
async function braveSearch(query: string, count: number = 5): Promise<SearchResult[]> {
    if (!BRAVE_API_KEY) {
        throw new Error('Brave API key not configured');
    }

    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', count.toString());

    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': BRAVE_API_KEY,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Brave search failed: ${error}`);
    }

    const data = await response.json();
    const results: SearchResult[] = (data.web?.results || []).map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        source: 'brave',
    }));

    return results;
}

/**
 * Web search with automatic provider selection
 */
export async function webSearch(
    query: string,
    count: number = 5,
    provider: 'auto' | 'perplexity' | 'brave' = 'auto'
): Promise<SearchResult[]> {
    // Auto-select provider based on available API keys
    if (provider === 'auto') {
        if (PERPLEXITY_API_KEY) {
            provider = 'perplexity';
        } else if (BRAVE_API_KEY) {
            provider = 'brave';
        } else {
            throw new Error('No web search API configured. Please set PERPLEXITY_API_KEY or BRAVE_SEARCH_API_KEY');
        }
    }

    try {
        if (provider === 'perplexity') {
            return await perplexitySearch(query, count);
        } else {
            return await braveSearch(query, count);
        }
    } catch (error) {
        console.error(`Web search failed with ${provider}:`, error);
        throw error;
    }
}

/**
 * Format search results for LLM context
 */
export function formatSearchContext(results: SearchResult[]): string {
    if (results.length === 0) {
        return 'No web search results found.';
    }

    const formatted = results.map((result, index) => {
        return `[Web Source ${index + 1}] ${result.title}\nURL: ${result.url}\n${result.snippet}`;
    });

    return formatted.join('\n\n---\n\n');
}
