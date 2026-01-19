/**
 * KilatOS App Registry
 * 
 * Registers all 9 agents as KilatApps.
 * Each wrapper connects existing agent to KilatOS.
 * 
 * Philosophy:
 * - No rewriting existing code
 * - Just wrap with thin adapter
 * - Preserve ALL functionality
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { kilatOS } from './kilat-os';
import { BaseKilatApp, KilatResponse, KilatContext } from './kilat-app';

// Import existing agents
import KilatCode from '@/lib/agents/codegen';
// Note: kilatRAG will be implemented in future phase

// Helper: Estimate tokens from text (avg ~3 chars/token for mixed ID/EN)
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 3);
}

// Helper: Build prompt with RAG context (if available)
function buildPromptWithRAG(basePrompt: string, userInput: string, context?: KilatContext): string {
    const ragSection = context?.ragContext
        ? `\n\n## KNOWLEDGE BASE CONTEXT:\nUse this verified information to answer:\n\n${context.ragContext}\n\n## USER REQUEST:\n`
        : '\n\n## USER REQUEST:\n';

    return `${basePrompt}${ragSection}${userInput}`;
}

// ============================================================================
// KilatCode App Wrapper
// ============================================================================

class KilatCodeApp extends BaseKilatApp {
    readonly name = 'KilatCode';
    readonly description = 'Generate production-ready code with DeepCode-style planning';
    readonly icon = '💻';
    readonly triggers = [
        'buat', 'buatkan', 'generate', 'code', 'program', 'kode',
        'aplikasi', 'website', 'web', 'app', 'function', 'fungsi',
        'component', 'komponen', 'api', 'backend', 'frontend',
        'react', 'next', 'typescript', 'javascript', 'python'
    ];
    readonly capabilities = ['code', 'test', 'lint', 'explain'];

    // Keywords that indicate complex project needing multi-agent
    private complexProjectTriggers = [
        'seperti', 'like', 'clone', 'full', 'lengkap', 'complete',
        'website', 'aplikasi', 'app', 'platform', 'system', 'e-commerce',
        'spotify', 'netflix', 'twitter', 'instagram', 'tiktok', 'uber',
        'dashboard', 'admin panel', 'cms', 'marketplace', 'saas'
    ];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            // ==============================================================
            // CLONE MODE: Detect "clone https://..." requests
            // ==============================================================
            const cloneMatch = input.match(/clone\s+(https?:\/\/[^\s]+)/i);
            const urlOnlyMatch = !cloneMatch && input.match(/(https?:\/\/[^\s]+)/i);
            const isCloneRequest = cloneMatch ||
                (urlOnlyMatch && /clone|copy|replicate|tirukan|tiru/i.test(input));

            if (isCloneRequest) {
                const url = (cloneMatch && cloneMatch[1]) || (urlOnlyMatch && urlOnlyMatch[1]);
                if (url) {
                    console.log('   🎨 Clone mode detected, using WebsiteCloner');
                    return await this.executeClone(url, context);
                }
            }

            // ==============================================================
            // STANDARD CODE GENERATION
            // FIX 2026-01-16: RESPECT USER'S EXPLICIT MODE SELECTION
            // When user selects 'planning' mode, ALWAYS use Multi-Agent
            // regardless of detectComplexProject() result
            // ==============================================================
            const userSelectedMode = (context as any)?.executionMode;
            const isUserPlanningMode = userSelectedMode === 'planning';
            const isComplexProject = this.detectComplexProject(input);

            // Log mode decision for debugging
            console.log(`   🎯 Mode decision: userMode=${userSelectedMode}, isComplex=${isComplexProject}`);

            if (isUserPlanningMode || isComplexProject) {
                console.log('   🎭 Using Multi-Agent Orchestrator (Planning mode or complex project)');
                return await this.executeMultiAgent(input, context);
            } else {
                console.log('   ⚡ Using Single-Agent Fast Path');
                return await this.executeSingleAgent(input, context);
            }
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Code generation failed');
        }
    }

    /**
     * Clone Website path - uses WebsiteCloner multi-agent
     */
    private async executeClone(url: string, context?: KilatContext): Promise<KilatResponse> {
        console.log(`   🌐 Cloning website: ${url}`);

        // Progress: Starting clone
        if (context?.onProgress) {
            await context.onProgress(10, 'Starting website clone...');
        }

        try {
            const { WebsiteCloner } = await import('@/lib/agents/clone/website-cloner');
            const cloner = new WebsiteCloner();

            // Progress: Crawling
            if (context?.onProgress) {
                await context.onProgress(20, 'Crawling website...');
            }

            const result = await cloner.clone({
                url,
                userId: context?.userId,
                options: {
                    targetFramework: 'react',
                    styleSystem: 'tailwind',
                },
            });

            // Progress: Complete
            if (context?.onProgress) {
                await context.onProgress(95, 'Clone complete!');
            }

            if (!result.success) {
                return {
                    success: false,
                    type: 'text',
                    content: `Clone failed: ${result.errors?.join(', ') || 'Unknown error'}`,
                    metadata: { agent: this.name, mode: 'clone' }
                };
            }

            // Format for display
            const fileContent = Object.entries(result.files)
                .map(([filename, content]) => `// ===== ${filename} =====\n${content}`)
                .join('\n\n');

            return {
                success: true,
                type: 'code',
                content: fileContent,
                // CRITICAL: data.files as Record for InstantPreview/WebContainer
                data: {
                    files: result.files
                },
                metadata: {
                    agent: this.name,
                    mode: 'clone',
                    sourceUrl: url,
                    files: Object.entries(result.files).map(([name, content]) => ({ name, content })),
                    analysis: result.analysis,
                    stats: result.stats,
                }
            };
        } catch (error) {
            console.error('❌ Clone execution failed:', error);
            return this.error(error instanceof Error ? error.message : 'Clone failed');
        }
    }

    /**
     * Detect if request is a complex project (needs multi-agent)
     */
    private detectComplexProject(input: string): boolean {
        const lowerInput = input.toLowerCase();
        const matchCount = this.complexProjectTriggers.filter(t => lowerInput.includes(t)).length;
        return matchCount >= 2;  // Need at least 2 triggers to be considered complex
    }

    /**
     * Multi-Agent path for complex projects
     */
    private async executeMultiAgent(input: string, context?: KilatContext): Promise<KilatResponse> {
        console.log('   🎭 Using Multi-Agent Orchestrator (complex project detected)');

        // Dynamic import to avoid circular dependencies
        const { orchestrator } = await import('@/lib/orchestrator/multi-agent');

        const result = await orchestrator.orchestrate(
            input,
            context?.userId,
            context?.sessionId,
            context?.onProgress,
            context?.selectedModel  // FIX: Pass user-selected model to orchestrator
        );

        if (!result.success) {
            return {
                success: false,
                type: 'text',
                content: `Multi-agent orchestration failed: ${result.summary}`,
                metadata: { agent: this.name, mode: 'multi-agent' }
            };
        }

        // Format files into readable output
        const fileContent = Object.entries(result.files)
            .map(([filename, content]) => `// ===== ${filename} =====\n${content}`)
            .join('\n\n');

        // Auto-save to file (Protection against HTTP timeout)
        const fs = await import('fs/promises');
        const resultPath = `./generated/${result.projectName || 'project'}_${Date.now()}.md`;
        try {
            await fs.mkdir('./generated', { recursive: true });
            await fs.writeFile(resultPath, fileContent || result.summary || 'No content generated');
            console.log(`   💾 Auto-saved to: ${resultPath}`);
        } catch (e) {
            console.warn('   ⚠️ Failed to auto-save:', e);
        }

        // Log usage to database
        try {
            const { usageTracker } = await import('@/lib/tracking/usage-tracker');
            await usageTracker.logUsage({
                userId: context?.userId || undefined,
                agentType: 'code',
                taskInput: input,
                taskComplexity: 'heavy',
                baseTemplateUsed: 'multi-agent-v1',
                enhancementsApplied: ['orchestrator', 'verifier'],
                qualityChecksRun: result.agentResults.map(r => r.taskId),
                aiProvider: 'multi-model',
                modelUsed: 'qwen-coder,deepseek,gemini',
                priority: 'high',
                success: result.success,
                outputText: (fileContent || result.summary || '').substring(0, 5000),
                qualityScore: result.agentResults.filter(r => r.success).length / result.agentResults.length,
                validationPassed: result.success,
                latencyMs: result.totalDuration
            });
            console.log('   📊 Multi-agent usage logged');
        } catch (e) {
            console.warn('   ⚠️ Failed to log usage:', e);
        }

        console.log('🔍 [DEBUG] result.summary preview:', result.summary?.substring(0, 200));
        console.log('🔍 [DEBUG] files count:', Object.keys(result.files).length);

        return {
            success: true,
            type: 'code',
            content: fileContent || result.summary,
            // CRITICAL: data.files as Record for InstantPreview/WebContainer
            // FIX 2026-01-16: Include summary for conversational output
            data: {
                files: result.files,  // Record<string, string> format
                summary: result.summary  // ✅ Conversational greeting for UI
            },
            metadata: {
                agent: this.name,
                mode: 'multi-agent',
                projectName: result.projectName,
                files: Object.entries(result.files).map(([name, content]) => ({ name, content })),  // Array for message display
                agentCount: result.agentResults.length,
                successfulAgents: result.agentResults.filter(r => r.success).length,
                totalDuration: result.totalDuration,
                savedTo: resultPath
            }
        };
    }

    /**
     * Single-Agent path for simple requests
     */
    private async executeSingleAgent(input: string, context?: KilatContext): Promise<KilatResponse> {
        const agent = new KilatCode();

        // Progress: Starting code generation
        if (context?.onProgress) {
            await context.onProgress(20, 'Starting code generation...');
        }

        const result = await agent.generateCode({
            mode: 'text2web',
            input: input,
            language: 'typescript',
            framework: context?.preferences?.codeStyle || undefined,
            options: {
                maxIterations: 3,
                includeTests: true,
                includeDocs: true
            },
            userId: context?.userId || undefined,
            // NEW: Pass progress callback to agent
            onProgress: context?.onProgress,
            // FIX: Pass selected model (Database-Driven)
            model: context?.selectedModel
        });

        if (!result) {
            return {
                success: false,
                type: 'text',
                content: 'Code generation returned no result. Please try again.',
                metadata: { agent: this.name, mode: 'single-agent' }
            };
        }

        let codeContent = 'Processing your request...';

        if (result.code && result.code.files && Object.keys(result.code.files).length > 0) {
            codeContent = Object.entries(result.code.files)
                .map(([file, code]) => `// ${file}\n${code}`)
                .join('\n\n');
        } else if (result.blueprint && result.blueprint.architecture) {
            codeContent = result.blueprint.architecture;
        } else if (result.status === 'failed' && result.errors && result.errors.length > 0) {
            codeContent = `Error: ${result.errors.map(e => e.message).join(', ')}`;
        }

        return {
            success: result.status === 'completed',
            type: 'code',
            content: codeContent,
            // CRITICAL: data.files as Record for InstantPreview/WebContainer
            data: {
                files: result.code?.files || {}  // Record<string, string> format
            },
            metadata: {
                agent: this.name,
                mode: 'single-agent',
                model: result.model || context?.selectedModel || 'unknown', // FIX: Include model for usage tracking
                costUsd: result.costUsd || 0,  // FIX: Include cost for usage tracking
                files: result.code?.files
                    ? Object.entries(result.code.files).map(([name, content]) => ({ name, content }))  // Array for message display
                    : [],
                status: result.status || 'unknown',
                iteration: result.iteration || 0,
                blueprint: result.blueprint || null
            }
        };
    }
}

