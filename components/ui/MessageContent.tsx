/**
 * MessageContent Component (Lovable-Style)
 * 
 * Renders chat message content with:
 * - Collapsible code blocks with file names
 * - "Click to view code" toggle
 * - Markdown-like formatting
 * 
 * Copyright © 2026 KilatOS
 */

'use client';

import React, { useMemo, useState } from 'react';

interface MessageContentProps {
    content: string;
    className?: string;
    /** If provided, shows this count instead of parsing from content */
    actualFileCount?: number;
}

// Parse file header patterns: // ===== /filename.ext ===== or similar
const FILE_HEADER_REGEX = /\/\/\s*=+\s*([^\s=]+)\s*=+/g;
const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

interface CodeFile {
    filename: string;
    language: string;
    code: string;
}

interface ContentSegment {
    type: 'text' | 'code-files';
    content: string;
    files?: CodeFile[];
}

// Extract files from raw content that uses // ===== filename ===== pattern
function extractFilesFromContent(content: string): CodeFile[] {
    const files: CodeFile[] = [];
    const lines = content.split('\n');

    let currentFile: { filename: string; code: string[] } | null = null;

    for (const line of lines) {
        const headerMatch = line.match(/^\/\/\s*=+\s*([^\s=]+)\s*=+/);

        if (headerMatch) {
            // Save previous file
            if (currentFile) {
                const ext = currentFile.filename.split('.').pop() || '';
                files.push({
                    filename: currentFile.filename,
                    language: getLanguageFromExt(ext),
                    code: currentFile.code.join('\n').trim()
                });
            }
            // Start new file
            currentFile = { filename: headerMatch[1], code: [] };
        } else if (currentFile) {
            currentFile.code.push(line);
        }
    }

    // Save last file
    if (currentFile && currentFile.code.length > 0) {
        const ext = currentFile.filename.split('.').pop() || '';
        files.push({
            filename: currentFile.filename,
            language: getLanguageFromExt(ext),
            code: currentFile.code.join('\n').trim()
        });
    }

    return files;
}

function getLanguageFromExt(ext: string): string {
    const map: Record<string, string> = {
        'tsx': 'typescript',
        'ts': 'typescript',
        'jsx': 'javascript',
        'js': 'javascript',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'sql': 'sql',
        'prisma': 'prisma',
        'md': 'markdown',
    };
    return map[ext.toLowerCase()] || 'plaintext';
}

// Parse content into segments
function parseContent(content: string): ContentSegment[] {
    const segments: ContentSegment[] = [];

    // Check if content has file headers (// ===== /App.tsx =====)
    const hasFileHeaders = FILE_HEADER_REGEX.test(content);
    FILE_HEADER_REGEX.lastIndex = 0; // Reset regex

    if (hasFileHeaders) {
        // Extract files from the content
        const files = extractFilesFromContent(content);

        if (files.length > 0) {
            // Find text BEFORE the first file header (conversational greeting)
            const firstHeaderMatch = content.match(/^([\s\S]*?)\/\/\s*=+\s*[^\s=]+\s*=+/);
            const textBefore = firstHeaderMatch?.[1]?.trim();

            // ALWAYS show conversational text if it exists
            if (textBefore && textBefore.length > 0) {
                segments.push({ type: 'text', content: textBefore });
            }

            // Add code files collapsible
            segments.push({ type: 'code-files', content: '', files });
            return segments;
        }
    }


    // Fallback: check for standard code blocks
    let lastIndex = 0;
    let match;

    while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
        // Text before code block
        if (match.index > lastIndex) {
            const text = content.slice(lastIndex, match.index).trim();
            if (text) segments.push({ type: 'text', content: text });
        }

        // Code block as file
        segments.push({
            type: 'code-files',
            content: '',
            files: [{
                filename: match[1] || 'code',
                language: match[1] || 'plaintext',
                code: match[2].trim()
            }]
        });

        lastIndex = match.index + match[0].length;
    }

    CODE_BLOCK_REGEX.lastIndex = 0;

    // Remaining text
    if (lastIndex < content.length) {
        const remaining = content.slice(lastIndex).trim();
        if (remaining) segments.push({ type: 'text', content: remaining });
    }

    // If no segments, return as plain text
    if (segments.length === 0) {
        segments.push({ type: 'text', content: content });
    }

    return segments;
}

