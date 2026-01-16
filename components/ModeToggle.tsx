'use client';

import React, { useState } from 'react';
import { ChevronUp, Zap, Brain } from 'lucide-react';

/**
 * ModeToggle - Planning vs Fast mode selector
 * 
 * - Planning: Full multi-agent orchestration (complex tasks)
 * - Fast: Simplified prompt, faster response (simple tasks)
 */

export type ChatMode = 'planning' | 'fast';

interface ModeToggleProps {
    currentMode: ChatMode;
    onModeChange: (mode: ChatMode) => void;
    className?: string;
}

const MODE_INFO = {
    planning: {
        icon: Brain,
        label: 'Planning',
        description: 'Agent can plan before executing tasks. Use for deep research, complex tasks, or collaborative work',
        color: '#8b5cf6'
    },
    fast: {
        icon: Zap,
        label: 'Fast',
        description: 'Agent will execute tasks directly. Use for simple tasks that can be completed faster',
        color: '#22c55e'
    }
};

export function ModeToggle({
    currentMode,
    onModeChange,
    className = ''
}: ModeToggleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const CurrentIcon = MODE_INFO[currentMode].icon;

    return (
        <div className={`mode-toggle ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="toggle-trigger"
            >
                <ChevronUp size={12} className="caret" />
                <span className="mode-label">{MODE_INFO[currentMode].label}</span>
            </button>

            {isOpen && (
                <>
                    <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="dropdown-menu">
                        <div className="dropdown-header">Conversation mode</div>

                        {(Object.keys(MODE_INFO) as ChatMode[]).map(mode => {
                            const info = MODE_INFO[mode];
                            const Icon = info.icon;

                            return (
                                <button
                                    key={mode}
                                    className={`mode-option ${mode === currentMode ? 'active' : ''}`}
                                    onClick={() => {
                                        onModeChange(mode);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="option-header">
                                        <Icon size={16} style={{ color: info.color }} />
                                        <span className="option-label">{info.label}</span>
                                    </div>
                                    <p className="option-description">{info.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            <style jsx>{`
                .mode-toggle {
                    position: relative;
                }

                .toggle-trigger {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 10px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #94a3b8;
                    font-size: 13px;
                    transition: color 0.2s ease;
                }

                .toggle-trigger:hover {
                    color: #e2e8f0;
                }

                .caret {
                    transition: transform 0.2s ease;
                }

                .dropdown-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 40;
                }

                .dropdown-menu {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 0;
                    min-width: 320px;
                    background: #1e293b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    z-index: 50;
                    overflow: hidden;
                }

                .dropdown-header {
                    padding: 12px 14px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #e2e8f0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .mode-option {
                    width: 100%;
                    padding: 12px 14px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    text-align: left;
                    transition: background 0.2s ease;
                }

                .mode-option:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .mode-option.active {
                    background: rgba(139, 92, 246, 0.1);
                }

                .option-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .option-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #e2e8f0;
                }

                .option-description {
                    font-size: 12px;
                    color: #64748b;
                    line-height: 1.4;
                    margin: 0;
                }
            `}</style>
        </div>
    );
}

export default ModeToggle;
