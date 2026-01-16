/**
 * KilatCrawl - Unified Web Crawler
 * 3-Mode intelligent crawling system
 * Copyright © 2025 KilatCode Studio
 */

// NOTE: Playwright is now called via VPS endpoint (http://8.215.50.218:3001)
// No local browser needed - Vercel friendly!
import { chatCompletion } from '@/lib/ai/pollination-client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type CrawlMode = 'auto' | 'light' | 'medium' | 'heavy';

export interface CrawlConfig {
    url: string;
    mode?: CrawlMode; // auto = smart detection, light = Jina, medium = Firecrawl, heavy = Playwright

    // For multi-page crawling
    maxPages?: number; // Default: 1 (single page), Max: 100
    depth?: number; // Crawl depth (0 = single page, 1 = +links, etc)

    // LLM options
    summarize?: boolean; // Generate summary (like gittodoc)
    extractSchema?: any; // Schema for structured extraction

    // User context (for model selection)
    userId?: string; // User ID for tier-based model selection
    model?: string; // LLM model to use (default: user's selected model)

    // Advanced options
    options?: {
        timeout?: number;
        screenshot?: boolean;
        extractLinks?: boolean;
        jinaApiKey?: string; // Optional Jina API key (enables search, PDF, images)
        firecrawlApiKey?: string; // Optional Firecrawl API key
    };
}

export interface CrawlResult {
    success: boolean;
    mode: 'light' | 'medium' | 'heavy'; // Which engine was used
    url: string;
    pages: number; // Number of pages crawled

    // Content
    markdown?: string;
    summary?: string;
    extracted?: any;

    // Metadata
    links?: string[];
    images?: string[];
    screenshot?: string; // base64

    metadata: {
        title: string;
        description?: string;
        crawledAt: Date;
        duration: number;
        engine: string;
    };

    error?: string;
}

// ============================================================================
// MAIN KILATCRAWL CLASS
// ============================================================================

export class KilatCrawler {
    // Using 'any' type because Playwright is called via VPS endpoint, not imported locally
    private browser?: any;
    private page?: any;
    private currentConfig?: CrawlConfig; // Store config for LLM calls

