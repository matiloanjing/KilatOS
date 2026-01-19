/**
 * Agent Enhancement Mixin
 * Provides two-layer prompt optimization for any agent
 * 
 * Layer 1: Base template from Prompt Optimizer
 * Layer 2: Agent-specific domain expertise
 * 
 * Copyright © 2026 KilatOS
 */

import { promptOptimizer, AgentType, OptimizedPrompt } from './prompt-optimizer';
import { aiMandor } from './mandor';

// ============================================================================
// Types
// ============================================================================

export interface EnhancementRule {
    systemPromptAddition?: string;
    userPromptRules?: string;
    qualityChecks?: string[];
    constraints?: {
        temperature?: number;
        maxTokens?: number;
    };
}

export interface AgentEnhancementConfig {
    [key: string]: EnhancementRule;
}

export interface SuperOptimizedPrompt extends OptimizedPrompt {
    agentEnhancements: string[];
    qualityChecks: string[];
    provenPatterns?: string[];
}

// ============================================================================
// Agent Enhancement Mixin
// ============================================================================

/**
 * Two-Layer Prompt Optimization System
 * 
 * Usage in any agent:
 * 
 * class MyAgent {
 *   private enhancer = new AgentEnhancer('myAgentType', myRules);
 *   
 *   async execute(input) {
 *     const optimized = await this.enhancer.optimize(input.task, input);
 *     const result = await aiMandor.call(optimized);
 *     return result;
 *   }
 * }
 */
export class AgentEnhancer {
    private agentType: AgentType;
    private enhancementRules: AgentEnhancementConfig;
    private provenPatternsCache: Map<string, string[]> = new Map();

    constructor(agentType: AgentType, enhancementRules: AgentEnhancementConfig = {}) {
        this.agentType = agentType;
        this.enhancementRules = enhancementRules;
    }

    /**
     * Two-layer optimization:
     * Layer 1 - Base template from Prompt Optimizer
     * Layer 2 - Agent domain expertise
     */
    async optimize(
        task: string,
        context: {
            complexity?: 'light' | 'medium' | 'heavy';
            framework?: string;
            language?: string;
            features?: string[];
            [key: string]: any;
        }
    ): Promise<SuperOptimizedPrompt> {

        // LAYER 1: Get professional base from Prompt Optimizer
        const baseOptimized = promptOptimizer.optimize(task, {
            agentType: this.agentType,
            taskComplexity: context.complexity || 'medium',
            targetAudience: context.audience || 'professionals',
            outputFormat: context.outputFormat,
            additionalContext: context
        });

        console.log(`✅ Layer 1: Base template (${this.agentType})`);
        console.log(`  - System prompt: Expert role defined`);
        console.log(`  - User prompt: Structured format`);
        console.log(`  - Constraints: Optimized`);

        // LAYER 2: Apply agent-specific expertise
        const superOptimized = this.applyAgentExpertise(baseOptimized, context);

        console.log(`✅ Layer 2: Agent expertise added`);
        console.log(`  - Enhancements: ${superOptimized.agentEnhancements.length}`);
        console.log(`  - Quality checks: ${superOptimized.qualityChecks.length}`);
        if (superOptimized.provenPatterns) {
            console.log(`  - Proven patterns: ${superOptimized.provenPatterns.length}`);
        }

        return superOptimized;
    }

    /**
     * Apply agent domain expertise (Layer 2)
     */
    private applyAgentExpertise(
        base: OptimizedPrompt,
        context: any
    ): SuperOptimizedPrompt {
        let systemPrompt = base.systemPrompt;
        let userPrompt = base.userPrompt;
        const qualityChecks: string[] = [];
        const agentEnhancements: string[] = [];

        // Detect which enhancement rules to apply
        const applicableRules = this.getApplicableRules(context);

        // Apply each rule
        for (const [ruleName, rule] of Object.entries(applicableRules)) {
            // Add to system prompt
            if (rule.systemPromptAddition) {
                systemPrompt += `\n\n${rule.systemPromptAddition}`;
                agentEnhancements.push(`${ruleName} system enhancement`);
            }

            // Add to user prompt
            if (rule.userPromptRules) {
                userPrompt += `\n\n${rule.userPromptRules}`;
                agentEnhancements.push(`${ruleName} rules`);
            }

            // Add quality checks
            if (rule.qualityChecks) {
                qualityChecks.push(...rule.qualityChecks);
            }
        }

        // Add proven patterns if available
        const patterns = this.getProvenPatterns(context);
        if (patterns.length > 0) {
            userPrompt += `\n\n# Proven Patterns (from successful past executions)
${patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Apply these patterns where relevant.`;
            agentEnhancements.push(`${patterns.length} proven patterns`);
        }

        // Add quality validation checklist
        if (qualityChecks.length > 0) {
            userPrompt += `\n\n# Quality Validation Checklist
Before returning your response, verify ALL of these:

${qualityChecks.map((check, i) => `${i + 1}. ${check}`).join('\n')}

If any check fails, FIX IT before submitting.`;
        }

        return {
            ...base,
            systemPrompt,
            userPrompt,
            agentEnhancements,
            qualityChecks,
            provenPatterns: patterns
        };
    }

    /**
     * Determine which enhancement rules apply to this context
     */
    private getApplicableRules(context: any): AgentEnhancementConfig {
        const applicable: AgentEnhancementConfig = {};

        // Check each rule's applicability
        for (const [key, rule] of Object.entries(this.enhancementRules)) {
            if (this.isRuleApplicable(key, context)) {
                applicable[key] = rule;
            }
        }

        return applicable;
    }

