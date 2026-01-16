'use client';

import React, { useState } from 'react';
import { MessageSquare, History, Settings, Database, Code, Rocket, ChevronDown } from 'lucide-react';

/**
 * HeaderBar - Lovable-style header with project controls
 * 
 * Layout: [Chat][History] | project-name | ⚙️ 🟢Supabase | </>Edit | 🚀Publish
 */

interface HeaderBarProps {
    projectName?: string;
    isSupabaseConnected?: boolean;
    onChatClick?: () => void;
    onHistoryClick?: () => void;
    onEditCodeClick?: () => void;
    onPublishClick?: () => void;
    onSettingsClick?: () => void;
    className?: string;
}

export function HeaderBar({
    projectName = 'my-project',
    isSupabaseConnected = false,
    onChatClick,
    onHistoryClick,
    onEditCodeClick,
    onPublishClick,
    onSettingsClick,
    className = ''
}: HeaderBarProps) {
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

    return (
        <header className={`header-bar ${className}`}>
            {/* Left: Chat & History tabs */}
            <div className="header-left">
                <button
                    className="tab-btn active"
                    onClick={onChatClick}
                >
                    <MessageSquare size={16} />
                    <span>Chat</span>
                </button>
                <button
                    className="tab-btn"
                    onClick={onHistoryClick}
                >
                    <History size={16} />
                    <span>History</span>
                </button>
            </div>

            {/* Center: Project name */}
            <div className="header-center">
                <button
                    className="project-selector"
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                >
                    <span className="project-name">{projectName}</span>
                    <ChevronDown size={14} className="chevron" />
                </button>
            </div>

            {/* Right: Actions */}
            <div className="header-right">
                {/* Settings */}
                <button className="icon-btn" onClick={onSettingsClick} title="Settings">
                    <Settings size={18} />
                </button>

                {/* Supabase status */}
                <button className="status-btn" title="Supabase Connection">
                    <span className={`status-dot ${isSupabaseConnected ? 'connected' : 'disconnected'}`} />
                    <Database size={16} />
                    <span className="status-label">Supabase</span>
                </button>

                {/* Edit code */}
                <button className="action-btn secondary" onClick={onEditCodeClick}>
                    <Code size={16} />
                    <span>Edit code</span>
                </button>

                {/* Publish */}
                <button className="action-btn primary" onClick={onPublishClick}>
                    <Rocket size={16} />
                    <span>Publish</span>
                </button>
            </div>

            <style jsx>{`
                .header-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 16px;
                    background: #0f172a;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    height: 52px;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    color: #64748b;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .tab-btn:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #94a3b8;
                }

                .tab-btn.active {
                    background: rgba(139, 92, 246, 0.1);
                    color: #a78bfa;
                }

                .header-center {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                }

                .project-selector {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #e2e8f0;
                    font-size: 14px;
                    font-weight: 500;
                }

                .project-selector:hover {
                    color: #f8fafc;
                }

                .chevron {
                    color: #64748b;
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-shrink: 0;  /* Prevent truncation */
                }

                .icon-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .icon-btn:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #94a3b8;
                }

                .status-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: #94a3b8;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .status-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }

                .status-dot.connected {
                    background: #22c55e;
                    box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
                }

                .status-dot.disconnected {
                    background: #64748b;
                }

                .status-label {
                    display: none;
                }

                @media (min-width: 768px) {
                    .status-label {
                        display: inline;
                    }
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .action-btn.secondary {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #e2e8f0;
                }

                .action-btn.secondary:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .action-btn.primary {
                    background: linear-gradient(135deg, #8b5cf6, #6366f1);
                    color: white;
                }

                .action-btn.primary:hover {
                    opacity: 0.9;
                }

                @media (max-width: 640px) {
                    .action-btn span {
                        display: none;
                    }
                }
            `}</style>
        </header>
    );
}

export default HeaderBar;
