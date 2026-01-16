/**
 * Deploy Button Component
 * 
 * Button to trigger deployment of generated code
 * 
 * Copyright © 2026 KilatOS
 */

'use client';

import { useState } from 'react';

interface DeployButtonProps {
    files: Record<string, string>;
    projectName: string;
    onDeployStart?: (projectId: string) => void;
    onDeployComplete?: (projectId: string, previewUrl: string) => void;
    onError?: (error: string) => void;
}

export default function DeployButton({
    files,
    projectName,
    onDeployStart,
    onDeployComplete,
    onError
}: DeployButtonProps) {
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployState, setDeployState] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

    const handleDeploy = async () => {
        if (isDeploying || Object.keys(files).length === 0) return;

        setIsDeploying(true);
        setDeployState('deploying');

        try {
            // Start deployment
            const res = await fetch('/api/kilat/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName,
                    files,
                    autoDeleteHours: 24
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Deployment failed');
            }

            onDeployStart?.(data.projectId);

            // Poll for completion
            await pollForCompletion(data.projectId);

        } catch (error) {
            console.error('Deploy failed:', error);
            setDeployState('error');
            onError?.(error instanceof Error ? error.message : 'Deployment failed');
        } finally {
            setIsDeploying(false);
        }
    };

    const pollForCompletion = async (projectId: string) => {
        const maxAttempts = 60;  // 3 minutes max
        let attempts = 0;

        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 3000));

            try {
                const res = await fetch(`/api/kilat/deploy/status?projectId=${projectId}`);
                const status = await res.json();

                if (status.status === 'ready') {
                    setDeployState('success');
                    onDeployComplete?.(projectId, status.previewUrl);
                    return;
                }

                if (status.status === 'error') {
                    throw new Error(status.error || 'Deployment failed');
                }
            } catch (error) {
                // Continue polling on network errors
            }

            attempts++;
        }

        throw new Error('Deployment timeout');
    };

    return (
        <button
            onClick={handleDeploy}
            disabled={isDeploying || Object.keys(files).length === 0}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${deployState === 'success'
                    ? 'bg-green-500/20 text-green-400'
                    : deployState === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : isDeploying
                            ? 'bg-purple-500/30 text-purple-300 cursor-wait'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                }`}
        >
            {deployState === 'success' ? '✅ Deployed' :
                deployState === 'error' ? '❌ Failed' :
                    isDeploying ? (
                        <span className="flex items-center gap-2">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Deploying...
                        </span>
                    ) : '🚀 Deploy'}
        </button>
    );
}
