/**
 * Reference Mining Agent for KilatCode
 * Finds relevant examples and patterns from knowledge base and web
 * 
 * Features:
 * - Search for similar code patterns
 * - Extract best practices from examples
 * - Identify popular libraries for the task
 * - Build context from proven solutions
 * 
 * Copyright © 2026 KilatOS
 */

import { aiMandor } from '@/lib/ai/mandor';

// ============================================================================
// Types
// ============================================================================

export interface Reference {
    type: 'pattern' | 'example' | 'library' | 'best-practice';
    name: string;
    description: string;
    code?: string;
    source: string;
    relevance: number; // 0-100
    usage?: string;
}

export interface CodeTask {
    description: string;
    type: 'component' | 'api' | 'algorithm' | 'utility' | 'fullstack';
    framework?: string;
    language: string;
    features?: string[];
    model?: string;  // User-selected model for AI calls
}

export interface ReferenceSearchResult {
    references: Reference[];
    patterns: string[];
    recommendedLibraries: string[];
    bestPractices: string[];
    contextPrompt: string;
}

// ============================================================================
// Built-in Pattern Library
// ============================================================================

const PATTERN_LIBRARY: Record<string, Reference[]> = {
    'react-form': [
        {
            type: 'pattern',
            name: 'React Hook Form + Zod',
            description: 'Type-safe form validation with React Hook Form and Zod schema',
            code: `import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters')
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });
  
  const onSubmit = (data) => console.log(data);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}`,
            source: 'KilatCode Pattern Library',
            relevance: 95
        }
    ],
    'react-auth': [
        {
            type: 'pattern',
            name: 'Supabase Auth with Next.js',
            description: 'Authentication flow using Supabase Auth in Next.js App Router',
            code: `import { createClient } from '@/lib/supabase/client';

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}`,
            source: 'KilatCode Pattern Library',
            relevance: 90
        }
    ],
    'react-state': [
        {
            type: 'pattern',
            name: 'Zustand State Management',
            description: 'Lightweight state management with Zustand',
            code: `import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null })
    }),
    { name: 'user-storage' }
  )
);`,
            source: 'KilatCode Pattern Library',
            relevance: 85
        }
    ],
    'api-error-handling': [
        {
            type: 'pattern',
            name: 'API Route Error Handling',
            description: 'Consistent error handling in Next.js API routes',
            code: `import { NextResponse } from 'next/server';

export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.errors },
      { status: 400 }
    );
  }
  
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}`,
            source: 'KilatCode Pattern Library',
            relevance: 90
        }
    ],
    'react-loading': [
        {
            type: 'pattern',
            name: 'Loading States Pattern',
            description: 'Consistent loading, error, and empty states',
            code: `interface AsyncStateProps<T> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

function AsyncState<T>({
  isLoading,
  error,
  data,
  loadingComponent = <Spinner />,
  errorComponent,
  emptyComponent = <p>No data</p>,
  children
}: AsyncStateProps<T>) {
  if (isLoading) return loadingComponent;
  if (error) return errorComponent || <ErrorMessage error={error} />;
  if (!data) return emptyComponent;
  return children(data);
}`,
            source: 'KilatCode Pattern Library',
            relevance: 85
        }
    ]
};

const LIBRARY_RECOMMENDATIONS: Record<string, string[]> = {
    'react-form': ['react-hook-form', 'zod', '@hookform/resolvers'],
    'react-table': ['@tanstack/react-table', 'react-virtual'],
    'react-state': ['zustand', 'jotai'],
    'react-query': ['@tanstack/react-query'],
    'react-ui': ['@radix-ui/react-*', 'class-variance-authority', 'clsx'],
    'react-icons': ['lucide-react'],
    'react-animation': ['framer-motion'],
    'api-validation': ['zod'],
    'api-auth': ['jose', 'bcryptjs'],
    'database': ['@supabase/supabase-js', 'drizzle-orm']
};

// ============================================================================
// Reference Agent Class
// ============================================================================

