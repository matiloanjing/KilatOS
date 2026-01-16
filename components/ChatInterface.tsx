/**
 * Chat Interface Component
 * Reusable chat UI for all agents
 * Copyright © 2025 KilatCode Studio
 */

'use client';

import { useState, useRef, useEffect } from 'react';

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    agentName: string;
    agentDescription: string;
    onSubmit: (message: string, params?: any) => Promise<any>;
    additionalInputs?: React.ReactNode;
    placeholder?: string;
}

export default function ChatInterface({
    agentName,
    agentDescription,
    onSubmit,
    additionalInputs,
    placeholder = 'Type your message...',
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await onSubmit(input);

            const assistantMessage: Message = {
                role: 'assistant',
                content: JSON.stringify(response, null, 2),
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full glass-dark rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 glass-strong border-b border-white/10">
                <h2 className="text-2xl font-bold gradient-text">{agentName}</h2>
                <p className="text-sm text-purple-300 mt-1">{agentDescription}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 text-center animate-fade-in">
                        <div className="text-6xl opacity-30 animate-float">💬</div>
                        <div>
                            <p className="text-gray-400 text-lg">No messages yet</p>
                            <p className="text-gray-500 text-sm mt-2">Start a conversation with this agent!</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-5 py-4 transition-all duration-300 hover:scale-[1.02] ${message.role === 'user'
                                        ? 'bg-gradient-premium text-white shadow-lg shadow-purple-500/30'
                                        : 'glass-strong text-gray-100 border border-white/10'
                                    }`}
                            >
                                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                    {message.content}
                                </pre>
                                <p className="text-xs opacity-60 mt-3 font-mono">
                                    {message.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start animate-slide-up">
                        <div className="glass-strong rounded-2xl px-6 py-4 border border-white/10">
                            <div className="flex items-center space-x-3">
                                <div className="flex space-x-2">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
                                    <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce delay-200"></div>
                                </div>
                                <span className="text-sm text-gray-400">Thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Additional Inputs */}
            {additionalInputs && (
                <div className="px-6 py-4 glass-dark border-t border-white/10">
                    {additionalInputs}
                </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-6 py-5 glass-strong border-t border-white/10">
                <div className="flex space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholder}
                        disabled={isLoading}
                        className="input-premium flex-1"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="btn-premium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="spinner-premium w-5 h-5"></div>
                                <span>Sending...</span>
                            </div>
                        ) : (
                            <span>Send 🚀</span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
