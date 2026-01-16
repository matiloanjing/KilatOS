/**
 * KilatCrawl API Route
 * Unified web crawling endpoint with auto-mode detection
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { KilatCrawler, type CrawlConfig } from '@/lib/agents/crawl/kilatcrawl';

// Request validation schema
const CrawlRequestSchema = z.object({
    url: z.string().url(),
    mode: z.enum(['auto', 'light', 'medium', 'heavy']).optional().default('auto'),
    maxPages: z.number().min(1).max(100).optional().default(1),
    depth: z.number().min(0).max(3).optional().default(0),
    summarize: z.boolean().optional().default(false),
    extractSchema: z.any().optional(),
    options: z.object({
        timeout: z.number().optional(),
        screenshot: z.boolean().optional().default(false),
        extractLinks: z.boolean().optional().default(true),
        firecrawlApiKey: z.string().optional()
    }).optional()
});

export async function POST(req: NextRequest) {
    try {
        // Validate request
        const body = await req.json();
        const validatedData = CrawlRequestSchema.parse(body);

        console.log(`🕷️ KilatCrawl API: ${validatedData.url} (mode: ${validatedData.mode})`);

        // Create crawler
        const crawler = new KilatCrawler();

        // Execute crawl
        const result = await crawler.crawl(validatedData as CrawlConfig);

        // Return result
        return NextResponse.json({
            success: result.success,
            mode: result.mode,
            pages: result.pages,
            data: {
                url: result.url,
                markdown: result.markdown,
                summary: result.summary,
                extracted: result.extracted,
                links: result.links,
                images: result.images,
                screenshot: result.screenshot,
                metadata: result.metadata
            },
            error: result.error
        });

    } catch (error) {
        console.error('KilatCrawl API error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET endpoint for documentation
export async function GET(req: NextRequest) {
    return NextResponse.json({
        name: 'KilatCrawl API',
        version: '2.0.0',
        description: 'Unified web crawler with intelligent 3-mode system',
        branding: 'Powered by KilatCode Studio',

        modes: {
            auto: {
                name: 'Auto (Recommended)',
                description: 'Smart detection - chooses best mode automatically',
                engine: 'Jina Reader / Firecrawl / Playwright',
                speed: 'Fast to Medium',
                vercelCompatible: true
            },
            light: {
                name: 'Light',
                description: 'Fast single/multi-page crawling (1-5 pages)',
                engine: 'Jina Reader',
                speed: 'Very Fast (<5s)',
                vercelCompatible: true,
                free: true
            },
            medium: {
                name: 'Medium',
                description: 'Whole site crawling (up to 500 pages)',
                engine: 'Firecrawl',
                speed: 'Medium (30s-5min)',
                vercelCompatible: true,
                free: '500 pages/month (requires API key)'
            },
            heavy: {
                name: 'Heavy',
                description: 'Complex JS sites, screenshots, full control',
                engine: 'Playwright',
                speed: 'Slow (10-60s per page)',
                vercelCompatible: false,
                note: 'Requires container deployment (Fly.io/Railway)'
            }
        },

        features: [
            '🤖 Auto mode detection',
            '🕷️ 3-engine system (Jina/Firecrawl/Playwright)',
            '📄 Single & multi-page crawling',
            '📝 Summary generation (gittodoc-style)',
            '🔗 Link extraction',
            '🖼️ Image extraction',
            '📸 Screenshot capture (heavy mode)',
            '⚡ Vercel-compatible (light/medium modes)',
            '🆓 Free tier available (Jina unlimited, Firecrawl 500/month)'
        ],

        examples: {
            quick_single_page: {
                description: 'Quick crawl of single page (auto mode)',
                request: {
                    url: 'https://example.com',
                    mode: 'auto'
                }
            },

            multi_page_with_summary: {
                description: 'Crawl 3 pages and generate summary',
                request: {
                    url: 'https://docs.example.com',
                    mode: 'light',
                    maxPages: 3,
                    summarize: true
                }
            },

            whole_docs_site: {
                description: 'Crawl entire documentation site',
                request: {
                    url: 'https://docs.example.com',
                    mode: 'medium',
                    maxPages: 50,
                    depth: 2,
                    summarize: true,
                    options: {
                        firecrawlApiKey: 'your-api-key'
                    }
                }
            },

            complex_with_screenshot: {
                description: 'Heavy crawl with screenshot',
                request: {
                    url: 'https://example.com/app',
                    mode: 'heavy',
                    options: {
                        screenshot: true,
                        extractLinks: true
                    }
                },
                note: 'Requires container deployment'
            }
        },

        limits: {
            light: '5 pages max per request (Vercel timeout limit)',
            medium: '100 pages max per request, 500 pages/month free',
            heavy: '1 page per request (recommended), requires container'
        },

        quickStart: {
            step1: 'Choose mode (or use auto)',
            step2: 'Set maxPages for multi-page crawling',
            step3: 'Enable summarize for gittodoc-style summaries',
            step4: 'For whole sites, use medium mode with Firecrawl API key'
        }
    });
}
