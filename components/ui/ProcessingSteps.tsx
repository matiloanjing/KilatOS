'use client';
/**
 * ProcessingSteps - Claude Code-style progress display
 * 
 * Shows real-time progress with:
 * - Animated step indicators
 * - Dynamic step messages from backend
 * - Progress percentage
 * - Elapsed time counter
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProcessingStepsProps {
    isProcessing: boolean;
    currentStep: string;
    progress: number;
    stepHistory: string[];
}

export function ProcessingSteps({
    isProcessing,
    currentStep,
    progress,
    stepHistory
}: ProcessingStepsProps) {
    const [elapsedTime, setElapsedTime] = useState(0);

    // Elapsed time counter
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            setElapsedTime(0);
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isProcessing]);

    // Format elapsed time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    if (!isProcessing) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 shadow-2xl"
        >
            {/* Header with progress bar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-400">{progress}%</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Processing</h3>
                        <p className="text-xs text-slate-400">{formatTime(elapsedTime)}</p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="flex-1 mx-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-purple-600 to-violet-500 rounded-full"
                    />
                </div>
            </div>

            {/* Current Step - Highlighted */}
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 mb-3"
            >
                <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-purple-500"
                />
                <span className="text-sm text-purple-200 font-medium">{currentStep}</span>
            </motion.div>

            {/* Step History - Last 5 steps */}
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                <AnimatePresence mode="popLayout">
                    {stepHistory.slice(-5).reverse().map((step, index) => (
                        <motion.div
                            key={`${step}-${index}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 0.6 - (index * 0.1), height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 pl-3"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                            <span className="text-xs text-slate-400 truncate">{step}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Helpful tips */}
            <div className="mt-4 pt-3 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 text-center">
                    💡 Planning mode uses multiple AI agents for best results
                </p>
            </div>
        </motion.div>
    );
}

export default ProcessingSteps;