// ============================================================================
// KilatSolve App Wrapper
// ============================================================================

class KilatSolveApp extends BaseKilatApp {
    readonly name = 'KilatSolve';
    readonly description = 'Solve math and science problems step-by-step';
    readonly icon = '🧮';
    readonly triggers = [
        'solve', 'hitung', 'berapa', 'math', 'matematika', 'calculate',
        'equation', 'persamaan', 'integral', 'derivative', 'turunan',
        'physics', 'fisika', 'chemistry', 'kimia', 'algebra', 'calculus'
    ];
    readonly capabilities = ['math', 'physics', 'chemistry', 'step-by-step'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        // TODO: Connect to actual KilatSolve agent
        // For now, use AI Mandor directly
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    'You are KilatSolve, a problem-solving AI. Solve this problem step-by-step with clear explanations:',
                    input,
                    context
                ),
                complexity: 'medium',
                priority: 'high'
            });

            return {
                success: true,
                type: 'math',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Problem solving failed');
        }
    }
}

// ============================================================================
// KilatGuide App Wrapper
// ============================================================================

class KilatGuideApp extends BaseKilatApp {
    readonly name = 'KilatGuide';
    readonly description = 'Create tutorials and educational content';
    readonly icon = '📚';
    readonly triggers = [
        'jelaskan', 'explain', 'tutorial', 'guide', 'panduan',
        'apa itu', 'what is', 'how to', 'cara', 'belajar', 'learn',
        'pengertian', 'definisi', 'konsep', 'concept',
        'siapa', 'who is', 'founder', 'pendiri', 'creator', 'pembuat',
        'kapan', 'when', 'dimana', 'where', 'mengapa', 'why', 'berapa', 'how much'
    ];
    readonly capabilities = ['tutorial', 'explanation', 'learning'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    'You are KilatGuide, an educational AI. Create a clear, step-by-step tutorial or explanation:',
                    input,
                    context
                ),
                complexity: 'medium',
                priority: 'high'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Tutorial generation failed');
        }
    }
}

