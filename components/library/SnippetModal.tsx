'use client';

import { X, Copy, Terminal, Download } from 'lucide-react';
import { GeneratedCode } from '@/lib/history/code-history';

interface SnippetModalProps {
    snippet: GeneratedCode | null;
    isOpen: boolean;
    onClose: () => void;
}

export function SnippetModal({ snippet, isOpen, onClose }: SnippetModalProps) {
    if (!isOpen || !snippet) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(snippet.code);
    };

    const handleDownload = () => {
        const blob = new Blob([snippet.code], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snippet-${snippet.id.slice(0, 8)}.${getExt(snippet.language)}`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getExt = (lang: string) => {
        const map: Record<string, string> = {
            typescript: 'ts',
            javascript: 'js',
            python: 'py',
            html: 'html',
            css: 'css',
            json: 'json'
        };
        return map[lang.toLowerCase()] || 'txt';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0f0f12] border border-white/10 rounded-2xl shadow-2xl flex flex-col animate-scale-up overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white/5`}>
                            <Terminal className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Code Snippet</h3>
                            <p className="text-xs text-gray-400 font-mono">ID: {snippet.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs font-mono uppercase bg-white/10 text-gray-300 border border-white/10">
                            {snippet.language}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-[#0a0a0a] p-4 font-mono text-sm">
                    <pre className="text-gray-300 whitespace-pre-wrap break-words">
                        {snippet.code}
                    </pre>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                    <button
                        onClick={handleCopy}
                        className="btn-outline-premium px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <Copy className="w-4 h-4" />
                        Copy Code
                    </button>
                    <button
                        onClick={handleDownload}
                        className="btn-premium px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
}
