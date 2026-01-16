'use client';

import React, { useState } from 'react';
import { ImageIcon, ChevronDown, Sparkles } from 'lucide-react';
import type { UserTier } from '@/lib/auth/user-tier';

/**
 * ImageGenerateButton - Tier-filtered image model selector + generate button
 * 
 * Image Models by Tier:
 * - FREE: flux, zimage, turbo
 * - PAID: + kontext, seedream, seedream-pro, nanobanana
 * - ENTERPRISE: + gptimage, gptimage-large
 */

// Image model pricing and tiers
type ImageModel = 'flux' | 'zimage' | 'turbo' | 'kontext' | 'seedream' | 'seedream-pro' | 'nanobanana' | 'gptimage' | 'gptimage-large';

const IMAGE_MODEL_INFO: Record<ImageModel, { name: string; tier: UserTier; cost: string }> = {
    'flux': { name: 'Flux Schnell', tier: 'free', cost: '$0.0002/img' },
    'zimage': { name: 'Z-Image Turbo', tier: 'free', cost: '$0.0002/img' },
    'turbo': { name: 'SDXL Turbo', tier: 'free', cost: '$0.0003/img' },
    'kontext': { name: 'FLUX.1 Kontext', tier: 'pro', cost: '$0.04/img' },
    'seedream': { name: 'Seedream 4.0', tier: 'pro', cost: '$0.03/img' },
    'seedream-pro': { name: 'Seedream 4.5 Pro', tier: 'pro', cost: '$0.04/img' },
    'nanobanana': { name: 'NanoBanana', tier: 'pro', cost: '$0.30/M' },
    'gptimage': { name: 'GPT Image 1 Mini', tier: 'enterprise', cost: '$2.0/M' },
    'gptimage-large': { name: 'GPT Image 1.5', tier: 'enterprise', cost: '$8.0/M' },
};

function canAccessImageModel(userTier: UserTier, modelTier: UserTier): boolean {
    const tierLevel = { free: 0, pro: 1, enterprise: 2 };
    return tierLevel[userTier] >= tierLevel[modelTier];
}

interface ImageGenerateButtonProps {
    userTier: UserTier;
    onGenerate: (prompt: string, model: ImageModel) => void;
    className?: string;
}

export function ImageGenerateButton({
    userTier,
    onGenerate,
    className = ''
}: ImageGenerateButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ImageModel>('flux');
    const [showPromptInput, setShowPromptInput] = useState(false);
    const [prompt, setPrompt] = useState('');

    // Get accessible models based on tier
    const accessibleModels = (Object.keys(IMAGE_MODEL_INFO) as ImageModel[])
        .filter(model => canAccessImageModel(userTier, IMAGE_MODEL_INFO[model].tier));

    const handleGenerate = () => {
        if (prompt.trim()) {
            onGenerate(prompt, selectedModel);
            setPrompt('');
            setShowPromptInput(false);
        }
    };

    const getTierBadge = (tier: UserTier): string | null => {
        if (tier === 'enterprise') return 'PRO';
        if (tier === 'pro') return 'PRO';
        return null;
    };

    return (
        <div className={`image-generate-button ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="generate-trigger"
                title="Generate Image"
            >
                <ImageIcon size={18} />
            </button>

            {isOpen && (
                <>
                    <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="dropdown-menu">
                        <div className="dropdown-header">
                            <ImageIcon size={14} />
                            <span>Generate Image</span>
                        </div>

                        {/* Prompt input */}
                        <div className="prompt-section">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the image you want..."
                                className="prompt-input"
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            />
                        </div>

                        {/* Model selector */}
                        <div className="model-section">
                            <div className="section-label">Model</div>
                            {accessibleModels.map(model => {
                                const info = IMAGE_MODEL_INFO[model];
                                const badge = getTierBadge(info.tier);

                                return (
                                    <button
                                        key={model}
                                        className={`model-option ${model === selectedModel ? 'active' : ''}`}
                                        onClick={() => setSelectedModel(model)}
                                    >
                                        <div className="model-info">
                                            <span className="model-name">{info.name}</span>
                                            <span className="model-cost">{info.cost}</span>
                                        </div>
                                        {badge && (
                                            <span className={`tier-badge ${badge.toLowerCase()}`}>
                                                {badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Generate button */}
                        <div className="action-section">
                            <button
                                className="generate-btn"
                                onClick={handleGenerate}
                                disabled={!prompt.trim()}
                            >
                                <Sparkles size={14} />
                                <span>Generate</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style jsx>{`
                .image-generate-button {
                    position: relative;
                }

                .generate-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    cursor: pointer;
                    color: #94a3b8;
                    transition: all 0.2s ease;
                }

                .generate-trigger:hover {
                    background: rgba(139, 92, 246, 0.1);
                    color: #a78bfa;
                    border-color: rgba(139, 92, 246, 0.3);
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
                    min-width: 280px;
                    background: #1e293b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    z-index: 50;
                    overflow: hidden;
                }

                .dropdown-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #e2e8f0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .prompt-section {
                    padding: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .prompt-input {
                    width: 100%;
                    padding: 10px 12px;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    color: #e2e8f0;
                    font-size: 13px;
                    outline: none;
                    transition: border-color 0.2s ease;
                }

                .prompt-input:focus {
                    border-color: rgba(139, 92, 246, 0.5);
                }

                .prompt-input::placeholder {
                    color: #64748b;
                }

                .model-section {
                    padding: 8px 0;
                    max-height: 200px;
                    overflow-y: auto;
                }

                .section-label {
                    padding: 6px 12px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .model-option {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    text-align: left;
                    transition: background 0.2s ease;
                }

                .model-option:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .model-option.active {
                    background: rgba(139, 92, 246, 0.15);
                }

                .model-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .model-name {
                    font-size: 13px;
                    color: #e2e8f0;
                }

                .model-cost {
                    font-size: 11px;
                    color: #64748b;
                }

                .tier-badge {
                    font-size: 9px;
                    padding: 2px 5px;
                    border-radius: 4px;
                    font-weight: 600;
                }

                .tier-badge.paid {
                    background: rgba(59, 130, 246, 0.2);
                    color: #60a5fa;
                }

                .tier-badge.pro {
                    background: rgba(139, 92, 246, 0.2);
                    color: #a78bfa;
                }

                .action-section {
                    padding: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .generate-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 10px;
                    background: linear-gradient(135deg, #8b5cf6, #6366f1);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .generate-btn:hover {
                    opacity: 0.9;
                }

                .generate-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

export default ImageGenerateButton;
