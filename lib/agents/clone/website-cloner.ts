/**
 * Website Cloner - Multi-Agent Orchestrator
 * 
 * Coordinates the full website cloning pipeline:
 * 1. CRAWL: Extract HTML, CSS, images from target site
 * 2. ANALYZE: Extract design tokens (colors, fonts, layout)
 * 3. GENERATE: Create React components matching the design
 * 4. VERIFY: Review and improve the generated code
 * 5. MERGE: Combine all files into final output
 * 
 * Uses tier-based models from Pollinations AI
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { KilatCrawler } from '@/lib/agents/crawl/kilatcrawl';
import { chatCompletion } from '@/lib/ai/pollination-client';
import { getModelForTier, getUserTier, enforceTierModel, UserTier } from '@/lib/auth/user-tier';

// ============================================================================
// Types
// ============================================================================

export interface CloneRequest {
    url: string;
    userId?: string;
    options?: {
        includeImages?: boolean;  // Replace with placeholders by default
        targetFramework?: 'react' | 'nextjs' | 'vanilla';
        styleSystem?: 'tailwind' | 'css' | 'styled-components';
    };
}

export interface WebsiteAnalysis {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
        gradients?: string[];
    };
    fonts: {
        heading: string;
        body: string;
        googleFontsImport?: string;
    };
    layout: {
        type: 'hero-centric' | 'grid-based' | 'sidebar' | 'dashboard' | 'landing';
        sections: string[];
        hasNavbar: boolean;
        hasFooter: boolean;
        hasSidebar: boolean;
    };
    components: Array<{
        type: 'navbar' | 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'footer' | 'card' | 'form';
        description: string;
        estimatedLines?: number;
    }>;
    content: {
        title: string;
        tagline?: string;
        mainSections: Array<{ heading: string; summary: string }>;
    };
    meta: {
        originalUrl: string;
        crawledAt: Date;
        difficulty: 'simple' | 'medium' | 'complex';
    };
}

export interface CloneResult {
    success: boolean;
    files: Record<string, string>;  // path -> content
    analysis: WebsiteAnalysis;
    stats: {
        totalComponents: number;
        totalLines: number;
        crawlTime: number;
        analyzeTime: number;
        generateTime: number;
        verifyTime: number;
        totalTime: number;
    };
    errors?: string[];
}

// ============================================================================
// Website Cloner (Orchestrator)
// ============================================================================

export class WebsiteCloner {
    private crawler: KilatCrawler;
    private tier: UserTier = 'free';

    constructor() {
        this.crawler = new KilatCrawler();
    }

    /**
     * Main clone function - orchestrates the full pipeline
     */
    async clone(request: CloneRequest): Promise<CloneResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        console.log(`\n🎨 WebsiteCloner: Starting clone of ${request.url}`);
        console.log('━'.repeat(60));

        // Get user tier for model selection
        this.tier = await getUserTier(request.userId);
        console.log(`📊 User tier: ${this.tier}`);

        try {
            // ================================================================
            // PHASE 1: CRAWL (Worker 1)
            // ================================================================
            const crawlStart = Date.now();
            console.log('\n📥 Phase 1: CRAWL');

            const crawlResult = await this.crawler.crawl({
                url: request.url,
                mode: 'auto',  // Let KilatCrawl decide (Jina/Firecrawl/Playwright)
                options: {
                    extractLinks: true,
                }
            });

            if (!crawlResult.success) {
                throw new Error(`Crawl failed: ${crawlResult.error}`);
            }

            const crawlTime = Date.now() - crawlStart;
            console.log(`   ✅ Crawl complete (${crawlTime}ms) - Mode: ${crawlResult.mode}`);
            console.log(`   📄 Content length: ${crawlResult.markdown?.length || 0} chars`);

            // ================================================================
            // PHASE 2: ANALYZE (Worker 2) - Uses LLM
            // ================================================================
            const analyzeStart = Date.now();
            console.log('\n🔍 Phase 2: ANALYZE');

            const analysis = await this.analyzeWebsite(
                crawlResult.markdown || '',
                request.url
            );

            const analyzeTime = Date.now() - analyzeStart;
            console.log(`   ✅ Analysis complete (${analyzeTime}ms)`);
            console.log(`   🎨 Colors: ${analysis.colors.primary}, ${analysis.colors.secondary}`);
            console.log(`   📝 Fonts: ${analysis.fonts.heading}, ${analysis.fonts.body}`);
            console.log(`   📐 Layout: ${analysis.layout.type} with ${analysis.components.length} components`);

            // ================================================================
            // PHASE 3: GENERATE (Worker 3) - Uses LLM
            // ================================================================
            const generateStart = Date.now();
            console.log('\n⚡ Phase 3: GENERATE');

            const generatedFiles = await this.generateCode(
                analysis,
                request.options || {}
            );

            const generateTime = Date.now() - generateStart;
            console.log(`   ✅ Generation complete (${generateTime}ms)`);
            console.log(`   📁 Files: ${Object.keys(generatedFiles).join(', ')}`);

            // ================================================================
            // PHASE 4: VERIFY (Verifier) - Uses LLM
            // ================================================================
            const verifyStart = Date.now();
            console.log('\n🔬 Phase 4: VERIFY');

            const verifiedFiles = await this.verifyCode(generatedFiles, analysis);

            const verifyTime = Date.now() - verifyStart;
            console.log(`   ✅ Verification complete (${verifyTime}ms)`);

            // ================================================================
            // PHASE 5: MERGE (Merger)
            // ================================================================
            console.log('\n📦 Phase 5: MERGE');

            const finalFiles = this.mergeFiles(verifiedFiles, analysis);

            const totalTime = Date.now() - startTime;
            console.log(`   ✅ Merge complete`);
            console.log(`\n✨ Clone complete in ${totalTime}ms`);
            console.log('━'.repeat(60));

            return {
                success: true,
                files: finalFiles,
                analysis,
                stats: {
                    totalComponents: analysis.components.length,
                    totalLines: Object.values(finalFiles).reduce((sum, content) =>
                        sum + content.split('\n').length, 0),
                    crawlTime,
                    analyzeTime,
                    generateTime,
                    verifyTime,
                    totalTime,
                },
            };

        } catch (error) {
            console.error('❌ Clone failed:', error);
            errors.push(error instanceof Error ? error.message : String(error));

            return {
                success: false,
                files: {},
                analysis: this.getEmptyAnalysis(request.url),
                stats: {
                    totalComponents: 0,
                    totalLines: 0,
                    crawlTime: 0,
                    analyzeTime: 0,
                    generateTime: 0,
                    verifyTime: 0,
                    totalTime: Date.now() - startTime,
                },
                errors,
            };
        }
    }

    // ========================================================================
    // WORKER 2: Analyze Website
    // ========================================================================

    private async analyzeWebsite(markdown: string, url: string): Promise<WebsiteAnalysis> {
        const model = enforceTierModel(getModelForTier(this.tier, 'text'), this.tier, 'text');

        const prompt = `Analyze this website content and extract design information.

URL: ${url}

Content (markdown):
${markdown.substring(0, 8000)}

Return a JSON object with this exact structure:
{
    "colors": {
        "primary": "#hex",
        "secondary": "#hex", 
        "accent": "#hex",
        "background": "#hex",
        "text": "#hex"
    },
    "fonts": {
        "heading": "Font Name",
        "body": "Font Name",
        "googleFontsImport": "@import url('...')"
    },
    "layout": {
        "type": "hero-centric|grid-based|sidebar|dashboard|landing",
        "sections": ["section1", "section2"],
        "hasNavbar": true,
        "hasFooter": true,
        "hasSidebar": false
    },
    "components": [
        {"type": "navbar", "description": "Dark navbar with logo and links"},
        {"type": "hero", "description": "Large hero with gradient background"}
    ],
    "content": {
        "title": "Site Title",
        "tagline": "Tagline if any",
        "mainSections": [{"heading": "Section", "summary": "Brief description"}]
    }
}

IMPORTANT: 
- Infer colors from descriptions (dark theme = dark colors, bright = light colors)
- Use modern fonts (Inter, Poppins, etc) if not specified
- Identify all major UI components
- Return ONLY valid JSON, no markdown`;

        try {
            const response = await chatCompletion(
                [{ role: 'user', content: prompt }],
                { model }
            );

            // Parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in analysis response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                ...parsed,
                meta: {
                    originalUrl: url,
                    crawledAt: new Date(),
                    difficulty: parsed.components?.length > 5 ? 'complex' :
                        parsed.components?.length > 2 ? 'medium' : 'simple',
                },
            };
        } catch (error) {
            console.warn('⚠️ Analysis failed, using defaults:', error);
            return this.getEmptyAnalysis(url);
        }
    }

    // ========================================================================
    // WORKER 3: Generate Code
    // ========================================================================

    private async generateCode(
        analysis: WebsiteAnalysis,
        options: CloneRequest['options']
    ): Promise<Record<string, string>> {
        const model = enforceTierModel(getModelForTier(this.tier, 'text'), this.tier, 'text');
        const framework = options?.targetFramework || 'react';
        const styleSystem = options?.styleSystem || 'tailwind';

        const prompt = `Generate a React website clone based on this analysis:

${JSON.stringify(analysis, null, 2)}

Requirements:
- Framework: ${framework}
- Styling: ${styleSystem}
- Must be a complete, working React application
- Include: App.tsx, index.css, and component files
- Use the exact colors and fonts from the analysis
- Create all components listed in the analysis

Generate the code as JSON with file paths as keys:
{
    "/App.tsx": "import React from 'react';...",
    "/index.css": "/* styles */...",
    "/components/Navbar.tsx": "..."
}

IMPORTANT:
- All files must be valid, runnable code
- Use Tailwind CSS classes matching the color scheme
- Include responsive design
- Return ONLY valid JSON, no markdown`;

        try {
            const response = await chatCompletion(
                [{ role: 'user', content: prompt }],
                { model }
            );

            // Parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in generation response');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.warn('⚠️ Generation failed, using fallback:', error);
            return this.getFallbackFiles(analysis);
        }
    }

    // ========================================================================
    // VERIFIER: Check and Improve Code
    // ========================================================================

    private async verifyCode(
        files: Record<string, string>,
        analysis: WebsiteAnalysis
    ): Promise<Record<string, string>> {
        // For FREE tier, skip heavy verification to save tokens
        if (this.tier === 'free') {
            console.log('   ⏩ Skipping deep verification (FREE tier)');
            return files;
        }

        const model = enforceTierModel(getModelForTier(this.tier, 'text'), this.tier, 'text');

        const prompt = `Review this React code and fix any issues:

Files:
${JSON.stringify(files, null, 2)}

Target Analysis:
${JSON.stringify(analysis, null, 2)}

Check for:
1. Missing imports
2. Syntax errors
3. Missing components referenced in imports
4. Color/style consistency with analysis
5. Responsive design issues

Return the FIXED code as JSON with the same file structure.
If the code is fine, return it unchanged.
Return ONLY valid JSON.`;

        try {
            const response = await chatCompletion(
                [{ role: 'user', content: prompt }],
                { model }
            );

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return files;  // Return original if parsing fails
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.warn('⚠️ Verification failed, using original:', error);
            return files;
        }
    }

    // ========================================================================
    // MERGER: Combine and Finalize
    // ========================================================================

    private mergeFiles(
        files: Record<string, string>,
        analysis: WebsiteAnalysis
    ): Record<string, string> {
        const merged: Record<string, string> = {};

        // Ensure all paths start with /
        for (const [path, content] of Object.entries(files)) {
            const normalizedPath = path.startsWith('/') ? path : `/${path}`;
            merged[normalizedPath] = content;
        }

        // Ensure we have required files
        if (!merged['/App.tsx'] && !merged['/App.jsx']) {
            merged['/App.tsx'] = this.generateAppFile(analysis);
        }

        if (!merged['/index.css'] && !merged['/styles.css']) {
            merged['/index.css'] = this.generateStylesFile(analysis);
        }

        return merged;
    }

    // ========================================================================
    // Fallback Generators
    // ========================================================================

    private getEmptyAnalysis(url: string): WebsiteAnalysis {
        return {
            colors: {
                primary: '#6366f1',
                secondary: '#8b5cf6',
                accent: '#ec4899',
                background: '#0f172a',
                text: '#f8fafc',
            },
            fonts: {
                heading: 'Inter',
                body: 'Inter',
                googleFontsImport: "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');",
            },
            layout: {
                type: 'landing',
                sections: ['hero', 'features', 'footer'],
                hasNavbar: true,
                hasFooter: true,
                hasSidebar: false,
            },
            components: [
                { type: 'navbar', description: 'Navigation bar' },
                { type: 'hero', description: 'Hero section' },
                { type: 'features', description: 'Features grid' },
                { type: 'footer', description: 'Footer' },
            ],
            content: {
                title: 'Cloned Website',
                tagline: 'Website clone',
                mainSections: [],
            },
            meta: {
                originalUrl: url,
                crawledAt: new Date(),
                difficulty: 'simple',
            },
        };
    }

    private getFallbackFiles(analysis: WebsiteAnalysis): Record<string, string> {
        return {
            '/App.tsx': this.generateAppFile(analysis),
            '/index.css': this.generateStylesFile(analysis),
        };
    }

    private generateAppFile(analysis: WebsiteAnalysis): string {
        return `import React from 'react';
import './index.css';

export default function App() {
    return (
        <div className="min-h-screen" style={{ backgroundColor: '${analysis.colors.background}', color: '${analysis.colors.text}' }}>
            {/* Navbar */}
            <nav className="px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '${analysis.colors.primary}' }}>
                <h1 className="text-xl font-bold">${analysis.content.title}</h1>
                <div className="space-x-4">
                    <a href="#" className="hover:opacity-80">Home</a>
                    <a href="#" className="hover:opacity-80">Features</a>
                    <a href="#" className="hover:opacity-80">Contact</a>
                </div>
            </nav>

            {/* Hero */}
            <section className="px-6 py-20 text-center">
                <h2 className="text-5xl font-bold mb-4" style={{ color: '${analysis.colors.primary}' }}>
                    ${analysis.content.title}
                </h2>
                <p className="text-xl opacity-80 mb-8">${analysis.content.tagline || 'Welcome to our website'}</p>
                <button 
                    className="px-8 py-3 rounded-lg font-semibold"
                    style={{ backgroundColor: '${analysis.colors.accent}', color: 'white' }}
                >
                    Get Started
                </button>
            </section>

            {/* Features */}
            <section className="px-6 py-16">
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    ${analysis.content.mainSections.slice(0, 3).map((section, i) => `
                    <div className="p-6 rounded-xl" style={{ backgroundColor: '${analysis.colors.secondary}20' }}>
                        <h3 className="text-xl font-bold mb-2">${section.heading}</h3>
                        <p className="opacity-80">${section.summary}</p>
                    </div>
                    `).join('')}
                </div>
            </section>

            {/* Footer */}
            <footer className="px-6 py-8 text-center opacity-60" style={{ backgroundColor: '${analysis.colors.primary}20' }}>
                <p>© 2026 ${analysis.content.title}. Cloned with KilatOS.</p>
            </footer>
        </div>
    );
}`;
    }

    private generateStylesFile(analysis: WebsiteAnalysis): string {
        return `${analysis.fonts.googleFontsImport || ''}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: '${analysis.fonts.body}', system-ui, sans-serif;
    background-color: ${analysis.colors.background};
    color: ${analysis.colors.text};
    line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
    font-family: '${analysis.fonts.heading}', system-ui, sans-serif;
    font-weight: 700;
}

/* Utility classes */
.min-h-screen { min-height: 100vh; }
.text-center { text-align: center; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 1rem; }

/* Spacing */
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.py-16 { padding-top: 4rem; padding-bottom: 4rem; }
.py-20 { padding-top: 5rem; padding-bottom: 5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-8 { margin-bottom: 2rem; }
.space-x-4 > * + * { margin-left: 1rem; }
.gap-8 { gap: 2rem; }
.p-6 { padding: 1.5rem; }

/* Flex & Grid */
.flex { display: flex; }
.grid { display: grid; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.max-w-6xl { max-width: 72rem; }
.mx-auto { margin-left: auto; margin-right: auto; }

/* Text sizes */
.text-xl { font-size: 1.25rem; }
.text-5xl { font-size: 3rem; }

/* Opacity */
.opacity-60 { opacity: 0.6; }
.opacity-80 { opacity: 0.8; }
.hover\\:opacity-80:hover { opacity: 0.8; }

/* Responsive */
@media (min-width: 768px) {
    .md\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}

/* Colors from analysis */
:root {
    --color-primary: ${analysis.colors.primary};
    --color-secondary: ${analysis.colors.secondary};
    --color-accent: ${analysis.colors.accent};
    --color-background: ${analysis.colors.background};
    --color-text: ${analysis.colors.text};
}`;
    }
}

// ============================================================================
// Export singleton
// ============================================================================

export const websiteCloner = new WebsiteCloner();
export default WebsiteCloner;
