/**
 * Refactoring Mode Handler
 * Improves code quality, performance, and maintainability
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletion } from '@/lib/ai/pollination-client';

export interface RefactorOptions {
    focus?: 'performance' | 'readability' | 'maintainability' | 'all';
    preserveBehavior?: boolean;
    addComments?: boolean;
    modernize?: boolean; // Use latest language features
}

export interface RefactorResult {
    files: Record<string, string>;
    changes: {
        file: string;
        improvements: string[];
        riskLevel: 'low' | 'medium' | 'high';
    }[];
    summary: string;
}

/**
 * Refactor existing code
 */
export async function refactorCode(
    codeFiles: Record<string, string>,
    language: 'typescript' | 'python' | 'go' | 'rust',
    options: RefactorOptions = {},
    model?: string // User-selected model
): Promise<RefactorResult> {
    const {
        focus = 'all',
        preserveBehavior = true,
        addComments = true,
        modernize = true
    } = options;

    const refactoredFiles: Record<string, string> = {};
    const changes: RefactorResult['changes'] = [];

    // Refactor each file
    for (const [filePath, codeContent] of Object.entries(codeFiles)) {
        const systemPrompt = `You are a senior ${language} developer and refactoring expert.

Refactor the provided code with focus on: ${focus}

Guidelines:
${preserveBehavior ? '- CRITICAL: Preserve existing behavior and output' : '- You may change behavior if it improves the code'}
${addComments ? '- Add clear, concise comments' : '- Minimal comments'}
${modernize ? `- Use latest ${language} features and best practices` : '- Maintain current syntax style'}
- Improve code structure and organization
- Remove code smells
- Optimize performance where possible
- Follow SOLID principles
- Ensure type safety (if applicable)

Return ONLY the refactored code, no explanations.`;

        const userPrompt = `Refactor this ${language} code:

\`\`\`${language}
${codeContent}
\`\`\`

File: ${filePath}
Focus: ${focus}`;

        const refactoredCode = await chatCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { model: model || 'gemini-fast' } // Use passed model or fallback
        );

        refactoredFiles[filePath] = refactoredCode;

        // Analyze changes
        const improvements = await analyzeRefactoringChanges(
            codeContent,
            refactoredCode,
            focus,
            model
        );

        changes.push({
            file: filePath,
            improvements,
            riskLevel: assessRiskLevel(codeContent, refactoredCode)
        });
    }

    // Generate summary
    const summary = generateRefactorSummary(changes);

    return {
        files: refactoredFiles,
        changes,
        summary
    };
}

/**
 * Analyze what improvements were made
 */
async function analyzeRefactoringChanges(
    original: string,
    refactored: string,
    focus: string,
    model?: string
): Promise<string[]> {
    const systemPrompt = `You are a code reviewer. Compare the original and refactored code.

List the key improvements made. Focus on: ${focus}

Return as JSON array of strings: ["improvement 1", "improvement 2", ...]`;

    const userPrompt = `Original code:
\`\`\`
${original.substring(0, 1000)}...
\`\`\`

Refactored code:
\`\`\`
${refactored.substring(0, 1000)}...
\`\`\``;

    const response = await chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        { model: model || 'gemini-fast' } // Use passed model or fallback
    );

    const parsed = JSON.parse(response);
    return parsed.improvements || [];
}

/**
 * Assess risk level of refactoring
 */
function assessRiskLevel(original: string, refactored: string): 'low' | 'medium' | 'high' {
    const originalLines = original.split('\n').length;
    const refactoredLines = refactored.split('\n').length;

    // Calculate change percentage
    const changePercent = Math.abs(refactoredLines - originalLines) / originalLines * 100;

    // Simple heuristic
    if (changePercent < 10) return 'low';
    if (changePercent < 30) return 'medium';
    return 'high';
}

/**
 * Generate refactoring summary
 */
function generateRefactorSummary(changes: RefactorResult['changes']): string {
    const totalFiles = changes.length;
    const lowRisk = changes.filter(c => c.riskLevel === 'low').length;
    const mediumRisk = changes.filter(c => c.riskLevel === 'medium').length;
    const highRisk = changes.filter(c => c.riskLevel === 'high').length;

    const allImprovements = changes.flatMap(c => c.improvements);

    return `Refactored ${totalFiles} file(s):
- Low risk: ${lowRisk}
- Medium risk: ${mediumRisk}
- High risk: ${highRisk}

Key improvements:
${allImprovements.slice(0, 5).map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

${highRisk > 0 ? '\n⚠️ High-risk changes detected. Review carefully before deploying.' : '✅ All changes are low-to-medium risk.'}`;
}
