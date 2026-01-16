/**
 * Base Agent Pipeline
 * Universal 6-layer processing architecture for all KilatOS agents
 * 
 * Layers:
 * 1. INPUT - Parse and validate user requests
 * 2. UNDERSTANDING - Deep intent recognition
 * 3. PLANNING - Strategic workflow design
 * 4. EXECUTION - Multi-step processing
 * 5. VALIDATION - Quality assurance
 * 6. OUTPUT - Format and deliver results
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface UserRequest {
    text: string;
    userId?: string;
    sessionId?: string;
    context?: Record<string, any>;
    onProgress?: (progress: number, message: string) => void;
}

export interface ParsedInput {
    type: string;
    parameters: Record<string, any>;
    metadata: Record<string, any>;
}

export interface Intent {
    primary: string;
    secondary: string[];
    complexity: 'low' | 'medium' | 'high';
    confidence: number;
}

export interface Context {
    userProfile?: any;
    sessionHistory?: any[];
    relevantKnowledge?: any[];
    requirements: string[];
    onProgress?: (progress: number, message: string) => void;
}

export interface Plan {
    steps: string[];
    tools: string[];
    strategy: string;
    estimatedTime?: number;
}
// ... (imports/exports remain same, just patching interface and method)


export interface Plan {
    steps: string[];
    tools: string[];
    strategy: string;
    estimatedTime?: number;
}

export interface ExecutionResult {
    success: boolean;
    artifacts: any[];
    metadata: Record<string, any>;
    errors?: Error[];
}

export interface ValidationResult {
    passed: boolean;
    score: number;
    issues: Issue[];
    metrics: Record<string, number>;
}

export interface Issue {
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestedFix?: string;
}

export interface FinalOutput<T = any> {
    data: T;
    citations: string[];
    metadata: {
        agentType: string;
        processingTime: number;
        qualityScore: number;
        timestamp: string;
    };
}

export interface ProgressEvent {
    stage: string;
    progress: number;
    message: string;
}

// ============================================================================
// Base Agent Pipeline Class
// ============================================================================

export abstract class AgentPipeline<TInput = any, TOutput = any> {
    protected agentType: string;
    protected progressCallbacks: Array<(event: ProgressEvent) => void> = [];

    constructor(agentType: string) {
        this.agentType = agentType;
    }

    // ========================================================================
    // Layer 1: INPUT
    // ========================================================================

    /**
     * Parse user request into structured input
     */
    protected abstract parseInput(request: UserRequest): TInput;

    /**
     * Validate parsed input
     */
    protected abstract validateInput(input: TInput): boolean;

    /**
     * Extract key parameters from input
     */
    protected extractParameters(input: TInput): Record<string, any> {
        return input as Record<string, any>;
    }

    // ========================================================================
    // Layer 2: UNDERSTANDING
    // ========================================================================

    /**
     * Recognize user intent from input
     */
    protected abstract understandIntent(input: TInput): Promise<Intent>;

    /**
     * Gather relevant context for processing
     */
    protected async gatherContext(intent: Intent, request: UserRequest): Promise<Context> {
        return {
            requirements: [],
            userProfile: request.context?.userProfile,
            sessionHistory: request.context?.sessionHistory,
            relevantKnowledge: [],
            onProgress: request.onProgress
        };
    }

    /**
     * Extract specific requirements from context
     */
    protected abstract extractRequirements(context: Context): string[];

    // ========================================================================
    // Layer 3: PLANNING
    // ========================================================================

    /**
     * Create execution plan based on context
     */
    protected abstract createPlan(context: Context): Promise<Plan>;

    /**
     * Select appropriate tools for execution
     */
    protected abstract selectTools(plan: Plan): string[];

    /**
     * Design workflow sequence
     */
    protected designWorkflow(plan: Plan): string[] {
        return plan.steps;
    }

    // ========================================================================
    // Layer 4: EXECUTION
    // ========================================================================

    /**
     * Execute the plan step by step
     */
    protected abstract execute(plan: Plan, context: Context): Promise<ExecutionResult>;

    /**
     * Execute a single step
     */
    protected abstract executeStep(step: string, context: any): Promise<any>;

    /**
     * Track execution progress
     */
    protected emitProgress(stage: string, progress: number, message: string): void {
        const event: ProgressEvent = { stage, progress, message };
        this.progressCallbacks.forEach(cb => cb(event));
    }

    /**
     * Handle execution errors
     */
    protected async handleExecutionError(error: Error, step: string): Promise<void> {
        console.error(`Error in step ${step}:`, error);
        // Can implement retry logic here
    }

    // ========================================================================
    // Layer 5: VALIDATION
    // ========================================================================

    /**
     * Validate execution results
     */
    protected abstract validate(result: ExecutionResult): Promise<ValidationResult>;

    /**
     * Check quality of output
     */
    protected async checkQuality(result: ExecutionResult): Promise<number> {
        // Default implementation - override in subclasses
        return result.success ? 0.8 : 0.4;
    }

    /**
     * Verify completeness of result
     */
    protected verifyCompleteness(result: ExecutionResult): boolean {
        return result.success && result.artifacts.length > 0;
    }

    /**
     * Self-correct issues if found
     */
    protected async selfCorrect(
        result: ExecutionResult,
        issues: Issue[]
    ): Promise<ExecutionResult> {
        // Default: return original result
        // Override in subclasses for specific correction logic
        return result;
    }

    // ========================================================================
    // Layer 6: OUTPUT
    // ========================================================================

    /**
     * Format execution result into final output
     */
    protected abstract formatOutput(result: ExecutionResult): TOutput;

    /**
     * Add citations and sources
     */
    protected addCitations(output: TOutput, result: ExecutionResult): string[] {
        return result.metadata?.sources || [];
    }

    /**
     * Generate metadata for output
     */
    protected generateMetadata(
        result: ExecutionResult,
        startTime: number
    ): FinalOutput<TOutput>['metadata'] {
        return {
            agentType: this.agentType,
            processingTime: Date.now() - startTime,
            qualityScore: result.metadata?.qualityScore || 0,
            timestamp: new Date().toISOString()
        };
    }

    // ========================================================================
    // Main Processing Pipeline
    // ========================================================================

    /**
     * Process user request through all 6 layers
     */
    async process(request: UserRequest): Promise<FinalOutput<TOutput>> {
        const startTime = Date.now();

        try {
            // Layer 1: INPUT
            this.emitProgress('input', 0.1, 'Parsing input...');
            const input = this.parseInput(request);

            if (!this.validateInput(input)) {
                throw new Error('Invalid input');
            }

            // Layer 2: UNDERSTANDING
            this.emitProgress('understanding', 0.2, 'Understanding intent...');
            const intent = await this.understandIntent(input);
            const context = await this.gatherContext(intent, request);
            context.requirements = this.extractRequirements(context);

            // Layer 3: PLANNING
            this.emitProgress('planning', 0.3, 'Creating plan...');
            const plan = await this.createPlan(context);
            const tools = this.selectTools(plan);

            // Layer 4: EXECUTION
            this.emitProgress('execution', 0.4, 'Executing plan...');
            let result = await this.execute(plan, context);

            // Layer 5: VALIDATION
            this.emitProgress('validation', 0.8, 'Validating results...');
            const validation = await this.validate(result);

            if (!validation.passed && validation.issues.length > 0) {
                this.emitProgress('validation', 0.85, 'Correcting issues...');
                result = await this.selfCorrect(result, validation.issues);
            }

            // Layer 6: OUTPUT
            this.emitProgress('output', 0.9, 'Formatting output...');
            const output = this.formatOutput(result);
            const citations = this.addCitations(output, result);
            const metadata = this.generateMetadata(result, startTime);

            this.emitProgress('complete', 1.0, 'Processing complete!');

            return {
                data: output,
                citations,
                metadata: {
                    ...metadata,
                    qualityScore: validation.score
                }
            };

        } catch (error) {
            console.error(`Agent ${this.agentType} processing failed:`, error);
            throw error;
        }
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Register progress callback
     */
    onProgress(callback: (event: ProgressEvent) => void): void {
        this.progressCallbacks.push(callback);
    }

    /**
     * Clear progress callbacks
     */
    clearProgressCallbacks(): void {
        this.progressCallbacks = [];
    }
}

// ============================================================================
// Export
// ============================================================================

export default AgentPipeline;
