/**
 * CodeGen Preview Integration
 * Connects CodeGen agent with live preview
 * Copyright © 2025 KilatCode Studio
 */

import { PreviewFileManager, codeGenToPreviewFiles } from './file-manager';
import { getTemplate, CodeTemplate } from './templates';
import type { CodeGenResponse } from '@/lib/agents/codegen/orchestrator';

export interface PreviewConfig {
    template?: string;
    autoDetect?: boolean;
    showConsole?: boolean;
    editable?: boolean;
    theme?: 'light' | 'dark' | 'auto';
}

/**
 * Convert CodeGen response to preview-ready format
 */
export function codeGenToPreview(
    codeGenResult: CodeGenResponse,
    config: PreviewConfig = {}
): {
    files: Record<string, string>;
    template: CodeTemplate['framework'];
    dependencies: Record<string, string>;
} {
    const {
        autoDetect = true,
        template: templateName
    } = config;

    // Get generated code files
    const files = codeGenResult.code?.files || {};

    // Auto-detect template from files
    let template: CodeTemplate['framework'] = 'react-ts';
    let dependencies: Record<string, string> = {};

    if (autoDetect) {
        const detected = detectFramework(files);
        template = detected.framework;
        dependencies = detected.dependencies;
    } else if (templateName) {
        const tmpl = getTemplate(templateName);
        if (tmpl) {
            template = tmpl.framework;
            dependencies = tmpl.dependencies;
        }
    }

    return {
        files,
        template,
        dependencies
    };
}

/**
 * Auto-detect framework from files
 */
function detectFramework(files: Record<string, string>): {
    framework: CodeTemplate['framework'];
    dependencies: Record<string, string>;
} {
    const fileNames = Object.keys(files);
    const fileContents = Object.values(files).join('\n');

    // Check for Next.js
    if (fileNames.some(f => f.includes('app/page') || f.includes('pages/'))) {
        return {
            framework: 'nextjs',
            dependencies: {
                'react': '^18.2.0',
                'react-dom': '^18.2.0',
                'next': '^14.0.0'
            }
        };
    }

    // Check for Vite
    if (fileNames.some(f => f.includes('vite.config')) || fileContents.includes('import.meta.env')) {
        return {
            framework: 'vite-react-ts',
            dependencies: {
                'react': '^18.2.0',
                'react-dom': '^18.2.0',
                'vite': '^5.0.0',
                '@vitejs/plugin-react': '^4.2.0'
            }
        };
    }

    // Check for React
    if (fileContents.includes('import React') || fileContents.includes('from \'react\'')) {
        return {
            framework: 'react-ts',
            dependencies: {
                'react': '^18.2.0',
                'react-dom': '^18.2.0'
            }
        };
    }

    // Default to vanilla TypeScript
    return {
        framework: 'vanilla-ts',
        dependencies: {
            'typescript': '^5.0.0'
        }
    };
}

/**
 * Enhance CodeGen output with preview metadata
 */
export function enhanceCodeGenWithPreview(
    codeGenResult: CodeGenResponse
): CodeGenResponse & {
    preview: {
        ready: boolean;
        template: CodeTemplate['framework'];
        fileCount: number;
        entryFile: string | null;
    };
} {
    const fileManager = codeGenToPreviewFiles(codeGenResult.code?.files || {});
    const detected = detectFramework(fileManager.getFilesObject());

    return {
        ...codeGenResult,
        preview: {
            ready: fileManager.getFileCount() > 0,
            template: detected.framework,
            fileCount: fileManager.getFileCount(),
            entryFile: fileManager.getEntryFile()
        }
    };
}

/**
 * Validate code for preview compatibility
 */
export function validateForPreview(files: Record<string, string>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty files
    if (Object.keys(files).length === 0) {
        errors.push('No files provided');
        return { valid: false, errors, warnings };
    }

    // Check for entry file
    const fileManager = codeGenToPreviewFiles(files);
    if (!fileManager.getEntryFile()) {
        warnings.push('No clear entry file found (index.tsx, App.tsx, etc.)');
    }

    // Check for common issues
    for (const [path, content] of Object.entries(files)) {
        // Check file size
        if (content.length > 100000) {
            warnings.push(`File ${path} is very large (${content.length} bytes)`);
        }

        // Check for syntax errors (basic)
        if (content.includes('PLACEHOLDER') || content.includes('TODO')) {
            warnings.push(`File ${path} contains placeholders`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
