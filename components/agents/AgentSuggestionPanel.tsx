'use client';
/**
 * Agent Suggestion Panel
 * Displays AI-recommended agents to the user.
 * Self-contained version (no external UI libs).
 */

import { AgentType } from '@/lib/agents/router'; // Correct import
import { AgentSuggestion } from '@/lib/agents/recommender';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface AgentSuggestionPanelProps {
    suggestions: AgentSuggestion[];
    onAccept: (agent: AgentType) => void;
    onSkip: () => void;
    className?: string; // Standard className prop
}

export function AgentSuggestionPanel({
    suggestions,
    onAccept,
    onSkip,
    className = ''
}: AgentSuggestionPanelProps) {
    if (!suggestions || suggestions.length === 0) return null;

    const topSuggestion = suggestions[0];

    return (
        <div className={`w-full max-w-2xl mx-auto mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300 ${className}`}>
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden">
                {/* Shine effect */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>

                <div className="flex items-start gap-4 relaitve z-10">
                    <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-sm font-bold text-blue-100">
                                Suggested: {topSuggestion.name}
                            </h3>
                            <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                {Math.round(topSuggestion.confidence * 100)}% Match
                            </span>
                        </div>

                        <p className="text-xs text-blue-200/80 mb-3 leading-relaxed">
                            {topSuggestion.reason}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onAccept(topSuggestion.agent)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md active:scale-95"
                            >
                                Switch Agent
                                <ArrowRight className="w-3 h-3" />
                            </button>

                            <button
                                onClick={onSkip}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                <X className="w-3 h-3" />
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>

                {/* Additional suggestions (if multiple) */}
                {suggestions.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex gap-2 overflow-x-auto pb-1">
                        {suggestions.slice(1).map((s) => (
                            <button
                                key={s.agent}
                                onClick={() => onAccept(s.agent)}
                                className="flex-shrink-0 flex items-center gap-2 px-2 py-1 bg-black/20 hover:bg-black/40 border border-white/5 rounded text-[10px] text-slate-300 transition-colors"
                            >
                                <span>{s.name}</span>
                                <span className="opacity-50 text-[9px]">{Math.round(s.confidence * 100)}%</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
