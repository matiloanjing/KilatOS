/**
 * Planning Agent for KilatCode
 * Designs architecture and creates implementation plans before code generation
 * 
 * Features:
 * - Analyze requirements from user request
 * - Select appropriate tech stack
 * - Design module structure
 * - Create implementation plan with order
 * 
 * Copyright © 2026 KilatOS
 */

import { aiMandor } from '@/lib/ai/mandor';

// ============================================================================
// Types
// ============================================================================

export interface Requirements {
    functional: string[];
    nonFunctional: string[];
    inputs: string[];
    outputs: string[];
    edgeCases: string[];
    integrations: string[];
}

export interface TechStack {
    language: string;
    framework?: string;
    styling?: string;
    database?: string;
    auth?: string;
    testing?: string;
    additionalLibraries: string[];
}

export interface Module {
    name: string;
    purpose: string;
    dependencies: string[];
    exports: string[];
    estimatedLines: number;
}

export interface CodePlan {
    summary: string;
    architecture: string;
    modules: Module[];
    dependencies: string[];
    techStack: TechStack;
    implementationOrder: string[];
    estimatedComplexity: 'light' | 'medium' | 'heavy';
    estimatedTime: string;
}

export interface CodeRequest {
    description: string;
    type?: 'component' | 'api' | 'fullstack' | 'algorithm' | 'utility';
    preferredStack?: Partial<TechStack>;
    constraints?: string[];
    model?: string;  // User-selected model to use for AI calls
}

// ============================================================================
// Tech Stack Templates
// ============================================================================

const TECH_STACKS: Record<string, TechStack> = {
    'react-component': {
        language: 'TypeScript',
        framework: 'React 18',
        styling: 'Tailwind CSS',
        testing: 'Vitest + React Testing Library',
        additionalLibraries: ['clsx', 'lucide-react']
    },
    'nextjs-fullstack': {
        language: 'TypeScript',
        framework: 'Next.js 14',
        styling: 'Tailwind CSS',
        database: 'Supabase',
        auth: 'Supabase Auth',
        testing: 'Vitest',
        additionalLibraries: ['zod', 'react-hook-form', '@tanstack/react-query']
    },
    'api-only': {
        language: 'TypeScript',
        framework: 'Next.js API Routes',
        database: 'Supabase',
        testing: 'Vitest',
        additionalLibraries: ['zod', 'jose']
    },
    'algorithm': {
        language: 'TypeScript',
        testing: 'Vitest',
        additionalLibraries: []
    },
    'utility': {
        language: 'TypeScript',
        testing: 'Vitest',
        additionalLibraries: []
    }
};

// ============================================================================
// Planning Agent Class
// ============================================================================

export class PlanningAgent {
    private defaultType: CodeRequest['type'] = 'component';

    // ==========================================================================
    // Public Methods
    // ==========================================================================

    /**
     * Create a complete code plan from request
     */
    async createPlan(request: CodeRequest): Promise<CodePlan> {
        console.log('📋 Planning Agent: Analyzing requirements...');

        // 1. Analyze requirements
        const requirements = await this.analyzeRequirements(request);

        // 2. Determine request type if not specified
        const type = request.type || await this.inferType(request.description);

        // 3. Select tech stack
        const techStack = this.selectTechStack(type, request.preferredStack);

        // 4. Design modules
        const modules = await this.designModules(request.description, requirements, techStack, request.model);

        // 5. Determine implementation order
        const order = this.topologicalSort(modules);

        // 6. Estimate complexity
        const complexity = this.estimateComplexity(modules);

        console.log(`📋 Planning Agent: Plan created (${complexity} complexity, ${modules.length} modules)`);

        return {
            summary: await this.generateSummary(request, modules),
            architecture: this.describeArchitecture(modules, techStack),
            modules,
            dependencies: this.extractDependencies(techStack),
            techStack,
            implementationOrder: order,
            estimatedComplexity: complexity,
            estimatedTime: this.estimateTime(complexity, modules.length)
        };
    }

