'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';

interface Session {
    id: string;
    title: string;
    updated_at: string;
    messageCount?: number;
    agent_type?: string;
}

interface SessionListProps {
    currentSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewChat: () => void;
}

export default function SessionList({
    currentSessionId,
    onSelectSession,
    onNewChat,
    agentType
}: SessionListProps & { agentType?: string }) {
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'agent'>('all');

    const fetchSessions = async () => {
        setLoading(true);
        try {
            // Apply backend filter if in 'agent' mode
            const queryParams = new URLSearchParams();
            if (filterMode === 'agent' && agentType) {
                queryParams.append('agent_type', agentType);
            }

            const res = await fetch(`/api/kilat/sessions?${queryParams.toString()}`);
            const data = await res.json();
            if (data.success) {
                setSessions(data.sessions);
            }
        } catch (err) {
            console.error('Failed to fetch sessions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchSessions();
    }, [user, filterMode, agentType]); // Refetch when filter/agent changes

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Delete this chat?')) return;

        try {
            const res = await fetch(`/api/kilat/sessions?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSessions(prev => prev.filter(s => s.id !== id));
                if (currentSessionId === id) onNewChat();
            }
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleRename = async (id: string, newTitle: string) => {
        if (!newTitle.trim()) return;

        try {
            const res = await fetch(`/api/kilat/sessions?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle.trim() })
            });
            if (res.ok) {
                setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
            }
        } catch (err) {
            console.error('Rename failed:', err);
        }
        setEditingId(null);
    };

    const startRename = (e: React.MouseEvent, session: Session) => {
        e.stopPropagation();
        setEditingId(session.id);
        setEditTitle(session.title || '');
    };

    const filteredSessions = sessions.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (days === 1) return 'Yesterday';
        if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Helper to get agent icon/color
    const getAgentBadge = (type?: string) => {
        if (!type || type === agentType) return null; // Don't badge current agent type
        // Simple badges for other agents
        const map: Record<string, string> = {
            'codegen': '💻',
            'imagegen': '🎨',
            'research': '🔍',
            'solve': '🧮',
            'write': '✍️',
            'chat': '💬'
        };
        return <span className="text-[10px] ml-1 opacity-70">{map[type] || '🤖'}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-charcoal border-r border-border-premium w-full text-white">
            {/* Header */}
            <div className="p-4 border-b border-border-premium flex items-center justify-between">
                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-400">History</h2>
                <div className="flex gap-1">
                    {agentType && (
                        <button
                            onClick={() => setFilterMode(prev => prev === 'all' ? 'agent' : 'all')}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${filterMode === 'agent'
                                ? 'bg-primary/20 text-primary ring-1 ring-primary/50'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                                }`}
                            title={filterMode === 'all' ? "Show only this agent's chats" : "Show all chats"}
                        >
                            {filterMode === 'all' ? 'All' : 'Filter'}
                        </button>
                    )}
                    <button
                        onClick={onNewChat}
                        className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        title="New Chat"
                    >
                        <span className="material-icons-round text-sm">add</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="p-3">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-round text-slate-500 text-sm">search</span>
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#1a1a20] border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-primary/40 transition-all placeholder:text-slate-600"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-4">
                        <span className="material-icons-round animate-spin text-slate-600">sync</span>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-8 px-4 text-slate-500 text-xs">
                        {searchTerm
                            ? 'No chats found'
                            : filterMode === 'agent'
                                ? 'No chats for this agent'
                                : 'No history yet'}
                    </div>
                ) : (
                    filteredSessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            className={`w-full text-left p-3 rounded-xl transition-all group flex flex-col gap-1 border cursor-pointer ${currentSessionId === session.id
                                ? 'bg-primary/10 border-primary/20 shadow-glow-sm'
                                : 'hover:bg-white/5 border-transparent hover:border-white/5'
                                }`}
                        >
                            <div className="flex items-center justify-between w-full">
                                {editingId === session.id ? (
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename(session.id, editTitle);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                        onBlur={() => handleRename(session.id, editTitle)}
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                        className="flex-1 bg-transparent border-b border-primary text-sm text-white focus:outline-none"
                                    />
                                ) : (
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        <span className={`text-sm font-medium truncate ${currentSessionId === session.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                            {session.title || 'Untitled Chat'}
                                        </span>
                                        {/* Show badge for different agents in 'All' view */}
                                        {filterMode === 'all' && getAgentBadge(session.agent_type)}
                                        {/* Current agent indicator */}
                                        {agentType && session.agent_type === agentType && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" title="Created by this agent" />
                                        )}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                                    <button
                                        onClick={(e) => startRename(e, session)}
                                        className="p-1 hover:bg-white/10 rounded"
                                        title="Rename"
                                    >
                                        <span className="material-icons-round text-xs text-slate-400 hover:text-white">edit</span>
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, session.id)}
                                        className="p-1 hover:bg-red-500/20 rounded"
                                        title="Delete"
                                    >
                                        <span className="material-icons-round text-xs text-slate-400 hover:text-red-400">delete</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span>{formatDate(session.updated_at)}</span>
                                <div className="flex items-center gap-1">
                                    {session.agent_type && session.agent_type !== 'chat' && filterMode === 'all' && (
                                        <span className="uppercase text-[9px] opacity-60 border border-white/10 px-1 rounded">
                                            {session.agent_type}
                                        </span>
                                    )}
                                    {session.messageCount !== undefined && session.messageCount > 0 && (
                                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-xs">
                                            {session.messageCount} msg
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