// ============================================================================
// KilatWrite App Wrapper
// ============================================================================

class KilatWriteApp extends BaseKilatApp {
    readonly name = 'KilatWrite';
    readonly description = 'Create SEO-optimized content and articles';
    readonly icon = '✍️';
    readonly triggers = [
        'tulis', 'write', 'artikel', 'article', 'blog', 'essay',
        'content', 'konten', 'caption', 'copy', 'copywriting',
        'deskripsi', 'description', 'seo', 'draft'
    ];
    readonly capabilities = ['article', 'blog', 'seo', 'copywriting'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    'You are KilatWrite, a professional content writer. Write engaging, SEO-optimized content:',
                    input,
                    context
                ),
                complexity: 'medium',
                priority: 'high'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Content writing failed');
        }
    }
}

// ============================================================================
// KilatQuestion App Wrapper
// ============================================================================

class KilatQuestionApp extends BaseKilatApp {
    readonly name = 'KilatQuestion';
    readonly description = 'Generate quizzes and assessment questions';
    readonly icon = '❓';
    readonly triggers = [
        'quiz', 'kuis', 'soal', 'question', 'pertanyaan', 'test',
        'ujian', 'exam', 'assessment', 'latihan', 'exercise',
        'pilihan ganda', 'multiple choice'
    ];
    readonly capabilities = ['quiz', 'assessment', 'multiple-choice'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    'You are KilatQuestion. Generate assessment questions with answer key. Use the knowledge base context if provided:',
                    input,
                    context
                ),
                complexity: 'medium',
                priority: 'high'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Quiz generation failed');
        }
    }
}

