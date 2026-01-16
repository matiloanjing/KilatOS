'use client';

import React, { useState } from 'react';
import { ChevronRight, Code, FileCode } from 'lucide-react';

/**
 * CollapsibleCodeCard - Lovable-style collapsed code display
 * 
 * Shows:
 * - Collapsed: "<> Edit #7 • Fix type errors in Auth.tsx" + "Click to view code >"
 * - Expanded: File list with code content
 * 
 * Matches Lovable UI exactly.
 */

interface CodeFile {
    name: string;
    content: string;
}

interface CollapsibleCodeCardProps {
    editNumber?: number;
    summary: string;
    files: CodeFile[];
    defaultCollapsed?: boolean;
    className?: string;
}

export function CollapsibleCodeCard({
    editNumber,
    summary,
    files,
    defaultCollapsed = true,
    className = ''
}: CollapsibleCodeCardProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    if (!files || files.length === 0) {
        return null;
    }

    return (
        <div className={`collapsible-code-card ${className}`}>
            {/* Collapsed Header - Always visible */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="collapsible-header"
            >
                <div className="header-left">
                    <Code className="code-icon" size={16} />
                    <span className="edit-label">
                        {editNumber ? `Edit #${editNumber} • ` : ''}{summary}
                    </span>
                </div>
                <div className="header-right">
                    <span className="click-hint">
                        {isCollapsed ? 'Click to view code' : 'Click to hide code'}
                    </span>
                    <ChevronRight
                        className={`chevron-icon ${!isCollapsed ? 'rotated' : ''}`}
                        size={16}
                    />
                </div>
            </button>

            {/* Expanded Content */}
            {!isCollapsed && (
                <div className="code-content">
                    {files.map((file, index) => (
                        <div key={index} className="file-block">
                            <div className="file-header">
                                <FileCode size={14} />
                                <span className="file-name">{file.name}</span>
                            </div>
                            <pre className="file-code">
                                <code>{file.content}</code>
                            </pre>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .collapsible-code-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                    margin: 12px 0;
                }

                .collapsible-header {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    transition: background 0.2s ease;
                    color: inherit;
                    text-align: left;
                }

                .collapsible-header:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .code-icon {
                    color: #8b5cf6;
                    flex-shrink: 0;
                }

                .edit-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #e2e8f0;
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .click-hint {
                    font-size: 12px;
                    color: #64748b;
                }

                .chevron-icon {
                    color: #64748b;
                    transition: transform 0.2s ease;
                }

                .chevron-icon.rotated {
                    transform: rotate(90deg);
                }

                .code-content {
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 12px 16px;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .file-block {
                    margin-bottom: 16px;
                }

                .file-block:last-child {
                    margin-bottom: 0;
                }

                .file-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-bottom: 8px;
                    color: #94a3b8;
                }

                .file-name {
                    font-size: 12px;
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                }

                .file-code {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                    padding: 12px;
                    overflow-x: auto;
                    font-size: 13px;
                    line-height: 1.5;
                    margin: 0;
                }

                .file-code code {
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    color: #e2e8f0;
                    white-space: pre;
                }
            `}</style>
        </div>
    );
}

export default CollapsibleCodeCard;