    /**
     * Main crawl function - auto-detects best mode
     */
    async crawl(config: CrawlConfig): Promise<CrawlResult> {
        const startTime = Date.now();

        // Auto-detect mode if not specified
        const mode = config.mode === 'auto' || !config.mode
            ? this.detectBestMode(config)
            : config.mode;

        console.log(`🕷️ KilatCrawl: Using ${mode} mode for ${config.url}`);

        // Store config for use in LLM calls
        this.currentConfig = config;

        try {
            let result: CrawlResult;

            switch (mode) {
                case 'light':
                    result = await this.crawlLight(config, startTime);
                    break;
                case 'medium':
                    result = await this.crawlMedium(config, startTime);
                    break;
                case 'heavy':
                    result = await this.crawlHeavy(config, startTime);
                    break;
                default:
                    throw new Error(`Unknown mode: ${mode}`);
            }

            // Generate summary if requested
            if (config.summarize && result.markdown) {
                result.summary = await this.generateSummary(result.markdown, config.url);
            }

            return result;

        } catch (error) {
            console.error('KilatCrawl error:', error);
            return {
                success: false,
                mode: mode as any,
                url: config.url,
                pages: 0,
                metadata: {
                    title: '',
                    crawledAt: new Date(),
                    duration: Date.now() - startTime,
                    engine: mode
                },
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        } finally {
            await this.cleanup();
        }
    }

    // ========================================================================
    // MODE 1: LIGHT (Jina Reader) - Vercel-friendly, fast
    // ========================================================================

    private async crawlLight(config: CrawlConfig, startTime: number): Promise<CrawlResult> {
        const maxPages = Math.min(config.maxPages || 1, 5); // Limit to 5 for Vercel timeout
        const urls = [config.url];

        // If multi-page, get links first
        if (maxPages > 1) {
            const initialContent = await this.fetchJina(config.url);
            const additionalLinks = await this.extractLinksWithLLM(initialContent, config.url, maxPages - 1);
            urls.push(...additionalLinks);
        }

        // Fetch all pages in parallel (Promise.all)
        console.log(`📄 Jina: Fetching ${urls.length} pages in parallel`);
        const jinaOptions = config.options?.jinaApiKey ? {
            apiKey: config.options.jinaApiKey,
            jsonSchema: config.extractSchema
        } : undefined;

        const contents = await Promise.all(
            urls.map(url => this.fetchJina(url, jinaOptions).catch(err => {
                console.error(`Failed to fetch ${url}:`, err);
                return '';
            }))
        );

        // Combine all content
        const markdown = contents.filter(c => c).join('\n\n--- PAGE BREAK ---\n\n');

        // Extract links and images
        const links = this.extractLinksFromMarkdown(markdown);
        const images = this.extractImagesFromMarkdown(markdown);

        return {
            success: true,
            mode: 'light',
            url: config.url,
            pages: urls.length,
            markdown,
            links,
            images,
            metadata: {
                title: this.extractTitleFromMarkdown(markdown),
                description: markdown.substring(0, 200),
                crawledAt: new Date(),
                duration: Date.now() - startTime,
                engine: 'Jina Reader'
            }
        };
    }

    /**
     * Fetch page using Jina Reader API
     * With API key: supports PDF, images, search, structured extraction
     */
    private async fetchJina(url: string, options?: {
        apiKey?: string;
        jsonSchema?: any;
        withSearch?: boolean;
    }): Promise<string> {
        // Detect URL type
        const isPDF = url.toLowerCase().endsWith('.pdf');
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

        // Use appropriate Jina endpoint
        let jinaUrl: string;
        if (options?.withSearch) {
            // Search API (requires API key)
            jinaUrl = `https://s.jina.ai/${url}`;
        } else {
            // Reader API
            jinaUrl = `https://r.jina.ai/${url}`;
        }

        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'X-Timeout': '10'
        };

        // Add API key if provided (enables advanced features)
        if (options?.apiKey) {
            headers['Authorization'] = `Bearer ${options.apiKey}`;

            // Enable structured extraction if schema provided
            if (options.jsonSchema) {
                headers['X-Json-Schema'] = JSON.stringify(options.jsonSchema);
                headers['X-Respond-With'] = 'readerlm-v2'; // Use ReaderLM v2 for JSON
            }
        }

        const response = await fetch(jinaUrl, { headers });

        if (!response.ok) {
            throw new Error(`Jina fetch failed: ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.data?.content || data.content || '';
    }

    /**
     * Extract important links using LLM
     */
    private async extractLinksWithLLM(markdown: string, baseUrl: string, count: number): Promise<string[]> {
        const prompt = `From this content, find the ${count} most important links that would be valuable to read.
Return ONLY a JSON array of URLs (absolute URLs).

Content:
${markdown.substring(0, 3000)}

Response format: ["url1", "url2", ...]`;

        try {
            const response = await chatCompletion(
                [{ role: 'user', content: prompt }],
                { model: this.currentConfig?.model || 'gemini-fast', temperature: 0.1 }
            );

            const links = JSON.parse(response);
            return Array.isArray(links) ? links.slice(0, count) : [];
        } catch (error) {
            console.error('Failed to extract links:', error);
            return [];
        }
    }

    // ========================================================================
    // MODE 2: MEDIUM (Firecrawl) - Whole site crawling
    // ========================================================================

    private async crawlMedium(config: CrawlConfig, startTime: number): Promise<CrawlResult> {
        const apiKey = config.options?.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;

        if (!apiKey) {
            throw new Error('Firecrawl API key required for medium mode. Get free key at firecrawl.dev');
        }

        const maxPages = Math.min(config.maxPages || 10, 500); // Firecrawl free tier: 500/month

        console.log(`🔥 Firecrawl: Crawling up to ${maxPages} pages`);

        // Start crawl job
        const crawlResponse = await fetch('https://api.firecrawl.dev/v0/crawl', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: config.url,
                crawlerOptions: {
                    maxDepth: config.depth || 2,
                    limit: maxPages
                },
                pageOptions: {
                    onlyMainContent: true
                }
            })
        });

        if (!crawlResponse.ok) {
            throw new Error(`Firecrawl API error: ${crawlResponse.statusText}`);
        }

        const crawlData = await crawlResponse.json() as any;
        const jobId = crawlData.jobId;

        // Poll for completion
        let completed = false;
        let attempts = 0;
        let result: any;

        while (!completed && attempts < 30) { // Max 30 attempts (5 minutes)
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

            const statusResponse = await fetch(`https://api.firecrawl.dev/v0/crawl/status/${jobId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            const statusData = await statusResponse.json() as any;

            if (statusData.status === 'completed') {
                completed = true;
                result = statusData;
            } else if (statusData.status === 'failed') {
                throw new Error('Firecrawl job failed');
            }

            attempts++;
        }

        if (!completed) {
            throw new Error('Firecrawl timeout');
        }

        // Process results
        const pages = result.data || [];
        const markdown = pages.map((p: any) => p.markdown || '').join('\n\n--- PAGE BREAK ---\n\n');
        const links = pages.flatMap((p: any) => p.links || []);

        return {
            success: true,
            mode: 'medium',
            url: config.url,
            pages: pages.length,
            markdown,
            links,
            metadata: {
                title: pages[0]?.metadata?.title || '',
                description: pages[0]?.metadata?.description,
                crawledAt: new Date(),
                duration: Date.now() - startTime,
                engine: 'Firecrawl'
            }
        };
    }

    // ========================================================================
    // MODE 3: HEAVY (VPS Playwright) - Complex JS sites, screenshots
    // Calls VPS at http://8.215.50.218:3001/crawl (Vercel-friendly!)
    // ========================================================================

    private async crawlHeavy(config: CrawlConfig, startTime: number): Promise<CrawlResult> {
        const VPS_PLAYWRIGHT_URL = process.env.VPS_PLAYWRIGHT_URL || 'http://8.215.50.218:3001';

        console.log(`🎭 Playwright VPS: Calling ${VPS_PLAYWRIGHT_URL}/crawl`);

        try {
            const response = await fetch(`${VPS_PLAYWRIGHT_URL}/crawl`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: config.url }),
            });

