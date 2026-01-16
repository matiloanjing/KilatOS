/**
 * Code Executor Tool
 * Uses Piston API for sandboxed code execution
 * Copyright © 2025 KilatCode Studio
 */

const PISTON_API_URL = process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston';

export interface CodeExecutionResult {
    success: boolean;
    output: string;
    error?: string;
    runtime?: {
        language: string;
        version: string;
    };
}

export interface PistonLanguage {
    language: string;
    version: string;
    aliases: string[];
}

/**
 * Get available languages from Piston
 */
export async function getAvailableLanguages(): Promise<PistonLanguage[]> {
    const response = await fetch(`${PISTON_API_URL}/runtimes`);

    if (!response.ok) {
        throw new Error('Failed to fetch available languages');
    }

    return response.json();
}

/**
 * Execute code using Piston API
 */
export async function executeCode(
    code: string,
    language: string,
    stdin?: string
): Promise<CodeExecutionResult> {
    try {
        // Map common language names to Piston identifiers
        const languageMap: Record<string, string> = {
            'python': 'python',
            'python3': 'python',
            'javascript': 'javascript',
            'js': 'javascript',
            'typescript': 'typescript',
            'ts': 'typescript',
            'java': 'java',
            'cpp': 'c++',
            'c++': 'c++',
            'c': 'c',
            'rust': 'rust',
            'go': 'go',
            'ruby': 'ruby',
            'php': 'php',
        };

        const pistonLanguage = languageMap[language.toLowerCase()] || language;

        const response = await fetch(`${PISTON_API_URL}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: pistonLanguage,
                version: '*', // Use latest version
                files: [
                    {
                        name: `main.${getFileExtension(pistonLanguage)}`,
                        content: code,
                    },
                ],
                stdin: stdin || '',
                args: [],
                compile_timeout: 10000,
                run_timeout: 3000,
                compile_memory_limit: -1,
                run_memory_limit: -1,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                output: '',
                error: `Piston API error: ${error}`,
            };
        }

        const result = await response.json();

        // Check for compilation or runtime errors
        if (result.compile && result.compile.code !== 0) {
            return {
                success: false,
                output: result.compile.output || '',
                error: result.compile.stderr || 'Compilation failed',
                runtime: {
                    language: result.language,
                    version: result.version,
                },
            };
        }

        if (result.run && result.run.code !== 0) {
            return {
                success: false,
                output: result.run.stdout || '',
                error: result.run.stderr || 'Runtime error',
                runtime: {
                    language: result.language,
                    version: result.version,
                },
            };
        }

        // Successful execution
        return {
            success: true,
            output: result.run?.stdout || result.run?.output || '',
            runtime: {
                language: result.language,
                version: result.version,
            },
        };
    } catch (error) {
        return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get file extension for language
 */
function getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
        python: 'py',
        javascript: 'js',
        typescript: 'ts',
        java: 'java',
        'c++': 'cpp',
        c: 'c',
        rust: 'rs',
        go: 'go',
        ruby: 'rb',
        php: 'php',
    };

    return extensions[language] || 'txt';
}

/**
 * Format code execution result for LLM
 */
export function formatCodeExecutionContext(result: CodeExecutionResult): string {
    if (result.success) {
        return `Code executed successfully:\n\`\`\`\n${result.output}\n\`\`\``;
    } else {
        return `Code execution failed:\nError: ${result.error}\n${result.output ? `Output:\n\`\`\`\n${result.output}\n\`\`\`` : ''}`;
    }
}
