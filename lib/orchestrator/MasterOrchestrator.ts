/**
 * Master Orchestrator
 * Central brain that coordinates all agents and manages workflows
 * 
 * Responsibilities:
 * - Intent understanding from user queries
 * - Agent selection and routing
 * - Multi-agent workflow coordination
 * - Context management across sessions
 * - Quality assurance and validation
 * 
 * Integration Points:
 * - AgentPipeline: Individual agent processing
 * - RAG System: Knowledge retrieval
 * - Memory System: Context and history
 * - Knowledge Graph: Entity relationships
 */

import type { UserRequest, Intent, FinalOutput } from '@/lib/agents/base/AgentPipeline';
import { kilatCodeAgent } from '@/lib/agents/codegen';
import { aiMandor } from '@/lib/ai/mandor'; // AI Mandor: Queue management + multi-tier routing

// ============================================================================
// Types
// ============================================================================

export interface AgentCapability {
    agentType: string;
    capabilities: string[];
    complexity: 'low' | 'medium' | 'high';
    estimatedTime: number;
}

export interface WorkflowStep {
    agentType: string;
    dependencies: string[];
    parallel: boolean;
}

export interface OrchestratorContext {
    userId?: string;
    sessionId: string;
    conversationHistory: any[];
    userPreferences: any;
    relevantKnowledge: any[];
}

// ============================================================================
// Master Orchestrator Class
// ============================================================================

export class MasterOrchestrator {
    private agents: Map<string, any> = new Map();
    private agentCapabilities: Map<string, AgentCapability> = new Map();

    constructor() {
        this.initializeAgentCapabilities();
        this.registerAgents();
    }

