/**
 * ChatSidebar - Multi-Chat Session Manager
 * 
 * Displays list of user's chat sessions with:
 * - New Chat button
 * - Session list with titles
 * - Active session indicator
 * - Delete/rename options
 * - Tier-based session limit badge
 * 
 * Copyright © 2026 KilatCode Studio
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Session {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messageCount: number;
}

interface ChatSidebarProps {
    isOpen: boolean;
    activeSessionId: string | null;
    onSessionSelect: (sessionId: string) => void;
    onNewSession: () => void;
    onClose?: () => void;
    maxSessions?: number;
    className?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function ChatSidebar({
    isOpen,
    activeSessionId,
    onSessionSelect,
    onNewSession,
    onClose,
    maxSessions = 10,
    className = ''
}: ChatSidebarProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // ========================================================================
    // Load Sessions
    // ========================================================================

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/kilat/sessions');
            const data = await res.json();
            if (data.success) {
                setSessions(data.sessions || []);
            }
        } catch (error) {
            console.error('[ChatSidebar] Failed to load sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ========================================================================
    // Actions
    // ========================================================================

    const handleNewChat = async () => {
        if (sessions.length >= maxSessions) {
            alert(`Maximum ${maxSessions} sessions allowed. Delete old sessions first.`);
            return;
        }
        onNewSession();
        // Reload sessions after a short delay
        setTimeout(loadSessions, 500);
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm('Delete this chat? All messages will be lost.')) return;

        setDeletingId(sessionId);
        try {
            const res = await fetch(`/api/kilat/sessions?id=${sessionId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setSessions(prev => prev.filter(s => s.id !== sessionId));
                // If deleted active session, select first available
                if (sessionId === activeSessionId && sessions.length > 1) {
                    const remaining = sessions.filter(s => s.id !== sessionId);
                    if (remaining.length > 0) {
                        onSessionSelect(remaining[0].id);
                    }
                }
            }
        } catch (error) {
            console.error('[ChatSidebar] Delete failed:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const handleRename = async (sessionId: string) => {
        if (!editTitle.trim()) return;

        try {
            const res = await fetch(`/api/kilat/sessions?id=${sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editTitle.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setSessions(prev => prev.map(s =>
                    s.id === sessionId ? { ...s, title: editTitle.trim() } : s
                ));
            }
        } catch (error) {
            console.error('[ChatSidebar] Rename failed:', error);
        } finally {
            setEditingId(null);
            setEditTitle('');
        }
    };

    const startEditing = (session: Session) => {
        setEditingId(session.id);
        setEditTitle(session.title);
    };

    // ========================================================================
    // Render
    // ========================================================================

    if (!isOpen) return null;

    return (
        <div className={`
            w-64 h-full bg-gray-900 border-r border-white/10 flex flex-col
            ${className}
        `}>
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium text-white/80">Chat History</span>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* New Chat Button */}
            <div className="p-3">
                <button
                    onClick={handleNewChat}
                    disabled={sessions.length >= maxSessions}
                    className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded-lg
                        text-sm font-medium transition-all
                        ${sessions.length >= maxSessions
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500'
                        }
                    `}
                >
                    <Plus size={18} />
                    New Chat
                </button>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-white/50">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-8 text-white/40 text-sm">
                        No chats yet.<br />Click "New Chat" to start!
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div
                            key={session.id}
                            className={`
                                group relative mb-1 rounded-lg transition-all
                                ${session.id === activeSessionId
                                    ? 'bg-white/10 ring-1 ring-purple-500/50'
                                    : 'hover:bg-white/5'
                                }
                            `}
                        >
                            {editingId === session.id ? (
                                /* Edit Mode */
                                <div className="flex items-center gap-1 p-2">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename(session.id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        className="flex-1 px-2 py-1 bg-gray-800 text-white text-sm rounded border border-white/20 focus:border-purple-500 outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleRename(session.id)}
                                        className="p-1 text-green-500 hover:bg-green-500/20 rounded"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="p-1 text-red-500 hover:bg-red-500/20 rounded"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                /* Normal Mode - Use div instead of button to avoid nested button error */
                                <div
                                    onClick={() => onSessionSelect(session.id)}
                                    className="w-full flex items-start gap-2 p-2 text-left cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            onSessionSelect(session.id);
                                        }
                                    }}
                                >
                                    <MessageSquare
                                        size={16}
                                        className={`
                                            mt-0.5 flex-shrink-0
                                            ${session.id === activeSessionId ? 'text-purple-400' : 'text-white/40'}
                                        `}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className={`
                                            text-sm truncate
                                            ${session.id === activeSessionId ? 'text-white font-medium' : 'text-white/70'}
                                        `}>
                                            {session.title}
                                        </div>
                                        <div className="text-xs text-white/40">
                                            {session.messageCount} messages
                                        </div>
                                    </div>

                                    {/* Actions (visible on hover) */}
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditing(session);
                                            }}
                                            className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded"
                                            title="Rename"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(session.id);
                                            }}
                                            disabled={deletingId === session.id}
                                            className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded"
                                            title="Delete"
                                        >
                                            {deletingId === session.id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={12} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Session Limit Badge */}
            <div className="p-3 border-t border-white/10">
                <div className={`
                    text-xs text-center py-1 px-2 rounded-full
                    ${sessions.length >= maxSessions
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-white/5 text-white/40'
                    }
                `}>
                    {sessions.length}/{maxSessions} sessions
                </div>
            </div>
        </div>
    );
}