    /**
     * Generate implementation prompt from plan
     */
    generateImplementationPrompt(plan: CodePlan): string {
        return `
# Code Generation Plan

## Summary
${plan.summary}

## Architecture
${plan.architecture}

## Tech Stack
- Language: ${plan.techStack.language}
${plan.techStack.framework ? `- Framework: ${plan.techStack.framework}` : ''}
${plan.techStack.styling ? `- Styling: ${plan.techStack.styling}` : ''}
${plan.techStack.database ? `- Database: ${plan.techStack.database}` : ''}
${plan.techStack.testing ? `- Testing: ${plan.techStack.testing}` : ''}
${plan.techStack.additionalLibraries.length > 0 ? `- Libraries: ${plan.techStack.additionalLibraries.join(', ')}` : ''}

## Modules to Implement (in order)
${plan.implementationOrder.map((name, i) => {
            const module = plan.modules.find(m => m.name === name);
            return `${i + 1}. **${name}**: ${module?.purpose || 'N/A'}
   - Exports: ${module?.exports.join(', ') || 'N/A'}
   - Dependencies: ${module?.dependencies.join(', ') || 'None'}`;
        }).join('\n\n')}

## Implementation Guidelines
1. Follow TypeScript best practices with strict typing
2. Include comprehensive error handling
3. Add JSDoc comments for public APIs
4. Implement proper loading and error states
5. Use ${plan.techStack.styling || 'clean CSS'} for styling
6. Make components accessible (ARIA labels, keyboard navigation)
`;
    }

    // ==========================================================================
    // Private Methods
    // ==========================================================================

    /**
     * Analyze requirements from request
     */
    private async analyzeRequirements(request: CodeRequest): Promise<Requirements> {
        const prompt = `Analyze this code request and extract requirements:

"${request.description}"

${request.constraints?.length ? `Constraints: ${request.constraints.join(', ')}` : ''}

Return a JSON object with:
{
  "functional": ["what it must do"],
  "nonFunctional": ["performance, security, etc"],
  "inputs": ["what inputs it receives"],
  "outputs": ["what it produces"],
  "edgeCases": ["edge cases to handle"],
  "integrations": ["what it integrates with"]
}

Be specific and comprehensive. JSON only, no markdown.`;

        const response = await aiMandor.call({
            prompt,
            complexity: 'medium',
            validateQuality: true,
            model: request.model  // Pass user-selected model
        });

        try {
            return JSON.parse(this.extractJSON(response.result));
        } catch {
            // Fallback if parsing fails
            return {
                functional: [request.description],
                nonFunctional: ['type safety', 'error handling'],
                inputs: [],
                outputs: [],
                edgeCases: ['null values', 'empty inputs'],
                integrations: []
            };
        }
    }

    /**
     * Infer request type from description
     */
    private async inferType(description: string): Promise<CodeRequest['type']> {
        const lowerDesc = description.toLowerCase();

        if (lowerDesc.includes('api') || lowerDesc.includes('endpoint') || lowerDesc.includes('route')) {
            return 'api';
        }
        if (lowerDesc.includes('fullstack') || lowerDesc.includes('app') || lowerDesc.includes('application')) {
            return 'fullstack';
        }
        if (lowerDesc.includes('algorithm') || lowerDesc.includes('sort') || lowerDesc.includes('search') ||
            lowerDesc.includes('calculate') || lowerDesc.includes('compute')) {
            return 'algorithm';
        }
        if (lowerDesc.includes('utility') || lowerDesc.includes('helper') || lowerDesc.includes('function')) {
            return 'utility';
        }

        return 'component'; // Default
    }

    /**
     * Select appropriate tech stack
     */
    private selectTechStack(type: CodeRequest['type'], preferred?: Partial<TechStack>): TechStack {
        const baseStack = TECH_STACKS[type || 'component'] || TECH_STACKS['react-component'];

        return {
            ...baseStack,
            ...preferred,
            additionalLibraries: [
                ...(baseStack.additionalLibraries || []),
                ...(preferred?.additionalLibraries || [])
            ]
        };
    }

    /**
     * Design module structure
     */
    private async designModules(
        description: string,
        requirements: Requirements,
        techStack: TechStack,
        model?: string  // User-selected model
    ): Promise<Module[]> {
        const prompt = `Design the module structure for this project:

Description: ${description}

Tech Stack: ${techStack.language}, ${techStack.framework || 'vanilla'}

Requirements:
${requirements.functional.map(r => `- ${r}`).join('\n')}

Return a JSON array of modules:
[
  {
    "name": "ModuleName",
    "purpose": "what this module does",
    "dependencies": ["other module names this depends on"],
    "exports": ["what functions/components this exports"],
    "estimatedLines": 100
  }
]

Design 2-5 modules with clear separation of concerns. JSON only.`;

        const response = await aiMandor.call({
            prompt,
            complexity: 'medium',
            model: model  // Pass user-selected model
        });

        try {
            return JSON.parse(this.extractJSON(response.result));
        } catch {
            // Fallback module structure
            return [{
                name: 'main',
                purpose: description,
                dependencies: [],
                exports: ['default'],
                estimatedLines: 100
            }];
        }
    }