export class ReferenceAgent {
    // ==========================================================================
    // Public Methods
    // ==========================================================================

    /**
     * Find relevant references for a code task
     */
    async findReferences(task: CodeTask): Promise<ReferenceSearchResult> {
        console.log('🔍 Reference Agent: Searching for patterns...');

        // 1. Match from built-in pattern library
        const libraryMatches = this.searchPatternLibrary(task);

        // 2. Generate additional patterns via AI
        const aiPatterns = await this.generatePatterns(task);

        // 3. Get library recommendations
        const libraries = this.getLibraryRecommendations(task);

        // 4. Get best practices
        const bestPractices = await this.getBestPractices(task);

        // 5. Build context prompt
        const contextPrompt = this.buildContextPrompt(
            libraryMatches,
            aiPatterns,
            bestPractices
        );

        console.log(`🔍 Reference Agent: Found ${libraryMatches.length + aiPatterns.length} references`);

        return {
            references: [...libraryMatches, ...aiPatterns],
            patterns: this.extractPatternNames(libraryMatches),
            recommendedLibraries: libraries,
            bestPractices,
            contextPrompt
        };
    }

    /**
     * Enrich a code plan with relevant references
     */
    async enrichPlan(task: CodeTask, modules: string[]): Promise<Reference[]> {
        const allReferences: Reference[] = [];

        // Find references for each module
        for (const moduleName of modules) {
            const moduleTask: CodeTask = {
                ...task,
                description: `${moduleName} for ${task.description}`,
                features: [moduleName.toLowerCase()]
            };

            const result = await this.findReferences(moduleTask);
            allReferences.push(...result.references.slice(0, 2)); // Top 2 per module
        }

        // Deduplicate by name
        const unique = new Map<string, Reference>();
        for (const ref of allReferences) {
            if (!unique.has(ref.name) || ref.relevance > unique.get(ref.name)!.relevance) {
                unique.set(ref.name, ref);
            }
        }

        return Array.from(unique.values());
    }

    // ==========================================================================
    // Private Methods
    // ==========================================================================