    /**
     * Check if a specific rule applies to the context
     */
    private isRuleApplicable(ruleName: string, context: any): boolean {
        const lower = ruleName.toLowerCase();

        // Framework detection
        if (lower.includes('react') && context.framework?.toLowerCase().includes('react')) {
            return true;
        }
        if (lower.includes('next') && context.framework?.toLowerCase().includes('next')) {
            return true;
        }
        if (lower.includes('vue') && context.framework?.toLowerCase().includes('vue')) {
            return true;
        }

        // Language detection
        if (lower.includes('typescript') && context.language?.toLowerCase() === 'typescript') {
            return true;
        }
        if (lower.includes('python') && context.language?.toLowerCase() === 'python') {
            return true;
        }

        // Feature detection
        if (context.features) {
            const featureStr = context.features.join(' ').toLowerCase();
            if (featureStr.includes(lower)) {
                return true;
            }
        }

        // Complexity detection
        if (lower.includes('simple') && context.complexity === 'light') {
            return true;
        }
        if (lower.includes('complex') && context.complexity === 'heavy') {
            return true;
        }

        return false;
    }

    /**
     * Get proven patterns for the context
     * (In real implementation, load from database/cache)
     */
    private getProvenPatterns(context: any): string[] {
        const cacheKey = `${context.framework || 'default'}_${context.language || 'default'}`;

        // Check cache first
        if (this.provenPatternsCache.has(cacheKey)) {
            return this.provenPatternsCache.get(cacheKey)!;
        }

        // Static patterns for now (should be loaded from DB)
        const patterns: string[] = [];

        if (context.framework?.toLowerCase().includes('next')) {
            patterns.push(
                'Use Server Components by default, Client Components only when needed',
                'Implement loading.tsx for route segments to show loading states',
                'Use searchParams prop for URL query parameters (not useSearchParams)',
                'Implement error.tsx for error boundaries at route level'
            );
        }

        if (context.framework?.toLowerCase().includes('react')) {
            patterns.push(
                'Memoize expensive calculations with useMemo hook',
                'Use useCallback for event handlers passed to child components',
                'Implement custom hooks for reusable stateful logic',
                'Use React.lazy and Suspense for code splitting heavy components'
            );
        }

        if (context.language?.toLowerCase() === 'typescript') {
            patterns.push(
                'Define interfaces for all object shapes and props',
                'Use type guards for runtime type checking',
                'Leverage utility types (Partial, Pick, Omit) for type transformations',
                'Use const assertions for literal types'
            );
        }

        // Cache the patterns
        this.provenPatternsCache.set(cacheKey, patterns);

        return patterns;
    }

    /**
     * Execute optimized prompt via AI Mandor
     */
    async execute(optimized: SuperOptimizedPrompt, priority: 'high' | 'medium' | 'low' = 'medium') {
        const maxTokens = optimized.constraints?.maxTokens || 2000;
        // Combine system and user prompts since AIMandorRequest only accepts 'prompt'
        const fullPrompt = `${optimized.systemPrompt}\n\n---\n\n${optimized.userPrompt}`;
        return await aiMandor.call({
            prompt: fullPrompt,
            complexity: maxTokens > 2500 ? 'heavy' :
                maxTokens > 1500 ? 'medium' : 'light',
            priority: priority === 'medium' ? 'normal' : priority as 'high' | 'low'
        });
    }

    /**
     * Validate result against quality checks
     */
    validateResult(result: string, qualityChecks: string[]): {
        passed: boolean;
        score: number;
        failedChecks: string[];
    } {
        const failedChecks: string[] = [];
        let passedChecks = 0;

        for (const check of qualityChecks) {
            // Simple validation (in real implementation, use more sophisticated checking)
            const passed = this.checkQuality(result, check);
            if (passed) {
                passedChecks++;
            } else {
                failedChecks.push(check);
            }
        }

        const score = qualityChecks.length > 0
            ? Math.round((passedChecks / qualityChecks.length) * 100)
            : 100;

        return {
            passed: score >= 70,  // 70% threshold
            score,
            failedChecks
        };
    }

    /**
     * Check if result passes a specific quality check
     */
    private checkQuality(result: string, check: string): boolean {
        const lower = check.toLowerCase();

        // TypeScript checks
        if (lower.includes('typescript') || lower.includes('typed')) {
            return result.includes('interface') || result.includes('type ') || result.includes(': ');
        }

        // Error handling checks
        if (lower.includes('error')) {
            return result.includes('try') || result.includes('catch') || result.includes('Error');
        }

        // Accessibility checks
        if (lower.includes('accessibility') || lower.includes('aria')) {
            return result.includes('aria-') || result.includes('role=') || result.includes('alt=');
        }

        // Documentation checks
        if (lower.includes('documentation') || lower.includes('comments')) {
            return result.includes('/**') || result.includes('//');
        }

        // Testing checks
        if (lower.includes('test')) {
            return result.includes('test(') || result.includes('it(') || result.includes('describe(');
        }

        // Default: assume passed
        return true;
    }

    /**
     * Add a proven pattern to cache
     */
    addProvenPattern(context: any, pattern: string) {
        const cacheKey = `${context.framework || 'default'}_${context.language || 'default'}`;
        const existing = this.provenPatternsCache.get(cacheKey) || [];

        if (!existing.includes(pattern)) {
            existing.push(pattern);
            this.provenPatternsCache.set(cacheKey, existing);
        }
    }
}

// ============================================================================
// Export convenience function
// ============================================================================

/**
 * Create an agent enhancer with predefined rules
 */
export function createAgentEnhancer(
    agentType: AgentType,
    rules: AgentEnhancementConfig
): AgentEnhancer {
    return new AgentEnhancer(agentType, rules);
}