// Collapsible Code Files Component (Lovable-style)
function CodeFilesBlock({ files, actualFileCount }: { files: CodeFile[]; actualFileCount?: number }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const icons: Record<string, string> = {
            'tsx': '⚛️',
            'jsx': '⚛️',
            'ts': '📘',
            'js': '📒',
            'css': '🎨',
            'html': '🌐',
            'json': '📋',
            'prisma': '🔷',
            'sql': '🗄️',
            'py': '🐍',
        };
        return icons[ext] || '📄';
    };

    return (
        <div className="my-3 rounded-xl border border-white/10 bg-[#0d1117] overflow-hidden">
            {/* Header - Click to expand */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-[#161b22] hover:bg-[#1c2128] transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <span className="text-primary">{'</>'}</span>
                    <span className="text-sm font-medium text-slate-200">
                        {actualFileCount && actualFileCount > files.length
                            ? `${actualFileCount} files generated`
                            : files.length === 1
                                ? `Edit ${files[0].filename}`
                                : `${files.length} files generated`
                        }
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{isExpanded ? 'Hide code' : 'Click to view code'}</span>
                    <span className={`material-symbols-outlined text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-white/10">
                    {/* File Tabs (if multiple files) */}
                    {files.length > 1 && (
                        <div className="flex gap-1 px-2 py-2 bg-[#161b22] border-b border-white/10 overflow-x-auto">
                            {files.map((file, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveTab(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition ${activeTab === idx
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-slate-400 hover:bg-white/5'
                                        }`}
                                >
                                    <span>{getFileIcon(file.filename)}</span>
                                    {file.filename}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Code Content */}
                    <div className="relative">
                        {/* Copy Button */}
                        <button
                            onClick={() => navigator.clipboard.writeText(files[activeTab].code)}
                            className="absolute top-2 right-2 px-2 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-white/10 transition z-10"
                        >
                            Copy
                        </button>

                        {/* Code */}
                        <pre className="p-4 text-sm leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto">
                            <code className="text-slate-200 font-mono">
                                {files[activeTab].code}
                            </code>
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

// Text Content with basic formatting
function TextContent({ content }: { content: string }) {
    // Handle line breaks
    return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {content.split('\n').map((line, idx) => (
                <React.Fragment key={idx}>
                    {line}
                    {idx < content.split('\n').length - 1 && <br />}
                </React.Fragment>
            ))}
        </div>
    );
}

// Main Component
export default function MessageContent({ content, className = '', actualFileCount }: MessageContentProps) {
    const segments = useMemo(() => parseContent(content), [content]);

    // Check if we have code-files segment from parsing
    const hasCodeFilesSegment = segments.some(s => s.type === 'code-files' && s.files && s.files.length > 0);

    return (
        <div className={`message-content space-y-2 ${className}`}>
            {/* Render text and parsed code segments */}
            {segments.map((segment, index) => {
                if (segment.type === 'code-files' && segment.files) {
                    return <CodeFilesBlock key={index} files={segment.files} actualFileCount={actualFileCount} />;
                }
                return <TextContent key={index} content={segment.content} />;
            })}

            {/* Lovable-style: Show file badge even if content has no code blocks */}
            {/* This happens when backend sends clean greeting + files separately */}
            {!hasCodeFilesSegment && actualFileCount && actualFileCount > 0 && (
                <div className="my-3 rounded-xl border border-white/10 bg-[#0d1117] overflow-hidden">
                    <div className="px-4 py-3 flex items-center justify-between bg-[#161b22] text-left">
                        <div className="flex items-center gap-3">
                            <span className="text-primary">{'</>'}</span>
                            <span className="text-sm font-medium text-slate-200">
                                {actualFileCount} files generated
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            See code in Explorer →
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

