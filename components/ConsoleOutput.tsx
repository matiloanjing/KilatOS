/**
 * ConsoleOutput Component
 * 
 * Displays code execution output for non-React languages (Python, Go, PHP, etc.)
 * Uses Piston API for execution.
 * 
 * Copyright © 2026 KilatOS
 */

'use client';

import { useState, useEffect } from 'react';

interface ConsoleOutputProps {
    files: Record<string, string>;
    language?: string;  // Auto-detected if not provided
    autoRun?: boolean;  // Run on mount/file change
}

// Language detection from file extension
const LANGUAGE_MAP: Record<string, string> = {
    '.py': 'python',
    '.go': 'go',
    '.php': 'php',
    '.rb': 'ruby',
    '.rs': 'rust',
    '.java': 'java',
    '.cpp': 'cpp',
    '.c': 'c',
    '.js': 'javascript',
    '.ts': 'typescript',
};

export default function ConsoleOutput({
    files,
    language,
    autoRun = true
}: ConsoleOutputProps) {
    const [output, setOutput] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isRunning, setIsRunning] = useState(false);
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [detectedLang, setDetectedLang] = useState<string>('');

    // Detect language from files
    useEffect(() => {
        if (language) {
            setDetectedLang(language);
            return;
        }

        const filePaths = Object.keys(files || {});
        for (const path of filePaths) {
            const ext = path.substring(path.lastIndexOf('.'));
            if (LANGUAGE_MAP[ext]) {
                setDetectedLang(LANGUAGE_MAP[ext]);
                break;
            }
        }
    }, [files, language]);

    // Get main file content
    const getMainCode = (): string => {
        const filePaths = Object.keys(files || {});

        // Priority order for main files
        const priorities = [
            'main.py', 'app.py', 'index.py',
            'main.go', 'main.rs', 'Main.java',
            'index.js', 'index.ts', 'main.cpp', 'main.c',
            'index.php', 'main.rb'
        ];

        for (const priority of priorities) {
            const match = filePaths.find(p => p.endsWith(priority));
            if (match) return files[match];
        }

        // Fallback to first file
        return filePaths.length > 0 ? files[filePaths[0]] : '';
    };

    // Execute code
    const runCode = async () => {
        const code = getMainCode();
        if (!code || !detectedLang) {
            setError('No code to execute');
            return;
        }

        setIsRunning(true);
        setOutput('');
        setError('');
        setExecutionTime(null);

        const startTime = Date.now();

        try {
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: detectedLang,
                    version: '*',
                    files: [{
                        name: `main.${getExtension(detectedLang)}`,
                        content: code
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Piston API error: ${response.status}`);
            }

            const result = await response.json();

            // Combine compile and run output
            const compileOut = result.compile?.stdout || '';
            const compileErr = result.compile?.stderr || '';
            const runOut = result.run?.stdout || '';
            const runErr = result.run?.stderr || '';

            setOutput(compileOut + runOut);
            setError(compileErr + runErr);
            setExecutionTime(Date.now() - startTime);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Execution failed');
        } finally {
            setIsRunning(false);
        }
    };

    // Auto-run on mount or file change
    useEffect(() => {
        if (autoRun && detectedLang && Object.keys(files || {}).length > 0) {
            runCode();
        }
    }, [files, detectedLang, autoRun]);

    const getExtension = (lang: string): string => {
        const extMap: Record<string, string> = {
            python: 'py',
            go: 'go',
            php: 'php',
            ruby: 'rb',
            rust: 'rs',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            javascript: 'js',
            typescript: 'ts'
        };
        return extMap[lang] || 'txt';
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/95 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-300">🖥️ Console Output</span>
                    {detectedLang && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                            {detectedLang}
                        </span>
                    )}
                    {isRunning && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full animate-pulse">
                            Running...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {executionTime !== null && (
                        <span className="text-xs text-gray-500">{executionTime}ms</span>
                    )}
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="px-3 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                        ▶ Run
                    </button>
                </div>
            </div>

            {/* Code Preview */}
            <div className="flex-shrink-0 max-h-40 overflow-auto p-3 bg-gray-800/50 border-b border-white/5">
                <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                    {getMainCode().substring(0, 500)}
                    {getMainCode().length > 500 && '...'}
                </pre>
            </div>

            {/* Output */}
            <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                {/* Stdout */}
                {output && (
                    <div className="mb-4">
                        <div className="text-xs text-gray-500 mb-1">stdout:</div>
                        <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
                    </div>
                )}

                {/* Stderr */}
                {error && (
                    <div>
                        <div className="text-xs text-gray-500 mb-1">stderr:</div>
                        <pre className="text-red-400 whitespace-pre-wrap">{error}</pre>
                    </div>
                )}

                {/* Empty state */}
                {!output && !error && !isRunning && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <div className="text-4xl mb-3">🖥️</div>
                        <p>Click "Run" to execute code</p>
                        <p className="text-xs mt-1">Powered by Piston API (50+ languages)</p>
                    </div>
                )}

                {/* Loading */}
                {isRunning && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3"></div>
                        <p className="text-gray-400">Executing {detectedLang} code...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
