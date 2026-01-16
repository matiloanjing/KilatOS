import React from 'react';
import { GlassCard } from './GlassCard';
import { Code, Clock, Terminal, Copy, Play } from 'lucide-react';
import { GeneratedCode } from '@/lib/history/code-history';

interface CodeSnippetCardProps {
    snippet: GeneratedCode;
    onView?: (snippet: GeneratedCode) => void;
}

export const CodeSnippetCard: React.FC<CodeSnippetCardProps> = ({ snippet, onView }) => {
    // Determine language color
    const getLangColor = (lang: string) => {
        switch (lang.toLowerCase()) {
            case 'typescript':
            case 'ts':
            case 'tsx': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
            case 'javascript':
            case 'js':
            case 'jsx': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
            case 'python': return 'text-green-400 border-green-500/30 bg-green-500/10';
            case 'html': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
            case 'css': return 'text-pink-400 border-pink-500/30 bg-pink-500/10';
            default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
        }
    };

    const langStyle = getLangColor(snippet.language);

    return (
        <GlassCard hoverEffect={true} className="group relative flex flex-col h-64 overflow-hidden border border-white/5 bg-white/[0.02]">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className={`px-2 py-1 rounded text-xs font-mono uppercase border ${langStyle}`}>
                    {snippet.language}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Copy">
                        <Copy className="w-4 h-4" />
                    </button>
                    {onView && (
                        <button
                            onClick={() => onView(snippet)}
                            className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 hover:text-purple-300 transition-colors"
                            title="Run / View"
                        >
                            <Play className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content Preview */}
            <div className="flex-1 font-mono text-xs text-gray-400 overflow-hidden relative mb-4">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f12]/90 z-10" />
                <pre className="opacity-70 group-hover:opacity-100 transition-opacity">
                    {snippet.code.substring(0, 300)}
                </pre>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-white/5 flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                    {snippet.agent_type === 'frontend' ? <Terminal className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                    <span className="capitalize">{snippet.agent_type}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(snippet.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        </GlassCard>
    );
};