// ============================================================================
// KilatResearch App Wrapper
// ============================================================================

class KilatResearchApp extends BaseKilatApp {
    readonly name = 'KilatResearch';
    readonly description = 'Conduct deep research and analysis';
    readonly icon = '🔍';
    readonly triggers = [
        'research', 'riset', 'analisis', 'analysis', 'investigate',
        'study', 'survey', 'literature', 'review', 'compare',
        'bandingkan', 'pros cons', 'kelebihan kekurangan'
    ];
    readonly capabilities = ['research', 'analysis', 'comparison'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    'You are KilatResearch. Based ONLY on the knowledge base context provided below, answer the question accurately. If the answer is in the context, use that exact information. Do NOT make up information.',
                    input,
                    context
                ),
                complexity: 'heavy',
                priority: 'high'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Research failed');
        }
    }
}

// ============================================================================
// KilatIdea App Wrapper
// ============================================================================

class KilatIdeaApp extends BaseKilatApp {
    readonly name = 'KilatIdea';
    readonly description = 'Brainstorm innovative ideas and solutions';
    readonly icon = '💡';
    readonly triggers = [
        'idea', 'ide', 'brainstorm', 'kreasi', 'creative', 'suggest',
        'saran', 'recommendation', 'inovasi', 'innovation', 'solusi',
        'solution', 'alternatif', 'alternative'
    ];
    readonly capabilities = ['brainstorm', 'innovation', 'creative'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    'You are KilatIdea. Generate 10+ innovative ideas with pros, cons, and feasibility. Use the knowledge base context if provided:',
                    input,
                    context
                ),
                complexity: 'medium',
                priority: 'high'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Brainstorming failed');
        }
    }
}

