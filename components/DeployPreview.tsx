/**
 * Deploy Preview Component
 * 
 * Shows live preview iframe and deploy controls
 * 
 * Copyright © 2026 KilatOS
 */

'use client';

import { useState, useEffect } from 'react';

interface DeployPreviewProps {
    projectId: string;
    onClose?: () => void;
    onDownload?: () => void;
}

interface DeployStatus {
    projectId: string;
    status: 'pending' | 'building' | 'ready' | 'error' | 'deleted';
    previewUrl?: string;
    githubRepo?: string;
    error?: string;
}

export default function DeployPreview({ projectId, onClose, onDownload }: DeployPreviewProps) {
    const [status, setStatus] = useState<DeployStatus | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);
    const [copied, setCopied] = useState(false);

    // Poll for status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/kilat/deploy/status?projectId=${projectId}`);
                if (res.ok) {
                    const data = await res.json();
                    setStatus(data);

                    // Stop polling if ready or error
                    if (data.status === 'ready' || data.status === 'error') {
                        clearInterval(interval);
                    }
                }
            } catch (error) {
                console.error('Failed to check deploy status:', error);
            }
        };

        checkStatus();
        interval = setInterval(checkStatus, 3000);

        return () => clearInterval(interval);
    }, [projectId]);

    const copyUrl = () => {
        if (status?.previewUrl) {
            navigator.clipboard.writeText(status.previewUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = async () => {
        try {
            const res = await fetch(`/api/kilat/download?projectId=${projectId}`);
            if (res.ok) {
                const { url } = await res.json();
                window.open(url, '_blank');
                onDownload?.();
            }
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    return (
        <div className="mt-4 rounded-xl overflow-hidden bg-gray-900/80 border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-white/10">
                <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div className={`w-2 h-2 rounded-full ${status?.status === 'ready' ? 'bg-green-500' :
                            status?.status === 'error' ? 'bg-red-500' :
                                'bg-yellow-500 animate-pulse'
                        }`} />

                    <span className="text-sm text-gray-300">
                        {status?.status === 'ready' ? '🚀 Live Preview' :
                            status?.status === 'error' ? '❌ Deploy Failed' :
                                status?.status === 'building' ? '🔨 Building...' :
                                    '⏳ Deploying...'}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Copy URL */}
                    {status?.previewUrl && (
                        <button
                            onClick={copyUrl}
                            className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            {copied ? '✅ Copied!' : '📋 Copy URL'}
                        </button>
                    )}

                    {/* Download */}
                    {status?.status === 'ready' && (
                        <button
                            onClick={handleDownload}
                            className="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors"
                        >
                            📥 Download ZIP
                        </button>
                    )}

                    {/* Toggle expand */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        {isExpanded ? '🔽' : '🔼'}
                    </button>

                    {/* Close */}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-2 py-1 text-xs hover:bg-white/10 rounded-lg transition-colors text-gray-400"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Preview URL bar */}
            {status?.previewUrl && (
                <div className="px-4 py-2 bg-gray-800/50 border-b border-white/5">
                    <a
                        href={status.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        {status.previewUrl} ↗
                    </a>
                </div>
            )}

            {/* Preview iframe */}
            {isExpanded && (
                <div className="relative" style={{ paddingBottom: '56.25%' /* 16:9 ratio */ }}>
                    {status?.status === 'ready' && status?.previewUrl ? (
                        <iframe
                            src={status.previewUrl}
                            className="absolute inset-0 w-full h-full bg-white"
                            title="Preview"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        />
                    ) : status?.status === 'error' ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
                            <div className="text-center">
                                <p className="text-red-400 text-lg">❌ Deployment Failed</p>
                                <p className="text-gray-400 text-sm mt-2">{status?.error || 'Unknown error'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                            <div className="text-center">
                                <div className="flex gap-1 justify-center mb-3">
                                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" />
                                    <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                                <p className="text-gray-400">
                                    {status?.status === 'building' ? 'Building project...' : 'Starting deployment...'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* GitHub link */}
            {status?.githubRepo && (
                <div className="px-4 py-2 bg-gray-800/30 text-xs text-gray-500">
                    📦 <a
                        href={`https://github.com/${status.githubRepo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-300 transition-colors"
                    >
                        {status.githubRepo}
                    </a>
                </div>
            )}
        </div>
    );
}
