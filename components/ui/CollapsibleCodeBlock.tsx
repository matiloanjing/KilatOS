/**
 * CollapsibleCodeBlock Component
 * 
 * Lovable-style collapsible code block for chat messages.
 * Shows file count, expandable to view file list.
 * 
 * Copyright © 2026 KilatOS
 */

'use client';

import { useState } from 'react';

interface CollapsibleCodeBlockProps {
    files: Record<string, string>;
    onFileClick?: (filename: string) => void;
    defaultExpanded?: boolean;
}

// Get file icon based on extension
function getFileIcon(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.'));
    const icons: Record<string, string> = {
        '.tsx': '⚛️',
        '.jsx': '⚛️',
        '.ts': '📘',
        '.js': '📒',
        '.css': '🎨',
        '.html': '🌐',
        '.json': '📋',
        '.md': '📝',
        '.py': '🐍',
        '.go': '🐹',
        '.rs': '🦀',
    };
    return icons[ext] || '📄';
}

export default function CollapsibleCodeBlock({
    files,
    onFileClick,
    defaultExpanded = false
}: CollapsibleCodeBlockProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const fileList = Object.keys(files);
    const fileCount = fileList.length;

    if (fileCount === 0) return null;

    return (
        <div className="mt-3 rounded-lg border border-panel-border bg-obsidian/50 overflow-hidden">
            {/* Header - Click to expand */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-accent-purple">📁</span>
                    <span className="text-slate-300 font-medium">
                        {fileCount} {fileCount === 1 ? 'file' : 'files'} generated
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                        {isExpanded ? 'Click to collapse' : 'Click to view'}
                    </span>
                    <span
                        className={`material-symbols-outlined text-base text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                        expand_more
                    </span>
                </div>
            </button>

            {/* Expanded File List */}
            {isExpanded && (
                <div className="border-t border-panel-border max-h-64 overflow-y-auto scrollbar-custom">
                    {fileList.map((filename) => (
                        <button
                            key={filename}
                            onClick={() => onFileClick?.(filename)}
                            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-accent-purple/10 transition-colors text-left group"
                        >
                            <span className="text-sm">{getFileIcon(filename)}</span>
                            <span className="text-sm text-slate-300 group-hover:text-accent-purple truncate flex-1">
                                {filename}
                            </span>
                            <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                Open in editor →
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Error Display Component (Lovable-style)
// ============================================================================

interface ErrorDisplayProps {
    error: string;
    defaultExpanded?: boolean;
}

export function ErrorDisplay({ error, defaultExpanded = false }: ErrorDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-950/30 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-red-500/10 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-400">❌</span>
                    <span className="text-red-300 font-medium">Error occurred</span>
                </div>
                <span className="text-xs text-red-400/70 underline">
                    {isExpanded ? 'Hide error' : 'Show error'}
                </span>
            </button>

            {/* Expanded Error Details */}
            {isExpanded && (
                <div className="border-t border-red-500/30 p-4 bg-red-950/20">
                    <pre className="text-xs text-red-300 whitespace-pre-wrap break-words font-mono overflow-x-auto">
                        {error}
                    </pre>
                </div>
            )}
        </div>
    );
}