    /**
     * Topological sort for implementation order
     */
    private topologicalSort(modules: Module[]): string[] {
        const visited = new Set<string>();
        const result: string[] = [];
        const moduleMap = new Map(modules.map(m => [m.name, m]));

        const visit = (name: string) => {
            if (visited.has(name)) return;
            visited.add(name);

            const module = moduleMap.get(name);
            if (module) {
                for (const dep of module.dependencies) {
                    if (moduleMap.has(dep)) {
                        visit(dep);
                    }
                }
            }
            result.push(name);
        };

        for (const module of modules) {
            visit(module.name);
        }

        return result;
    }

    /**
     * Estimate complexity
     */
    private estimateComplexity(modules: Module[]): 'light' | 'medium' | 'heavy' {
        const totalLines = modules.reduce((sum, m) => sum + m.estimatedLines, 0);
        const moduleCount = modules.length;
        const hasDependencies = modules.some(m => m.dependencies.length > 0);

        if (totalLines > 500 || moduleCount > 4 || hasDependencies) {
            return 'heavy';
        }
        if (totalLines > 200 || moduleCount > 2) {
            return 'medium';
        }
        return 'light';
    }

    /**
     * Estimate time
     */
    private estimateTime(complexity: string, moduleCount: number): string {
        const baseMinutes = {
            light: 2,
            medium: 5,
            heavy: 10
        }[complexity] || 5;

        const totalMinutes = baseMinutes + (moduleCount * 1);
        return `~${totalMinutes} minutes`;
    }

    /**
     * Describe architecture
     */
    private describeArchitecture(modules: Module[], techStack: TechStack): string {
        const layers = this.identifyLayers(modules);

        return `
**Architecture Overview**

Framework: ${techStack.framework || techStack.language}
Pattern: ${layers.length > 1 ? 'Layered' : 'Monolithic'}

${layers.map(layer => `**${layer.name} Layer**
${layer.modules.map(m => `- ${m.name}: ${m.purpose}`).join('\n')}`).join('\n\n')}
`.trim();
    }

    /**
     * Identify architectural layers
     */
    private identifyLayers(modules: Module[]): { name: string; modules: Module[] }[] {
        // Simple layer identification based on naming conventions
        const ui = modules.filter(m =>
            m.name.toLowerCase().includes('component') ||
            m.name.toLowerCase().includes('ui') ||
            m.name.toLowerCase().includes('view')
        );

        const logic = modules.filter(m =>
            m.name.toLowerCase().includes('hook') ||
            m.name.toLowerCase().includes('service') ||
            m.name.toLowerCase().includes('logic')
        );

        const data = modules.filter(m =>
            m.name.toLowerCase().includes('api') ||
            m.name.toLowerCase().includes('data') ||
            m.name.toLowerCase().includes('store')
        );

        const other = modules.filter(m =>
            !ui.includes(m) && !logic.includes(m) && !data.includes(m)
        );

        const layers = [];
        if (ui.length) layers.push({ name: 'UI', modules: ui });
        if (logic.length) layers.push({ name: 'Logic', modules: logic });
        if (data.length) layers.push({ name: 'Data', modules: data });
        if (other.length) layers.push({ name: 'Core', modules: other });

        return layers.length ? layers : [{ name: 'Core', modules }];
    }

    /**
     * Extract dependencies
     */
    private extractDependencies(techStack: TechStack): string[] {
        const deps: string[] = [];

        if (techStack.framework?.includes('React')) deps.push('react', 'react-dom');
        if (techStack.framework?.includes('Next')) deps.push('next');
        if (techStack.styling?.includes('Tailwind')) deps.push('tailwindcss');
        if (techStack.database?.includes('Supabase')) deps.push('@supabase/supabase-js');

        deps.push(...techStack.additionalLibraries);

        return [...new Set(deps)];
    }

    /**
     * Generate summary
     */
    private async generateSummary(request: CodeRequest, modules: Module[]): Promise<string> {
        const moduleNames = modules.map(m => m.name).join(', ');
        return `Build ${request.description}. Components: ${moduleNames}. ` +
            `Total estimated lines: ${modules.reduce((s, m) => s + m.estimatedLines, 0)}.`;
    }

    /**
     * Extract JSON from response (handles markdown code blocks)
     */
    private extractJSON(text: string): string {
        // Try to find JSON in code block
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            return codeBlockMatch[1].trim();
        }

        // Try to find raw JSON
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }

        return text;
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const planningAgent = new PlanningAgent();

export default PlanningAgent;