    /**
     * Search built-in pattern library
     */
    private searchPatternLibrary(task: CodeTask): Reference[] {
        const matches: Reference[] = [];
        const descLower = task.description.toLowerCase();
        const features = task.features?.map(f => f.toLowerCase()) || [];

        // Search by keywords
        const keywords = [
            ...descLower.split(/\s+/),
            ...features,
            task.type,
            task.framework?.toLowerCase() || ''
        ].filter(Boolean);

        for (const [patternKey, patterns] of Object.entries(PATTERN_LIBRARY)) {
            // Check if pattern key matches any keywords
            const keyParts = patternKey.split('-');
            const matchScore = keywords.filter(k =>
                keyParts.some(part => k.includes(part) || part.includes(k))
            ).length;

            if (matchScore > 0) {
                for (const pattern of patterns) {
                    matches.push({
                        ...pattern,
                        relevance: Math.min(100, pattern.relevance + matchScore * 5)
                    });
                }
            }
        }

        // Check description matches
        for (const [, patterns] of Object.entries(PATTERN_LIBRARY)) {
            for (const pattern of patterns) {
                const nameWords = pattern.name.toLowerCase().split(/\s+/);
                const descMatch = nameWords.some(w => descLower.includes(w));

                if (descMatch && !matches.find(m => m.name === pattern.name)) {
                    matches.push({
                        ...pattern,
                        relevance: Math.max(60, pattern.relevance - 20)
                    });
                }
            }
        }

        // Sort by relevance and return top matches
        return matches
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 5);
    }

    /**
     * Generate patterns via AI
     */
    private async generatePatterns(task: CodeTask): Promise<Reference[]> {
        const prompt = `Give me 2-3 code patterns/snippets for this task:

Task: ${task.description}
Type: ${task.type}
Framework: ${task.framework || 'Any'}
Language: ${task.language}

For each pattern, provide:
1. Pattern name
2. Brief description (1 line)
3. Code snippet (10-20 lines max)

Focus on:
- Common patterns used for this type of task
- Best practices for error handling
- Type safety considerations

Format as JSON array:
[
  {
    "name": "Pattern Name",
    "description": "Brief description",
    "code": "code snippet"
  }
]

JSON only, no markdown.`;

        try {
            const response = await aiMandor.call({
                prompt,
                complexity: 'medium',
                validateQuality: true,
                model: task.model  // Pass user-selected model
            });

            const patterns = JSON.parse(this.extractJSON(response.result));

            return patterns.map((p: any, i: number) => ({
                type: 'pattern' as const,
                name: p.name,
                description: p.description,
                code: p.code,
                source: 'AI Generated',
                relevance: 75 - (i * 5) // Decrease relevance for later items
            }));
        } catch {
            return []; // Return empty if AI fails
        }
    }

    /**
     * Get library recommendations
     */
    private getLibraryRecommendations(task: CodeTask): string[] {
        const recommendations: Set<string> = new Set();
        const descLower = task.description.toLowerCase();

        // Check each recommendation category
        for (const [category, libs] of Object.entries(LIBRARY_RECOMMENDATIONS)) {
            const keyParts = category.split('-');

            if (keyParts.some(part =>
                descLower.includes(part) ||
                task.type.includes(part) ||
                (task.features?.some(f => f.toLowerCase().includes(part)))
            )) {
                libs.forEach(lib => recommendations.add(lib));
            }
        }

        // Add framework-specific recommendations
        if (task.framework?.toLowerCase().includes('react')) {
            recommendations.add('react');
            recommendations.add('react-dom');
        }
        if (task.framework?.toLowerCase().includes('next')) {
            recommendations.add('next');
        }

        return Array.from(recommendations);
    }

    /**
     * Get best practices for the task
     */
    private async getBestPractices(task: CodeTask): Promise<string[]> {
        const prompt = `List 5 best practices for: ${task.description}

Type: ${task.type}
Framework: ${task.framework || 'Any'}

Return as JSON array of strings, each practice in 1 short sentence.
Example: ["Use TypeScript for type safety", "Implement error boundaries"]

JSON only.`;

        try {
            const response = await aiMandor.call({
                prompt,
                complexity: 'light',
                model: task.model  // Pass user-selected model
            });

            return JSON.parse(this.extractJSON(response.result));
        } catch {
            // Fallback best practices
            return [
                'Use TypeScript for type safety',
                'Implement proper error handling',
                'Add loading and error states',
                'Make components accessible (ARIA)',
                'Write unit tests for critical paths'
            ];
        }
    }

    /**
     * Build context prompt from references
     */
    private buildContextPrompt(
        patterns: Reference[],
        aiPatterns: Reference[],
        bestPractices: string[]
    ): string {
        const allPatterns = [...patterns, ...aiPatterns];

        if (allPatterns.length === 0 && bestPractices.length === 0) {
            return '';
        }

        let prompt = '\n## Reference Patterns and Best Practices\n\n';

        if (allPatterns.length > 0) {
            prompt += '### Relevant Patterns\n\n';
            for (const pattern of allPatterns.slice(0, 3)) {
                prompt += `**${pattern.name}**: ${pattern.description}\n`;
                if (pattern.code) {
                    prompt += `\`\`\`typescript\n${pattern.code}\n\`\`\`\n\n`;
                }
            }
        }

        if (bestPractices.length > 0) {
            prompt += '### Best Practices to Follow\n';
            prompt += bestPractices.map(bp => `- ${bp}`).join('\n');
            prompt += '\n\n';
        }

        return prompt;
    }

    /**
     * Extract pattern names from references
     */
    private extractPatternNames(references: Reference[]): string[] {
        return references
            .filter(r => r.type === 'pattern')
            .map(r => r.name);
    }

    /**
     * Extract JSON from response
     */
    private extractJSON(text: string): string {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) return codeBlockMatch[1].trim();

        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) return jsonMatch[0];

        return text;
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const referenceAgent = new ReferenceAgent();

export default ReferenceAgent;