// ============================================================================
// KilatAudit App Wrapper (GitHub Audit)
// ============================================================================

class KilatAuditApp extends BaseKilatApp {
    readonly name = 'KilatAudit';
    readonly description = 'Audit code repositories for security and quality issues';
    readonly icon = '🛡️';
    readonly triggers = [
        'audit', 'cek', 'check', 'review', 'keamanan', 'security',
        'vulnerability', 'bug', 'issue', 'analyze repo', 'scan'
    ];
    readonly capabilities = ['audit', 'security', 'code-review'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    `You are KilatAudit, a friendly but thorough security expert. 

COMMUNICATION STYLE:
- Start with a greeting and explain what you'll analyze
- Describe your audit approach briefly
- For each finding, explain WHY it's an issue and WHAT could happen
- End with a helpful summary and next steps

Analyze this code/repository for security and quality issues:`,
                    input,
                    context
                ),
                complexity: 'heavy',
                priority: 'high'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Audit failed');
        }
    }
}

// ============================================================================
// KilatDocs App Wrapper (Documentation)
// ============================================================================

class KilatDocsApp extends BaseKilatApp {
    readonly name = 'KilatDocs';
    readonly description = 'Generate documentation for code and projects';
    readonly icon = '📖';
    readonly triggers = [
        'dokumentasi', 'documentation', 'readme', 'doc', 'docs',
        'jsdoc', 'swagger', 'openapi', 'api doc', 'wiki'
    ];
    readonly capabilities = ['documentation', 'api-docs', 'readme'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    `You are KilatDocs, a friendly technical writer.

COMMUNICATION STYLE:
- Start with a greeting and explain what you'll document
- Walk through your documentation approach
- For each section, explain its purpose and key points
- Include practical code examples with explanations
- End with a summary and any documentation gaps

Generate clear, comprehensive documentation:`,
                    input,
                    context
                ),
                complexity: 'medium',
                priority: 'high'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Documentation generation failed');
        }
    }
}

// ============================================================================
// KilatDesign App Wrapper (UI/UX Mockups - Stitch Style)
// ============================================================================

