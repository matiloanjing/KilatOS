/**
 * KilatOS - Central Operating System for All Agents
 * 
 * The "iOS" of KilatOS - manages all apps (agents),
 * handles routing, and provides unified access.
 * 
 * Philosophy:
 * - User sends ONE message
 * - OS figures out which agent to use
 * - Agent executes and returns result
 * - User gets clean response
 * 
 * Architecture:
 * - KilatOS (this) = iOS
 * - KilatApp = App Protocol
 * - Agents = Apps (Code, Solve, Guide, etc.)
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { KilatApp, KilatResponse, KilatContext } from './kilat-app';

// ============================================================================
// OS Types
// ============================================================================

export interface OSConfig {
    defaultAgent?: string;          // Fallback agent name
    enableLogging?: boolean;        // Log all requests
    maxConfidenceThreshold?: number; // Min confidence to route (0-100)
    enableAIRouting?: boolean;      // Use AI for semantic routing (default: true)
}

export interface RoutingResult {
    agent: KilatApp;
    confidence: number;
    reasoning?: string;
    method?: 'ai' | 'trigger' | 'default';
}

// ============================================================================
// KilatOS Class
// ============================================================================

export class KilatOS {
    private apps: Map<string, KilatApp> = new Map();
    private config: OSConfig;
    private initialized: boolean = false;

    constructor(config: OSConfig = {}) {
        this.config = {
            defaultAgent: 'KilatCode',
            enableLogging: true,
            maxConfidenceThreshold: 25,
            enableAIRouting: true,  // AI semantic routing by default
            ...config
        };
    }

    // ========================================================================
    // App Registry
    // ========================================================================

    /**
     * Register an app to the OS
     */
    registerApp(app: KilatApp): void {
        this.apps.set(app.name, app);
        if (this.config.enableLogging) {
            console.log(`📱 KilatOS: Registered app "${app.name}"`);
        }
    }

    /**
     * Register multiple apps
     */
    registerApps(apps: KilatApp[]): void {
        apps.forEach(app => this.registerApp(app));
    }

    /**
     * Get an app by name
     */
    getApp(name: string): KilatApp | undefined {
        return this.apps.get(name);
    }

    /**
     * Get all registered apps
     */
    getAllApps(): KilatApp[] {
        return Array.from(this.apps.values());
    }

    /**
     * Get app count
     */
    getAppCount(): number {
        return this.apps.size;
    }

    // ========================================================================
    // Routing (The Brain)
    // ========================================================================

    /**
     * AI-based intent classification using Groq (fast + free)
     */
    private async classifyWithAI(input: string, selectedModel?: string): Promise<{ agent: string; confidence: number } | null> {
        try {
            const { aiMandor } = await import('@/lib/ai/mandor');

            const agentList = Array.from(this.apps.values())
                .map(app => `- ${app.name}: ${app.description}`)
                .join('\n');

            const result = await aiMandor.call({
                prompt: `You are a routing classifier. Given a user query, select the BEST agent.

IMPORTANT RULES:
1. For questions asking WHO, WHAT, WHEN, WHERE, WHY, HOW MUCH → Use KilatGuide
2. For questions like "siapa founder", "siapa pendiri", "apa itu X" → Use KilatGuide  
3. For code generation, building apps, websites → Use KilatCode
4. NEVER select KilatCode for simple knowledge questions

Available agents:
${agentList}

User query: "${input}"

Reply with JSON ONLY (no markdown): {"agent": "AgentName", "confidence": 85, "reason": "brief reason"}`,
                complexity: 'light',  // Use Groq (fast!)
                priority: 'high',
                model: selectedModel // Use user-selected model
            });

            // Parse JSON response using universal sanitizer
            const jsonMatch = result.result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const { safeParseJSON } = await import('@/lib/utils/json-sanitizer');
                const parsed = safeParseJSON(jsonMatch[0]);
                if (parsed) {
                    return {
                        agent: parsed.agent,
                        confidence: parsed.confidence || 75
                    };
                }
            }
        } catch (error) {
            if (this.config.enableLogging) {
                console.log('   ⚠️ AI routing failed, falling back to triggers');
            }
        }
        return null;
    }

    /**
     * Find best app for the input (HYBRID: AI first, trigger fallback)
     */
    private async findBestApp(input: string, selectedModel?: string): Promise<RoutingResult | null> {
        // Try AI routing first (if enabled)
        if (this.config.enableAIRouting) {
            const aiResult = await this.classifyWithAI(input, selectedModel);
            if (aiResult && this.apps.has(aiResult.agent)) {
                const app = this.apps.get(aiResult.agent)!;
                return {
                    agent: app,
                    confidence: aiResult.confidence,
                    reasoning: 'AI semantic classification',
                    method: 'ai'
                };
            }
        }

        // Fallback to trigger-based routing
        const candidates: RoutingResult[] = [];

        for (const app of this.apps.values()) {
            if (app.canHandle(input)) {
                const confidence = app.getConfidence
                    ? app.getConfidence(input)
                    : 50;

                candidates.push({
                    agent: app,
                    confidence,
                    reasoning: `Matched triggers for ${app.name}`,
                    method: 'trigger'
                });
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort((a, b) => b.confidence - a.confidence);

        const best = candidates[0];
        if (best.confidence >= (this.config.maxConfidenceThreshold || 25)) {
            return best;
        }

        return null;
    }

    /**
     * Get default app
     */
    private getDefaultApp(): KilatApp | null {
        return this.config.defaultAgent
            ? this.apps.get(this.config.defaultAgent) || null
            : null;
    }

    // ========================================================================
    // Main Processing
    // ========================================================================

    /**
     * Process user input - THE MAIN ENTRY POINT
     * 
     * This is the "magic" - user sends message, OS figures out everything
     */
    async process(input: string, context?: KilatContext): Promise<KilatResponse> {
        const startTime = Date.now();

        if (this.config.enableLogging) {
            console.log(`\n⚡ KilatOS: Processing "${input.substring(0, 50)}..."`);
        }

        try {
            // 1. Find best app (AI routing or trigger fallback)
            const routing = await this.findBestApp(input, context?.selectedModel);
            let selectedApp: KilatApp | null = null;

            if (routing) {
                selectedApp = routing.agent;
                if (this.config.enableLogging) {
                    console.log(`   → Routed to: ${routing.agent.name} (${routing.confidence}% confidence) [${routing.method || 'unknown'}]`);
                }
            } else {
                // Use default if no match
                selectedApp = this.getDefaultApp();
                if (selectedApp && this.config.enableLogging) {
                    console.log(`   → Using default: ${selectedApp.name}`);
                }
            }

            // 2. If no app found, return error
            if (!selectedApp) {
                return {
                    success: false,
                    type: 'error',
                    content: 'No suitable agent found for your request. Please try rephrasing.',
                    metadata: {
                        agent: 'KilatOS',
                        executionTime: Date.now() - startTime
                    }
                };
            }

            // 2.5 Retrieve RAG context for knowledge-based queries
            let ragContext = '';
            try {
                const { EnhancedRAG } = await import('@/lib/rag/EnhancedRAG');
                const rag = new EnhancedRAG();
                const ragResults = await rag.vectorSearch(input, 5, 0.3);

                if (ragResults.length > 0) {
                    ragContext = ragResults
                        .slice(0, 3)
                        .map(r => r.chunk_text)
                        .join('\n\n---\n\n');

                    if (this.config.enableLogging) {
                        console.log(`   📚 RAG: Found ${ragResults.length} relevant docs (top score: ${(ragResults[0].similarity_score * 100).toFixed(1)}%)`);
                    }
                }
            } catch (ragError) {
                console.warn('RAG context retrieval failed:', ragError);
            }

            // Enrich context with RAG knowledge and preserve selectedModel
            const enrichedContext: KilatContext = {
                ...context,
                ragContext: ragContext || undefined,
                selectedModel: context?.selectedModel // Preserve user-selected model
            };

            // 3. Execute the app
            const result = await selectedApp.execute(input, enrichedContext);

            // 4. Add execution metadata
            const executionTime = Date.now() - startTime;
            if (result.metadata) {
                result.metadata.executionTime = executionTime;
                result.metadata.agent = selectedApp.name;
            } else {
                result.metadata = {
                    agent: selectedApp.name,
                    executionTime
                };
            }

            if (this.config.enableLogging) {
                console.log(`   ✅ Completed in ${executionTime}ms`);
            }

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ KilatOS Error:`, error);

            return {
                success: false,
                type: 'error',
                content: `Error processing request: ${errorMessage}`,
                metadata: {
                    agent: 'KilatOS',
                    executionTime: Date.now() - startTime,
                    error: errorMessage
                }
            };
        }
    }

    /**
     * Process with specific app (bypass routing)
     */
    async processWithApp(
        appName: string,
        input: string,
        context?: KilatContext
    ): Promise<KilatResponse> {
        const app = this.apps.get(appName);

        if (!app) {
            return {
                success: false,
                type: 'error',
                content: `App "${appName}" not found`,
                metadata: { agent: 'KilatOS' }
            };
        }

        return app.execute(input, context);
    }

    // ========================================================================
    // Info & Status
    // ========================================================================

    /**
     * Get OS status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            appCount: this.apps.size,
            apps: this.getAllApps().map(app => ({
                name: app.name,
                description: app.description,
                icon: app.icon,
                triggers: app.triggers
            })),
            config: this.config
        };
    }

    /**
     * Initialize OS (call after registering all apps)
     */
    initialize(): void {
        this.initialized = true;
        console.log(`\n🍎 KilatOS Initialized`);
        console.log(`   Apps: ${this.apps.size}`);
        console.log(`   Names: ${Array.from(this.apps.keys()).join(', ')}`);
        console.log(`   Default: ${this.config.defaultAgent}`);
        console.log('');
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const kilatOS = new KilatOS();

export default KilatOS;
