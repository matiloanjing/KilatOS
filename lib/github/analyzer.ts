/**
 * GitHub Repository Analyzer
 * Analyzes repositories for issues and suggests fixes
 * Copyright © 2025 KilatCode Studio
 */

import { GitHubClient } from './client';
import { chatCompletion } from '@/lib/ai/pollination-client';

export interface CodeIssue {
    file: string;
    line?: number;
    severity: 'error' | 'warning' | 'info';
    type: 'bug' | 'security' | 'performance' | 'style' | 'best-practice';
    message: string;
    suggestedFix?: string;
}

export interface AnalysisResult {
    repository: {
        owner: string;
        repo: string;
        filesAnalyzed: number;
    };
    issues: CodeIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
    };
    fixes?: Record<string, string>; // path -> fixed content
}

/**
 * Analyze repository for issues
 */
export async function analyzeRepository(
    githubClient: GitHubClient,
    owner: string,
    repo: string,
    options: {
        maxFiles?: number;
        filePattern?: RegExp;
        checks?: Array<'security' | 'performance' | 'bugs' | 'style'>;
        model?: string; // User-selected model
    } = {}
): Promise<AnalysisResult> {
    const {
        maxFiles = 50,
        filePattern = /\.(ts|tsx|js|jsx|py)$/,
        checks = ['security', 'performance', 'bugs'],
        model
    } = options;

    console.log(`🔍 Analyzing repository: ${owner}/${repo}`);

    // Get repository files
    const files = await githubClient.listFiles(owner, repo);
    const relevantFiles = files
        .filter(f => filePattern.test(f.path))
        .slice(0, maxFiles);

    console.log(`📁 Found ${relevantFiles.length} files to analyze`);

    // Analyze each file
    const allIssues: CodeIssue[] = [];

    for (const file of relevantFiles) {
        try {
            const fileContent = await githubClient.getFileContent(owner, repo, file.path);
            const issues = await analyzeFileContent(fileContent.path, fileContent.content, checks, model);
            allIssues.push(...issues);
        } catch (error) {
            console.error(`Error analyzing ${file.path}:`, error);
        }
    }

    // Calculate summary
    const summary = {
        errors: allIssues.filter(i => i.severity === 'error').length,
        warnings: allIssues.filter(i => i.severity === 'warning').length,
        info: allIssues.filter(i => i.severity === 'info').length
    };

    console.log(`✅ Analysis complete: ${summary.errors} errors, ${summary.warnings} warnings`);

    return {
        repository: {
            owner,
            repo,
            filesAnalyzed: relevantFiles.length
        },
        issues: allIssues,
        summary
    };
}

/**
 * Analyze local files (for KilatCode-generated code)
 * Does NOT require GitHubClient - works with files directly
 */
export async function analyzeLocalFiles(
    files: Record<string, string>,
    options: {
        checks?: Array<'security' | 'performance' | 'bugs' | 'style'>;
        model?: string;
        projectName?: string;
    } = {}
): Promise<AnalysisResult> {
    const {
        checks = ['security', 'performance', 'bugs'],
        model,
        projectName = 'local-project'
    } = options;

    console.log(`🔍 Analyzing local files: ${Object.keys(files).length} files`);

    // Filter to code files only
    const codePattern = /\.(ts|tsx|js|jsx|py|css|html)$/;
    const relevantFiles = Object.entries(files)
        .filter(([path]) => codePattern.test(path))
        .slice(0, 50); // Max 50 files

    console.log(`📁 Analyzing ${relevantFiles.length} code files`);

    const allIssues: CodeIssue[] = [];

    for (const [filePath, content] of relevantFiles) {
        if (!content || content.length < 10) continue;

        try {
            const issues = await analyzeFileContent(filePath, content, checks, model);
            allIssues.push(...issues);
        } catch (error) {
            console.error(`Error analyzing ${filePath}:`, error);
        }
    }

    // Calculate summary
    const summary = {
        errors: allIssues.filter(i => i.severity === 'error').length,
        warnings: allIssues.filter(i => i.severity === 'warning').length,
        info: allIssues.filter(i => i.severity === 'info').length
    };

    console.log(`✅ Analysis complete: ${summary.errors} errors, ${summary.warnings} warnings`);

    return {
        repository: {
            owner: 'local',
            repo: projectName,
            filesAnalyzed: relevantFiles.length
        },
        issues: allIssues,
        summary
    };
}

/**
 * Analyze single file content
 */
async function analyzeFileContent(
    filePath: string,
    content: string,
    checks: string[],
    model?: string
): Promise<CodeIssue[]> {
    const fileExt = filePath.split('.').pop();
    const language = fileExt === 'py' ? 'Python' : fileExt === 'ts' || fileExt === 'tsx' ? 'TypeScript' : 'JavaScript';

    const systemPrompt = `You are a senior code reviewer analyzing ${language} code.

Check for the following issues: ${checks.join(', ')}

For each issue found, return JSON array:
[{
  "line": number (if known),
  "severity": "error" | "warning" | "info",
  "type": "bug" | "security" | "performance" | "style" | "best-practice",
  "message": "description",
  "suggestedFix": "how to fix (optional)"
}]

If no issues found, return empty array: []`;

    const userPrompt = `Analyze this ${language} file for issues:

File: ${filePath}
\`\`\`${language.toLowerCase()}
${content.substring(0, 3000)}${content.length > 3000 ? '\n...(truncated)' : ''}
\`\`\``;

    try {
        // Use tier-appropriate model (default to free tier for anonymous analysis)
        const response = await chatCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { model: model || 'gemini-fast', temperature: 0.3 } // Use passed model or fallback
        );

        const issues = JSON.parse(response);
        return issues.map((issue: any) => ({
            file: filePath,
            ...issue
        }));
    } catch (error) {
        console.error(`Failed to analyze ${filePath}:`, error);
        return [];
    }
}

/**
 * Generate fixes for issues
 */
export async function generateFixes(
    githubClient: GitHubClient,
    owner: string,
    repo: string,
    issues: CodeIssue[],
    model?: string // User-selected model
): Promise<Record<string, string>> {
    const fixes: Record<string, string> = {};

    // Group issues by file
    const issuesByFile = issues.reduce((acc, issue) => {
        if (!acc[issue.file]) {
            acc[issue.file] = [];
        }
        acc[issue.file].push(issue);
        return acc;
    }, {} as Record<string, CodeIssue[]>);

    // Generate fix for each file
    for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
        try {
            const fileContent = await githubClient.getFileContent(owner, repo, filePath);
            const fixed = await generateFileFix(filePath, fileContent.content, fileIssues, model);
            fixes[filePath] = fixed;
        } catch (error) {
            console.error(`Failed to generate fix for ${filePath}:`, error);
        }
    }

    return fixes;
}

/**
 * Generate fix for single file
 */
async function generateFileFix(
    filePath: string,
    content: string,
    issues: CodeIssue[],
    model?: string
): Promise<string> {
    const systemPrompt = `You are an expert code fixer. Fix the following issues in the code:

${issues.map((issue, i) => `${i + 1}. **${issue.type}** (${issue.severity}): ${issue.message}${issue.suggestedFix ? `\n   Fix: ${issue.suggestedFix}` : ''}`).join('\n')}

Return ONLY the complete fixed code, no explanations.`;

    const userPrompt = `Fix these issues in ${filePath}:

\`\`\`
${content}
\`\`\``;

    const fixed = await chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        { model: model || 'gemini-fast' } // Use passed model or fallback
    );

    return fixed;
}
