'use client';
/**
 * Agent Mode Toggle
 * Switch between Auto, Recommended, and Manual modes.
 * Self-contained version (no external UI libs usage).
 */

import { useState, useRef, useEffect } from 'react';
import { AgentMode } from '@/lib/agents/router';
import { ChevronDown, Zap, ShieldCheck, HandMetal } from 'lucide-react';

interface AgentModeToggleProps {
    mode: AgentMode;
    onChange: (mode: AgentMode) => void;
}

export function AgentModeToggle({ mode, onChange }: AgentModeToggleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const modes: { id: AgentMode; label: string; icon: React.ReactNode; desc: string }[] = [
        {
            id: 'auto',
            label: 'Auto Pilot',
            icon: <Zap className="w-4 h-4 text-yellow-400" />,
            desc: 'System automatically routes and executes agents.'
        },
        {
            id: 'recommended',
            label: 'Recommended',
            icon: <ShieldCheck className="w-4 h-4 text-blue-400" />,
            desc: 'System suggests agents, you approve.'
        },
        {
            id: 'manual',
            label: 'Manual',
            icon: <HandMetal className="w-4 h-4 text-slate-400" />,
            desc: 'You choose exactly which agents to run.'
        }
    ];

    const currentMode = modes.find(m => m.id === mode) || modes[0];

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-slate-200 shadow-sm"
            >
                {currentMode.icon}
                <span>{currentMode.label}</span>
                <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1e1e24] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-1">
                        {modes.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    onChange(m.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${mode === m.id ? 'bg-primary/10' : 'hover:bg-white/5'
                                    }`}
                            >
                                <div className="mt-0.5">{m.icon}</div>
                                <div>
                                    <div className={`text-xs font-semibold ${mode === m.id ? 'text-primary' : 'text-slate-200'}`}>
                                        {m.label}
                                    </div>
                                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                        {m.desc}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
