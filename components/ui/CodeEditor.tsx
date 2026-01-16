/**
 * CodeEditor Component
 * Monaco-based code editor with syntax highlighting
 * 
 * Features:
 * - Auto language detection from file extension
 * - Dark theme matching UI
 * - Auto-save with 500ms debounce
 * - Keyboard shortcuts
 * 
 * Copyright © 2026 KilatOS
 */

'use client';

import { useMemo, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useDebouncedCallback } from 'use-debounce';

// ============================================================================
// Types
// ============================================================================

interface CodeEditorProps {
    files: Record<string, string>;
    activeFile: string | null;
    onFileChange?: (filename: string, content: string) => void;
    readOnly?: boolean;
    className?: string;
}

// Language mapping from file extension
const LANGUAGE_MAP: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.md': 'markdown',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.php': 'php',
    '.rb': 'ruby',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.sql': 'sql',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.xml': 'xml',
    '.sh': 'shell',
    '.bash': 'shell',
};

// ============================================================================
// Helper Functions
// ============================================================================

function getLanguageFromFilename(filename: string): string {
    const ext = filename.slice(filename.lastIndexOf('.'));
    return LANGUAGE_MAP[ext] || 'plaintext';
}

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
    };
    return icons[ext] || '📄';
}

// ============================================================================
// Component
// ============================================================================

export default function CodeEditor({
    files,
    activeFile,
    onFileChange,
    readOnly = false,
    className = ''
}: CodeEditorProps) {
    // Get current file content
    const fileContent = useMemo(() => {
        if (!activeFile || !files[activeFile]) return '';
        return files[activeFile];
    }, [activeFile, files]);

    // Get language for syntax highlighting
    const language = useMemo(() => {
        if (!activeFile) return 'plaintext';
        return getLanguageFromFilename(activeFile);
    }, [activeFile]);

    // Debounced save (500ms)
    const debouncedOnChange = useDebouncedCallback((value: string | undefined) => {
        if (activeFile && value !== undefined && onFileChange) {
            onFileChange(activeFile, value);
        }
    }, 500);

    // Handle editor change
    const handleChange = useCallback((value: string | undefined) => {
        debouncedOnChange(value);
    }, [debouncedOnChange]);

    // Editor mount handler
    const handleEditorMount: OnMount = useCallback((editor, monaco) => {
        // Custom keybindings
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // Force immediate save on Ctrl+S
            if (activeFile && onFileChange) {
                const value = editor.getValue();
                onFileChange(activeFile, value);
            }
        });

        // Focus editor
        editor.focus();
    }, [activeFile, onFileChange]);

    // No file selected state
    if (!activeFile) {
        return (
            <div className={`flex flex-col items-center justify-center h-full bg-obsidian text-slate-500 ${className}`}>
                <span className="text-4xl mb-4">📝</span>
                <p className="text-sm">Select a file from Explorer to edit</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-[#1e1e1e] ${className}`}>
            {/* File Tab Header */}
            <div className="h-9 bg-[#252526] border-b border-[#3c3c3c] flex items-center px-2 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border-t-2 border-accent-purple rounded-t text-sm">
                    <span>{getFileIcon(activeFile)}</span>
                    <span className="text-slate-200 font-medium">{activeFile.split('/').pop()}</span>
                    {!readOnly && (
                        <span className="text-[10px] text-slate-500 ml-1">(auto-save)</span>
                    )}
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    language={language}
                    value={fileContent}
                    theme="vs-dark"
                    onChange={handleChange}
                    onMount={handleEditorMount}
                    options={{
                        readOnly,
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                        fontLigatures: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        tabSize: 2,
                        insertSpaces: true,
                        wordWrap: 'on',
                        automaticLayout: true,
                        padding: { top: 12, bottom: 12 },
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                        bracketPairColorization: { enabled: true },
                    }}
                    loading={
                        <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                                <div className="animate-spin w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full"></div>
                                <span className="text-sm">Loading editor...</span>
                            </div>
                        </div>
                    }
                />
            </div>
        </div>
    );
}
