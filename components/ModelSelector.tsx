'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import type { UserTier } from '@/lib/auth/user-tier';

/**
 * ModelSelector - Database-Driven Model Dropdown
 * 
 * NOW DYNAMIC: Fetches models from /api/models endpoint
 * Models are filtered by user tier from database
 */

interface ModelFromAPI {
    model_id: string;
    display_name: string;
    provider: string;
    tier_required: UserTier;
}

interface ModelSelectorProps {
    currentModel: string;
    userTier: UserTier;
    onModelChange: (model: string) => void;
    className?: string;
}

export function ModelSelector({
    currentModel,
    userTier,
    onModelChange,
    className = ''
}: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [models, setModels] = useState<ModelFromAPI[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch models from API on mount
    const fetchModels = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/models?type=text');
            const data = await res.json();
            if (data.success && data.models) {
                setModels(data.models);
            }
        } catch (error) {
            console.error('[ModelSelector] Failed to fetch models:', error);
            // Fallback to default model list if API fails
            setModels([
                { model_id: 'gemini-fast', display_name: 'Gemini Flash', provider: 'pollinations', tier_required: 'free' }
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels, userTier]);

    const getDisplayName = (modelId: string): string => {
        const model = models.find(m => m.model_id === modelId);
        return model?.display_name || modelId;
    };

    const getTierBadge = (model: ModelFromAPI): string | null => {
        if (model.tier_required === 'enterprise') return 'PRO';
        if (model.tier_required === 'pro') return 'PRO';
        return null;
    };

    return (
        <div className={`model-selector ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="selector-trigger"
            >
                {loading ? (
                    <Loader2 size={14} className="model-icon animate-spin" />
                ) : (
                    <Sparkles size={14} className="model-icon" />
                )}
                <span className="model-name">{getDisplayName(currentModel)}</span>
                <ChevronDown
                    size={14}
                    className={`chevron ${isOpen ? 'rotated' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="dropdown-menu">
                        <div className="dropdown-header">Select Model</div>

                        {/* Group models by tier - using DB values (free/pro/enterprise) */}
                        {(['free', 'pro', 'enterprise'] as Array<string>).map(tierGroup => {
                            const tierModels = models.filter(m => m.tier_required === tierGroup);
                            if (tierModels.length === 0) return null;

                            const tierLabel = tierGroup === 'free' ? '🆓 Free Models' :
                                tierGroup === 'pro' ? '⭐ Pro Models' :
                                    '💎 Enterprise Models';

                            return (
                                <div key={tierGroup} className="tier-group">
                                    <div className="tier-group-header">{tierLabel}</div>
                                    {tierModels.map(model => (
                                        <button
                                            key={model.model_id}
                                            className={`dropdown-item ${model.model_id === currentModel ? 'active' : ''}`}
                                            onClick={() => {
                                                onModelChange(model.model_id);
                                                setIsOpen(false);
                                            }}
                                        >
                                            <span className="item-name">{model.display_name}</span>
                                            {model.tier_required !== 'free' && (
                                                <span className={`tier-badge ${model.tier_required}`}>
                                                    {(model.tier_required as string) === 'pro' ? 'PRO' : 'ENT'}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}



            <style jsx>{`
                .model-selector {
                    position: relative;
                }

                .selector-trigger {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: #e2e8f0;
                    font-size: 13px;
                }

                .selector-trigger:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .model-icon {
                    color: #8b5cf6;
                }

                .model-name {
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .chevron {
                    color: #64748b;
                    transition: transform 0.2s ease;
                }

                .chevron.rotated {
                    transform: rotate(180deg);
                }

                .dropdown-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 40;
                }

                .dropdown-menu {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    right: 0;
                    min-width: 220px;
                    background: #1e293b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    z-index: 50;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .dropdown-header {
                    padding: 10px 12px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .dropdown-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #e2e8f0;
                    font-size: 13px;
                    text-align: left;
                    transition: background 0.2s ease;
                }

                .dropdown-item:hover {
                    background: rgba(139, 92, 246, 0.1);
                }

                .dropdown-item.active {
                    background: rgba(139, 92, 246, 0.2);
                }

                .tier-badge {
                    font-size: 9px;
                    padding: 2px 5px;
                    border-radius: 4px;
                    font-weight: 600;
                }

                .tier-badge.paid,
                .tier-badge.pro {
                    background: rgba(139, 92, 246, 0.2);
                    color: #a78bfa;
                }

                .tier-badge.enterprise {
                    background: rgba(234, 179, 8, 0.2);
                    color: #fbbf24;
                }
                
                .tier-group {
                    margin-bottom: 8px;
                }
                
                .tier-group-header {
                    padding: 6px 12px;
                    font-size: 10px;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    background: rgba(255, 255, 255, 0.03);
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                }
                
                .tier-group:first-child .tier-group-header {
                    border-top: none;
                }
            `}</style>

        </div>
    );
}

export default ModelSelector;