class KilatDesignApp extends BaseKilatApp {
    readonly name = 'KilatDesign';
    readonly description = 'Generate UI/UX design mockups and wireframes';
    readonly icon = '🎨';
    readonly triggers = [
        'stitch', 'ui design', 'mockup', 'wireframe', 'desain ui',
        'visual design', 'app design', 'landing page design'
    ];
    readonly capabilities = ['ui-design', 'mockup', 'wireframe'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { generateImages } = await import('@/lib/agents/imagegen/orchestrator');

            const result = await generateImages({
                mode: 'ui-mockup',
                prompt: input,
                quality: 'standard',
                options: {
                    enhance: true,
                    variations: 1,
                    width: 1440,
                    height: 900
                },
                userId: context?.userId || undefined
            });

            if (result.status !== 'completed' || result.images.length === 0) {
                return this.error('UI Design generation failed');
            }

            const image = result.images[0];

            return {
                success: true,
                type: 'image',
                content: `# 🎨 UI Design Generated!\n\n**Prompt:** ${result.originalPrompt}\n\n![UI Mockup](${image.url})\n\n**Model:** ${image.model}`,
                metadata: {
                    agent: this.name,
                    imageUrl: image.url,
                    model: image.model,
                    aiProvider: 'pollination',
                    costUsd: result.cost.pollen * 0.001
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'UI Design generation failed');
        }
    }
}

// ============================================================================
// KilatChat App Wrapper (Generic Chat)
// ============================================================================

class KilatChatApp extends BaseKilatApp {
    readonly name = 'KilatChat';
    readonly description = 'General conversation and Q&A';
    readonly icon = '💬';
    readonly triggers = [
        'chat', 'tanya', 'ask', 'ngobrol', 'diskusi', 'discuss'
    ];
    readonly capabilities = ['chat', 'qa', 'general'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');
            const result = await aiMandor.call({
                prompt: buildPromptWithRAG(
                    'You are KilatChat, a helpful AI assistant. Respond naturally and helpfully:',
                    input,
                    context
                ),
                complexity: 'light',
                priority: 'normal'
            });

            return {
                success: true,
                type: 'text',
                content: result.result,
                metadata: {
                    agent: this.name,
                    aiProvider: result.tier,
                    model: result.model,
                    costUsd: result.cost,
                    executionTime: result.duration,
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.result)
                }
            };
        } catch (error) {
            return this.error(error instanceof Error ? error.message : 'Chat failed');
        }
    }
}

// ============================================================================
// KilatImage App Wrapper
// ============================================================================

class KilatImageApp extends BaseKilatApp {
    readonly name = 'KilatImage';
    readonly description = 'Generate images using AI (Pollination models)';
    readonly icon = '🎨';
    readonly triggers = [
        'image', 'gambar', 'design', 'desain', 'logo', 'visual',
        'illustration', 'ilustrasi', 'banner', 'thumbnail', 'poster',
        'art', 'seni', 'grafis', 'graphic', 'buat gambar', 'generate image'
    ];
    readonly capabilities = ['image-generation', 'design', 'art'];

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            // Import imagegen orchestrator
            const { generateImages } = await import('@/lib/agents/imagegen/orchestrator');

            console.log(`🎨 KilatImage: Generating image for "${input.substring(0, 50)}..."`);

            // 🧠 CONTEXT INJECTION: Extract style from conversation history
            let enhancedInput = input;
            if (context?.conversationHistory && context.conversationHistory.length > 0) {
                const styleKeywords = ['anime', 'realistic', 'artistic', 'minimalist', 'abstract', 'cartoon', '3d', 'photorealistic', 'manga', 'pixar', 'disney'];

                // Search conversation for style mentions
                const conversationText = context.conversationHistory
                    .map(msg => msg.content)
                    .join(' ')
                    .toLowerCase();

                const detectedStyles = styleKeywords.filter(style => conversationText.includes(style));

                if (detectedStyles.length > 0 && !input.toLowerCase().includes(detectedStyles[0])) {
                    // Prepend detected style to current prompt
                    enhancedInput = `${detectedStyles[0]} style, ${input}`;
                    console.log(`🎭 Context-aware: Injected "${detectedStyles[0]}" style from conversation history`);
                }
            }

            // Generate image using Pollination
            const result = await generateImages({
                mode: 'text2image',
                prompt: enhancedInput, // ✨ Use enhanced prompt
                quality: 'standard', // Free tier uses standard quality
                options: {
                    enhance: true, // Auto-optimize prompt
                    variations: 1,
                    width: 1024,
                    height: 1024
                },
                userId: context?.userId || undefined
            });

