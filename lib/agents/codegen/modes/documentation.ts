/**
 * Documentation Generation Handler
 * Generates comprehensive documentation for code
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletion } from '@/lib/ai/pollination-client';
import { Blueprint } from '../agentic-loop';

export interface DocOptions {
    format?: 'markdown' | 'html' | 'jsdoc';
    includeExamples?: boolean;
    includeAPI?: boolean;
    includeDiagrams?: boolean;
    model?: string; // User-selected model
}

/**
 * Generate documentation for code
 */
export async function generateDocumentation(
    codeFiles: Record<string, string>,
    blueprint: Blueprint,
    language: 'typescript' | 'python' | 'go' | 'rust',
    options: DocOptions = {},
    model?: string // User-selected model
): Promise<string> {
    const {
        format = 'markdown',
        includeExamples = true,
        includeAPI = true,
        includeDiagrams = false
    } = options;

    const systemPrompt = `You are a technical writer specializing in ${language} documentation.

Generate comprehensive ${format} documentation for the provided codebase.

Structure:
1. **Overview** - Project description and purpose
2. **Architecture** - High-level design
3. **Installation** - Setup instructions
4. **Usage** - How to use the code
${includeAPI ? '5. **API Reference** - Function/class documentation' : ''}
${includeExamples ? '6. **Examples** - Code examples' : ''}
${includeDiagrams ? '7. **Diagrams** - Architecture diagrams (Mermaid)' : ''}

Style:
- Clear and concise
- Use code blocks with syntax highlighting
- Include links where appropriate
- Follow ${format} best practices`;

    const codeOverview = Object.entries(codeFiles)
        .map(([path, content]) => {
            const preview = content.split('\n').slice(0, 20).join('\n');
            return `### ${path}\n\`\`\`${language}\n${preview}\n...\n\`\`\``;
        })
        .join('\n\n');

    const userPrompt = `Generate documentation for this ${language} project:

**Architecture:**
${blueprint.architecture}

**Files:**
${blueprint.files.map(f => `- ${f.path}: ${f.purpose}`).join('\n')}

**Dependencies:**
${blueprint.dependencies.join(', ')}

**Code Preview:**
${codeOverview}

Generate complete ${format} documentation.`;

    const documentation = await chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        { model: model || options.model || 'gemini-fast' } // Use passed model or fallback
    );

    return documentation;
}

/**
 * Generate inline code comments (JSDoc, docstrings, etc.)
 */
export async function generateInlineComments(
    code: string,
    language: 'typescript' | 'python' | 'go' | 'rust',
    model?: string // User-selected model
): Promise<string> {
    const commentStyle = getCommentStyle(language);

    const systemPrompt = `You are a ${language} expert. Add ${commentStyle} comments to the provided code.

Guidelines:
- Add comments for all public functions/methods
- Explain complex logic
- Document parameters and return values
- Keep comments concise and clear
- Follow ${commentStyle} conventions

Return the COMPLETE code with comments added.`;

    const userPrompt = `Add ${commentStyle} comments to this ${language} code:

\`\`\`${language}
${code}
\`\`\``;

    return chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        { model: model || 'gemini-fast' } // Use passed model or fallback
    );
}

/**
 * Get comment style for language
 */
function getCommentStyle(language: string): string {
    const styles: Record<string, string> = {
        typescript: 'JSDoc',
        python: 'docstring (Google style)',
        go: 'GoDoc',
        rust: 'Rustdoc'
    };
    return styles[language] || 'inline';
}

/**
 * Generate README.md for project
 */
export async function generateReadme(
    blueprint: Blueprint,
    framework?: string,
    model?: string // User-selected model
): Promise<string> {
    const systemPrompt = `Generate a professional README.md for a ${framework || 'software'} project.

Include:
- Project title and description
- Features
- Installation
- Usage examples
- Project structure
- Configuration
- API documentation (if applicable)
- License

Use proper markdown formatting with badges, code blocks, and sections.`;

    const userPrompt = `Generate README.md for:

**Architecture:** ${blueprint.architecture}

**Files:**
${blueprint.files.map(f => `- ${f.path}`).join('\n')}

**Dependencies:**
${blueprint.dependencies.join(', ')}

${framework ? `**Framework:** ${framework}` : ''}`;

    return chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        { model: model || 'gemini-fast' } // Use passed model or fallback
    );
}