            if (!response.ok) {
                throw new Error(`VPS Playwright error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'VPS crawl failed');
            }

            // Convert HTML to markdown
            const markdown = this.htmlToMarkdown(data.html || '');

            // Extract links from HTML if requested
            let links: string[] = [];
            if (config.options?.extractLinks && data.html) {
                const linkMatches = data.html.match(/href="(https?:\/\/[^"]+)"/g) || [];
                links = linkMatches.map((m: string) => m.replace(/href="|"/g, ''));
            }

            return {
                success: true,
                mode: 'heavy',
                url: config.url,
                pages: 1,
                markdown,
                links,
                metadata: {
                    title: data.title || 'Untitled',
                    crawledAt: new Date(),
                    duration: Date.now() - startTime,
                    engine: 'Playwright VPS'
                }
            };
        } catch (error) {
            console.error('❌ VPS Playwright failed:', error);

            // Fallback to Jina Reader if VPS is down
            console.log('🔄 Falling back to Jina Reader...');
            return this.crawlLight(config, startTime);
        }
    }

    private async extractLinksPlaywright(): Promise<string[]> {
        if (!this.page) return [];

        return await this.page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => (a as HTMLAnchorElement).href)
                .filter(href => href.startsWith('http'));
        });
    }

    // ========================================================================
    // SMART MODE DETECTION
    // ========================================================================

    private detectBestMode(config: CrawlConfig): 'light' | 'medium' | 'heavy' {
        // Heavy mode triggers
        if (config.options?.screenshot) return 'heavy';

        // Medium mode triggers
        if ((config.maxPages || 1) > 5) return 'medium';
        if ((config.depth || 0) > 0) return 'medium';

        // Default to light (fastest, Vercel-friendly)
        return 'light';
    }

    // ========================================================================
    // SUMMARY GENERATION (like gittodoc.com)
    // ========================================================================

    private async generateSummary(markdown: string, url: string): Promise<string> {
        const prompt = `Create a concise summary of this content from ${url}.

Focus on:
- Main topics covered
- Key features/capabilities
- Important links or resources
- Quick start or getting started info

Content (truncated):
${markdown.substring(0, 8000)}

Return a well-structured markdown summary (max 500 words).`;

        return await chatCompletion(
            [{ role: 'user', content: prompt }],
            { model: this.currentConfig?.model || 'gemini-fast', temperature: 0.3 } // Use user's model
        );
    }

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    private extractLinksFromMarkdown(md: string): string[] {
        const linkRegex = /\[.*?\]\((https?:\/\/[^\)]+)\)/g;
        const matches = [...md.matchAll(linkRegex)];
        return [...new Set(matches.map(m => m[1]))];
    }

    private extractImagesFromMarkdown(md: string): string[] {
        const imgRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
        const matches = [...md.matchAll(imgRegex)];
        return [...new Set(matches.map(m => m[1]))];
    }

    private extractTitleFromMarkdown(md: string): string {
        const match = md.match(/^#\s+(.+)$/m);
        return match ? match[1] : 'Untitled';
    }

    private htmlToMarkdown(html: string): string {
        // Simple HTML to markdown (basic version)
        return html
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<style[^>]*>.*?<\/style>/gis, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    public async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = undefined;
            this.page = undefined;
        }
    }
}

// ============================================================================
// SIMPLE HELPER FUNCTION
// ============================================================================

export async function crawl(url: string, options?: Partial<CrawlConfig>): Promise<CrawlResult> {
    const crawler = new KilatCrawler();
    return await crawler.crawl({ url, ...options });
}

export const kilatCrawl = { crawl };