            if (result.status !== 'completed' || result.images.length === 0) {
                return this.error('Image generation failed');
            }

            const image = result.images[0];

            return {
                success: true,
                type: 'image',
                content: `# 🎨 Image Generated!\n\n**Prompt:** ${result.originalPrompt}\n\n**Optimized:** ${result.optimizedPrompt || 'N/A'}\n\n![Generated Image](${image.url})\n\n**Model:** ${image.model}\n**Seed:** ${image.seed}\n**Cost:** ${result.cost.pollen} pollen`,
                metadata: {
                    agent: this.name,
                    imageUrl: image.url,
                    imageBase64: image.base64,
                    model: image.model,
                    seed: image.seed,
                    originalPrompt: result.originalPrompt,
                    optimizedPrompt: result.optimizedPrompt,
                    cost: result.cost.pollen,
                    quality: result.quality,
                    // AI Mandor metadata (estimated since image gen doesn't use mandor)
                    aiProvider: 'pollination',
                    modelUsed: image.model,
                    costUsd: result.cost.pollen * 0.001, // Rough conversion
                    tokensInput: estimateTokens(input),
                    tokensOutput: estimateTokens(result.optimizedPrompt || input)
                }
            };
        } catch (error) {
            console.error('KilatImage error:', error);
            return this.error(error instanceof Error ? error.message : 'Image generation failed');
        }
    }
}

// ============================================================================
// KilatCrawl App Wrapper
// ============================================================================

class KilatCrawlApp extends BaseKilatApp {
    readonly name = 'KilatCrawl';
    readonly description = 'Extract and analyze web data';
    readonly icon = '🕷️';
    readonly triggers = [
        'crawl', 'scrape', 'extract', 'web', 'url', 'website',
        'link', 'ambil data', 'get data', 'fetch', 'download',
        // Clone triggers (for website cloning like Spotify, Airbnb, etc.)
        'clone', 'copy', 'replicate', 'like', 'seperti', 'mirip',
        'tiruan', 'sama seperti', 'kayak', 'contoh', 'reference'
    ];
    readonly capabilities = ['web-scrape', 'extract', 'analyze', 'clone'];

    // Popular websites for auto-detection when user says "like spotify" etc.
    private readonly KNOWN_BRANDS: Record<string, string> = {
        'spotify': 'https://open.spotify.com',
        'airbnb': 'https://www.airbnb.com',
        'netflix': 'https://www.netflix.com',
        'twitter': 'https://twitter.com',
        'x': 'https://x.com',
        'facebook': 'https://www.facebook.com',
        'instagram': 'https://www.instagram.com',
        'youtube': 'https://www.youtube.com',
        'github': 'https://github.com',
        'figma': 'https://www.figma.com',
        'notion': 'https://www.notion.so',
        'slack': 'https://slack.com',
        'discord': 'https://discord.com',
        'amazon': 'https://www.amazon.com',
        'google': 'https://www.google.com',
        'linkedin': 'https://www.linkedin.com',
        'pinterest': 'https://www.pinterest.com',
        'tiktok': 'https://www.tiktok.com',
        'reddit': 'https://www.reddit.com',
        'medium': 'https://medium.com',
        'dribbble': 'https://dribbble.com',
        'behance': 'https://www.behance.net',
        'shopify': 'https://www.shopify.com',
        'stripe': 'https://stripe.com',
        'vercel': 'https://vercel.com',
        'supabase': 'https://supabase.com',
    };

