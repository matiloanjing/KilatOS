/**
 * Prompt Auto-Optimizer
 * Learns from feedback to improve prompts automatically
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletion } from '@/lib/ai/pollination-client';
import { getFeedbackStats } from './feedback-collector';

export interface PromptOptimizationResult {
    originalPrompt: string;
    optimizedPrompt: string;
    improvements: string[];
    confidence: number;
}

/**
 * Auto-optimize prompt based on historical feedback
 */
export async function autoOptimizePrompt(
    prompt: string,
    agentType: string,
    model: string
): Promise<PromptOptimizationResult> {
    // Get feedback stats for this agent/model combo
    const stats = await getFeedbackStats(agentType, model);

    // If no feedback or high success rate, minimal optimization
    if (stats.totalFeedback === 0 || stats.successRate >= 90) {
        return {
            originalPrompt: prompt,
            optimizedPrompt: prompt,
            improvements: [],
            confidence: 0.5
        };
    }

    // Build optimization context
    const systemPrompt = `You are a prompt optimization expert for AI systems.

Context:
- Agent Type: ${agentType}
- Model: ${model}
- Historical Success Rate: ${stats.successRate}%
- Average Rating: ${stats.avgRating}/5
- Total Feedback: ${stats.totalFeedback}

Your task: Improve this prompt to increase success rate and user satisfaction.

Guidelines:
- Be specific and clear
- Remove ambiguity
- Add context if needed
- Maintain user intent
- Keep it concise

Return ONLY the optimized prompt, no explanations.`;

    const userMessage = `Optimize this prompt:

"${prompt}"

Make it more likely to succeed based on the low ${stats.successRate}% success rate.`;

    try {
        const optimized = await chatCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            { model: model || 'gemini-fast', temperature: 0.3 } // Use passed model or fallback
        );

        // Identify improvements (simple diff)
        const improvements = identifyImprovements(prompt, optimized);

        return {
            originalPrompt: prompt,
            optimizedPrompt: optimized.trim(),
            improvements,
            confidence: calculateOptimizationConfidence(stats)
        };
    } catch (error) {
        console.error('Auto-optimize prompt error:', error);

        // Return original on error
        return {
            originalPrompt: prompt,
            optimizedPrompt: prompt,
            improvements: [],
            confidence: 0
        };
    }
}

/**
 * Identify what was improved in the prompt
 */
function identifyImprovements(original: string, optimized: string): string[] {
    const improvements: string[] = [];

    // Check length change
    if (optimized.length > original.length * 1.2) {
        improvements.push('Added more details and context');
    } else if (optimized.length < original.length * 0.8) {
        improvements.push('Made more concise');
    }

    // Check for added specificity
    const specificityMarkers = ['specifically', 'detailed', 'exactly', 'precisely', 'clearly'];
    const hasMarkers = specificityMarkers.some(m =>
        optimized.toLowerCase().includes(m) && !original.toLowerCase().includes(m)
    );
    if (hasMarkers) {
        improvements.push('Added specificity markers');
    }

    // Check for structure
    if (optimized.includes('\n') && !original.includes('\n')) {
        improvements.push('Improved structure with line breaks');
    }

    // Check for examples
    if (optimized.toLowerCase().includes('example') && !original.toLowerCase().includes('example')) {
        improvements.push('Added examples');
    }

    if (improvements.length === 0) {
        improvements.push('Refined wording for clarity');
    }

    return improvements;
}

/**
 * Calculate confidence in optimization
 */
function calculateOptimizationConfidence(stats: any): number {
    // More feedback = higher confidence
    const sampleConfidence = Math.min(stats.totalFeedback / 100, 1);

    // Lower success rate = more room for improvement = higher confidence needed
    const improvementPotential = (100 - stats.successRate) / 100;

    return sampleConfidence * improvementPotential * 0.8 + 0.2; // 0.2-1.0 range
}

/**
 * Learn from successful prompts
 */
export async function learnFromSuccessfulPrompts(
    agentType: string,
    successThreshold: number = 4.5 // Min rating
): Promise<string[]> {
    // TODO: Implement learning from stored successful prompts
    // For now, return generic best practices
    return [
        'Be specific about desired output format',
        'Include context and background information',
        'Use clear, unambiguous language',
        'Break complex requests into steps',
        'Specify constraints and requirements explicitly'
    ];
}

/**
 * Get prompt optimization suggestions
 */
export function getPromptSuggestions(prompt: string): {
    suggestions: string[];
    score: number;
} {
    const suggestions: string[] = [];
    let score = 100;

    // Check length
    if (prompt.length < 10) {
        suggestions.push('Prompt is too short - add more details');
        score -= 20;
    } else if (prompt.length > 1000) {
        suggestions.push('Prompt is very long - consider being more concise');
        score -= 10;
    }

    // Check for clarity
    const vagueTerms = ['something', 'stuff', 'thing', 'whatever', 'maybe'];
    const hasVagueTerms = vagueTerms.some(term => prompt.toLowerCase().includes(term));
    if (hasVagueTerms) {
        suggestions.push('Replace vague terms with specific descriptions');
        score -= 15;
    }

    // Check for questions
    if (!prompt.includes('?') && prompt.split(' ').length > 5) {
        const imperativeWords = ['create', 'generate', 'make', 'build', 'write', 'design'];
        const hasImperative = imperativeWords.some(word => prompt.toLowerCase().includes(word));
        if (!hasImperative) {
            suggestions.push('Consider using imperative verbs (create, generate, etc.)');
            score -= 5;
        }
    }

    // Check for context
    if (prompt.split(' ').length < 5) {
        suggestions.push('Add more context to help the AI understand your goal');
        score -= 15;
    }

    return {
        suggestions,
        score: Math.max(score, 0)
    };
}