    /**
     * Register all agents
     */
    private registerAgents(): void {
        // Register KilatCode agent
        this.registerAgent('code', kilatCodeAgent);

        // TODO: Register other agents as they are refactored
        // this.registerAgent('solve', kilatSolveAgent);
        // this.registerAgent('research', kilatResearchAgent);
        // etc.
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    private initializeAgentCapabilities(): void {
        // KilatSolve
        this.agentCapabilities.set('solve', {
            agentType: 'solve',
            capabilities: [
                'math_problems',
                'physics_problems',
                'chemistry_problems',
                'logical_reasoning',
                'step_by_step_solutions'
            ],
            complexity: 'medium',
            estimatedTime: 30
        });

        // KilatCode
        this.agentCapabilities.set('code', {
            agentType: 'code',
            capabilities: [
                'code_generation',
                'code_refactoring',
                'bug_fixing',
                'architecture_design',
                'testing',
                'documentation'
            ],
            complexity: 'high',
            estimatedTime: 45
        });

        // KilatResearch
        this.agentCapabilities.set('research', {
            agentType: 'research',
            capabilities: [
                'web_research',
                'academic_research',
                'information_synthesis',
                'fact_checking',
                'citation_generation'
            ],
            complexity: 'high',
            estimatedTime: 60
        });

        // KilatQuestion
        this.agentCapabilities.set('question', {
            agentType: 'question',
            capabilities: [
                'question_generation',
                'quiz_creation',
                'assessment_design',
                'difficulty_calibration'
            ],
            complexity: 'medium',
            estimatedTime: 20
        });

        // KilatGuide
        this.agentCapabilities.set('guide', {
            agentType: 'guide',
            capabilities: [
                'tutorial_creation',
                'step_by_step_guides',
                'concept_explanation',
                'visualization',
                'interactive_learning'
            ],
            complexity: 'medium',
            estimatedTime: 40
        });

        // KilatIdea
        this.agentCapabilities.set('idea', {
            agentType: 'idea',
            capabilities: [
                'brainstorming',
                'idea_generation',
                'creative_thinking',
                'problem_solving',
                'innovation'
            ],
            complexity: 'medium',
            estimatedTime: 25
        });

        // KilatWrite
        this.agentCapabilities.set('write', {
            agentType: 'write',
            capabilities: [
                'content_writing',
                'copywriting',
                'technical_writing',
                'creative_writing',
                'editing'
            ],
            complexity: 'medium',
            estimatedTime: 35
        });

        // KilatImage
        this.agentCapabilities.set('image', {
            agentType: 'image',
            capabilities: [
                'image_generation',
                'art_creation',
                'style_transfer',
                'visual_design'
            ],
            complexity: 'low',
            estimatedTime: 15
        });

        // KilatCrawl
        this.agentCapabilities.set('crawl', {
            agentType: 'crawl',
            capabilities: [
                'web_scraping',
                'data_extraction',
                'content_parsing',
                'structure_preservation'
            ],
            complexity: 'medium',
            estimatedTime: 30
        });
    }

    // ========================================================================
    // Intent Understanding
    // ========================================================================

    /**
     * Understand user intent from query using AI Mandor
     */
    async understandIntent(query: string): Promise<Intent> {
        try {
            //Use AI Mandor for intelligent intent classification
            const prompt = `Analyze this user query and determine the primary intent.

Query: "${query}"

Return JSON in this exact format:
{
  "primary": "code_generation" | "problem_solving" | "research" | "content_writing" | "brainstorming" | "image_generation" | "web_scraping" | "quiz_generation" | "tutorial_creation",
  "secondary": ["relevant", "capabilities"],
  "complexity": "low" | "medium" | "high",
  "confidence": 0.0-1.0
}

Guidelines:
- code_generation: code, function, class, implement, build
- problem_solving: solve, calculate, math, physics
- research: research, find information, what is, explain
- content_writing: write, article, blog, documentation
- image_generation: image, picture, draw, visualize
- brainstorming: ideas, brainstorm, suggestions

Return ONLY the JSON object, no explanation.`;

            const result = await aiMandor.call({
                prompt,
                complexity: 'medium', // Intent classification = medium complexity
                priority: 'high' // High priority (needed for all requests)
            });

            // Parse JSON response
            const intent = JSON.parse(result.result);

            console.log(`🧠 Intent understood: ${intent.primary} (${(intent.confidence * 100).toFixed(0)}% confident)`);

            return intent;

        } catch (error) {
            console.warn('⚠️ AI intent classification failed, using fallback keyword matching');

            // Fallback to keyword-based classification
            return this.fallbackIntentClassification(query);
        }
    }

    /**
     * Fallback intent classification using keywords
     */
    private fallbackIntentClassification(query: string): Intent {
        const lowerQuery = query.toLowerCase();

        // Code-related
        if (
            lowerQuery.includes('code') ||
            lowerQuery.includes('function') ||
            lowerQuery.includes('class') ||
            lowerQuery.includes('implement')
        ) {
            return {
                primary: 'code_generation',
                secondary: ['architecture', 'testing'],
                complexity: 'high',
                confidence: 0.85
            };
        }

        // Problem solving
        if (
            lowerQuery.includes('solve') ||
            lowerQuery.includes('calculate') ||
            lowerQuery.includes('problem')
        ) {
            return {
                primary: 'problem_solving',
                secondary: ['step_by_step', 'explanation'],
                complexity: 'medium',
                confidence: 0.9
            };
        }

        // Research
        if (
            lowerQuery.includes('research') ||
            lowerQuery.includes('find information') ||
            lowerQuery.includes('what is')
        ) {
            return {
                primary: 'research',
                secondary: ['web_search', 'synthesis'],
                complexity: 'high',
                confidence: 0.8
            };
        }

        // Image generation
        if (
            lowerQuery.includes('image') ||
            lowerQuery.includes('generate') ||
            lowerQuery.includes('picture')
        ) {
            return {
                primary: 'image_generation',
                secondary: ['art', 'visual'],
                complexity: 'low',
                confidence: 0.95
            };
        }

        // Default
        return {
            primary: 'general_query',
            secondary: [],
            complexity: 'low',
            confidence: 0.5
        };
    }

    // ========================================================================
    // Agent Selection
    // ========================================================================

    /**
     * Select best agent(s) based on intent
     */
    selectAgents(intent: Intent): string[] {
        const mapping: Record<string, string> = {
            code_generation: 'code',
            problem_solving: 'solve',
            research: 'research',
            question_generation: 'question',
            tutorial_creation: 'guide',
            idea_generation: 'idea',
            content_writing: 'write',
            image_generation: 'image',
            web_scraping: 'crawl'
        };

        const primary = mapping[intent.primary];
        if (!primary) return ['solve']; // Default fallback

        return [primary];
    }

    /**
     * Select multiple agents for complex tasks
     */
    selectMultipleAgents(intent: Intent): WorkflowStep[] {
        // Example: "Research and write a comprehensive guide"
        if (intent.secondary.includes('research') && intent.secondary.includes('write')) {
            return [
                {
                    agentType: 'research',
                    dependencies: [],
                    parallel: false
                },
                {
                    agentType: 'write',
                    dependencies: ['research'],
                    parallel: false
                }
            ];
        }

        // Single agent workflow
        const agents = this.selectAgents(intent);
        return agents.map(agentType => ({
            agentType,
            dependencies: [],
            parallel: false
        }));
    }

    // ========================================================================
    // Workflow Coordination
    // ========================================================================

    /**
     * Coordinate multi-agent workflow
     */
    async coordinateWorkflow(
        workflow: WorkflowStep[],
        request: UserRequest
    ): Promise<any[]> {
        const results: any[] = [];
        const completed = new Set<string>();

        for (const step of workflow) {
            // Wait for dependencies
            if (step.dependencies.length > 0) {
                const allDepsCompleted = step.dependencies.every(dep =>
                    completed.has(dep)
                );

                if (!allDepsCompleted) {
                    throw new Error(`Dependencies not met for ${step.agentType}`);
                }
            }

            // Execute agent
            const agent = this.agents.get(step.agentType);
            if (!agent) {
                throw new Error(`Agent ${step.agentType} not found`);
            }

            // Bind progress if available
            if (request.onProgress && typeof agent.onProgress === 'function') {
                // Clear existing listeners to prevent leaks
                if (typeof agent.clearProgressCallbacks === 'function') {
                    agent.clearProgressCallbacks();
                }

                agent.onProgress((e: any) => {
                    // Map agent 0-1 progress to global 20-90 range (roughly)
                    const globalProgress = 30 + Math.ceil(e.progress * 60);
                    request.onProgress?.(globalProgress, `${step.agentType}: ${e.message}`);
                });
            }

            const result = await agent.process(request);
            results.push(result);
            completed.add(step.agentType);
        }

        return results;
    }

    // ========================================================================
    // Context Management
    // ========================================================================

    /**
     * Load context for processing
     */
    async loadContext(request: UserRequest): Promise<OrchestratorContext> {
        // TODO: Integrate with Memory System
        return {
            userId: request.userId || undefined,
            sessionId: request.sessionId || this.generateSessionId(),
            conversationHistory: [],
            userPreferences: {},
            relevantKnowledge: []
        };
    }

    /**
     * Save context after processing
     */
    async saveContext(context: OrchestratorContext): Promise<void> {
        // TODO: Integrate with Memory System
        console.log('Context saved:', context.sessionId);
    }

    // ========================================================================
    // Main Processing
    // ========================================================================

    /**
     * Process user request through orchestration
     */
    async process(request: UserRequest): Promise<FinalOutput> {
        try {
            // Step 1: Understand intent
            if (request.onProgress) request.onProgress(15, 'Understanding intent...');
            const intent = await this.understandIntent(request.text);

            // Step 2: Load context
            if (request.onProgress) request.onProgress(25, 'Loading context...');
            const context = await this.loadContext(request);

            // Step 3: Select agent workflow
            const workflow = this.selectMultipleAgents(intent);

            // Step 4: Coordinate execution
            if (request.onProgress) request.onProgress(30, 'Orchestrating agents...');
            const results = await this.coordinateWorkflow(workflow, request);

            // Step 5: Save context
            if (request.onProgress) request.onProgress(95, 'Saving context...');
            await this.saveContext(context);

            // Step 6: Return primary result
            return results[0];

        } catch (error) {
            console.error('Orchestrator error:', error);
            throw error;
        }
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    private registerAgent(type: string, agent: any): void {
        this.agents.set(type, agent);
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Get AI Mandor system status (for monitoring)
     * Queue health, tier usage, cost tracking
     */
    getAIMandorStatus() {
        return aiMandor.getStatus();
    }

    /**
     * Get orchestrator statistics
     */
    getStats() {
        return {
            registeredAgents: this.agents.size,
            agentCapabilities: Array.from(this.agentCapabilities.keys()),
            aiMandorStatus: this.getAIMandorStatus()
        };
    }

    /**
     * Get agent capabilities
     */
    getCapabilities(agentType: string): AgentCapability | undefined {
        return this.agentCapabilities.get(agentType);
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const masterOrchestrator = new MasterOrchestrator();

export default MasterOrchestrator;