    async execute(input: string, context?: KilatContext): Promise<KilatResponse> {
        try {
            const lowercaseInput = input.toLowerCase();

            // 1. Check for explicit URL
            let urlMatch = input.match(/https?:\/\/[^\s]+/);
            let detectedUrl = urlMatch?.[0];
            let detectedBrand: string | null = null;

            // 2. If no URL, try to detect brand name
            if (!detectedUrl) {
                for (const [brand, url] of Object.entries(this.KNOWN_BRANDS)) {
                    if (lowercaseInput.includes(brand)) {
                        detectedUrl = url;
                        detectedBrand = brand;
                        console.log(`🎯 Auto-detected brand: ${brand} -> ${url}`);
                        break;
                    }
                }
            }

            // 3. If still no URL, check for clone-like requests and try to help
            if (!detectedUrl) {
                // Check if this is a clone request without a specific target
                const isCloneRequest = ['clone', 'seperti', 'mirip', 'like', 'copy'].some(
                    trigger => lowercaseInput.includes(trigger)
                );

                if (isCloneRequest) {
                    // Use AI to generate instead of crawling
                    return {
                        success: true,
                        type: 'redirect',
                        content: input,
                        metadata: {
                            agent: this.name,
                            redirectTo: 'KilatCode',
                            reason: 'No specific URL or brand detected, routing to code generation'
                        }
                    };
                }

                return this.error('Please provide a URL or mention a known brand (e.g., "like Spotify", "clone Airbnb")');
            }

            // 4. Use WebsiteCloner for full clone workflow
            const { WebsiteCloner } = await import('@/lib/agents/clone/website-cloner');
            const cloner = new WebsiteCloner();

            console.log(`🎨 Starting website clone: ${detectedUrl}`);

            const result = await cloner.clone({
                url: detectedUrl,
                userId: context?.userId,
                options: {
                    targetFramework: 'react',
                    styleSystem: 'tailwind',
                }
            });

            if (result.success) {
                return {
                    success: true,
                    type: 'files',
                    content: `# Website Clone: ${detectedBrand || detectedUrl}

## Analysis
- **Components**: ${result.stats.totalComponents}
- **Total Lines**: ${result.stats.totalLines}
- **Clone Time**: ${result.stats.totalTime}ms

## Generated Files
${Object.keys(result.files).map(f => `- ${f}`).join('\n')}`,
                    metadata: {
                        agent: this.name,
                        url: detectedUrl,
                        brand: detectedBrand,
                        // Convert Record<string, string> to Array format
                        files: Object.entries(result.files).map(([name, content]) => ({
                            name,
                            content,
                            language: name.endsWith('.tsx') || name.endsWith('.ts') ? 'typescript' :
                                name.endsWith('.css') ? 'css' :
                                    name.endsWith('.json') ? 'json' : 'text'
                        })),
                        analysis: result.analysis,
                    }
                };
            } else {
                return this.error(`Clone failed: ${result.errors?.join(', ') || 'Unknown error'}`);
            }

        } catch (error) {
            console.error('KilatCrawl error:', error);
            return this.error(error instanceof Error ? error.message : 'Web crawling failed');
        }
    }
}

// ============================================================================
// Initialize All Apps
// ============================================================================

export function initializeApps(): void {
    console.log('\n📱 Registering KilatOS Apps...\n');

    // Register all 13 apps (12 user-visible + 1 shadow)
    // Note: KilatImage is a shadow agent but still registered for internal calls
    kilatOS.registerApps([
        new KilatCodeApp(),
        new KilatSolveApp(),
        new KilatGuideApp(),
        new KilatWriteApp(),
        new KilatQuestionApp(),
        new KilatResearchApp(),
        new KilatIdeaApp(),
        new KilatCrawlApp(),
        // 4 NEW APPS
        new KilatAuditApp(),
        new KilatDocsApp(),
        new KilatDesignApp(),
        new KilatChatApp(),
        // Shadow agent (internal only, not in UI dropdown)
        new KilatImageApp(),
    ]);

    kilatOS.initialize();
}

// Export individual app classes for testing
export {
    KilatCodeApp,
    KilatSolveApp,
    KilatGuideApp,
    KilatWriteApp,
    KilatQuestionApp,
    KilatResearchApp,
    KilatIdeaApp,
    KilatCrawlApp,
    KilatAuditApp,
    KilatDocsApp,
    KilatDesignApp,
    KilatChatApp,
    KilatImageApp, // Shadow agent
};
