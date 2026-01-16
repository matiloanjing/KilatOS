/**
 * Multi-Tier API Router
 * 
 * Strategy:
 * - Free Users: ALWAYS use 'free' tier (Pollinations) -> Groq Fallback
 * - Paid Users: Smart routing based on task type (Claude, Gemini, Qwen, etc.)
 * 
 * Features:
 * - Smart Model Selection for Paid Users
 * - Strict Plan Enforcement
 * - Quota Tracking
 * 
 * Copyright © 2026 KilatOS
 */

import { TaskType } from './task-classifier';

export type TaskComplexity = 'light' | 'medium' | 'heavy';
export type APITier = 'pro' | 'free' | 'fallback';
export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface TierConfig {
    tier: APITier;
    endpoint: string;
    apiKey?: string;
    model: string;
    costPerRequest: number;
    maxRequestsPerDay?: number;
    enabled: boolean;
}

export interface QuotaUsage {
    pro: number;
    free: number;
    groq_fallback: number;
    fallback: number;
}

export class TierRouter {
    private tiers: Map<APITier, TierConfig> = new Map();
    private quotaUsed: QuotaUsage = { pro: 0, free: 0, groq_fallback: 0, fallback: 0 };
    private lastResetDate: string = new Date().toISOString().split('T')[0];

    // Fallback Configuration (Groq) - Not a selectable tier, but a safety net
    public readonly groqFallback = {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
        enabled: !!process.env.GROQ_API_KEY
    };

    constructor() {
        this.initializeTiers();
    }

    /**
     * Initialize tier configurations
     */
    private initializeTiers() {
        // Pro tier (Pollination Flower / Direct APIs)
        this.tiers.set('pro', {
            tier: 'pro',
            endpoint: 'https://gen.pollinations.ai/v1/chat/completions',
            apiKey: process.env.POLLINATION_API_KEY,
            model: 'claude', // Default, but overridden by smart routing
            costPerRequest: 0.001,
            enabled: !!process.env.POLLINATION_API_KEY
        });

        // Free tier (Same endpoint, different model - ALL use paid API now)
        this.tiers.set('free', {
            tier: 'free',
            endpoint: 'https://gen.pollinations.ai/v1/chat/completions',
            apiKey: process.env.POLLINATION_API_KEY, // Use same API key
            model: 'gemini',
            costPerRequest: 0.0005, // Cheaper models but still costs
            maxRequestsPerDay: 500,
            enabled: !!process.env.POLLINATION_API_KEY
        });

        // Ultimate Fallback (HuggingFace)
        this.tiers.set('fallback', {
            tier: 'fallback',
            endpoint: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
            apiKey: process.env.HUGGINGFACE_TOKEN,
            model: 'mistral-7b',
            costPerRequest: 0,
            enabled: !!process.env.HUGGINGFACE_TOKEN
        });
    }

    /**
     * Smart Model Selection based on BOTH task type AND user tier
     * CRITICAL: Must respect tier-based model access!
     * 
     * Model Access (from llm-model-strategy.md):
     * - FREE: qwen-coder, gemini-fast, openai-fast, mistral, openai
     * - PRO: + deepseek, claude-fast, perplexity-fast, perplexity-reasoning
     * - ENTERPRISE: + gemini-large, claude, claude-large, openai-large
     */
    selectModelForPaidUser(taskType: TaskType, userPlan: UserPlan = 'pro'): string {
        if (userPlan === 'enterprise') {
            // Enterprise: Access to ALL models
            switch (taskType) {
                case 'reasoning': return 'claude'; // Best reasoning
                case 'design': return 'gemini-large'; // Best multimodal
                case 'code': return 'qwen-coder'; // Code specialist
                case 'research': return 'perplexity-reasoning'; // Search + reasoning
                case 'chat': return 'openai-large'; // Premium chat
                default: return 'claude'; // Premium default
            }
        } else {
            // Pro: Only PRO-tier models (NO enterprise models!)
            switch (taskType) {
                case 'reasoning': return 'deepseek'; // Best PRO reasoning
                case 'design': return 'gemini-fast'; // PRO creative (NOT gemini-large!)
                case 'code': return 'qwen-coder'; // Code specialist
                case 'research': return 'perplexity-fast'; // PRO search
                case 'chat': return 'openai'; // PRO chat
                default: return 'deepseek'; // PRO default
            }
        }
    }

    /**
     * Select best tier based on task and user plan
     */
    selectTier(complexity: TaskComplexity, preferredTier?: APITier, userPlan: UserPlan = 'free'): APITier {
        // STRICT PLAN ENFORCEMENT for Free Users
        if (userPlan === 'free') {
            // Free users ALWAYS use free tier, regardless of complexity or preference
            return 'free';
        }

        // Paid Users Logic
        this.checkDailyReset();

        // 1. Honor preference if valid
        if (preferredTier && this.isTierAvailable(preferredTier)) {
            return preferredTier;
        }

        // 2. Select based on complexity
        if (complexity === 'heavy' || complexity === 'medium') {
            if (this.isTierAvailable('pro')) return 'pro';
        }

        // 3. Default to free if paid unavailable or task is light
        return 'free';
    }

    /**
     * Check if tier is available
     */
    private isTierAvailable(tier: APITier): boolean {
        const config = this.tiers.get(tier);
        if (!config || !config.enabled) return false;
        if (config.maxRequestsPerDay) {
            // Check quota specific to this tier
            const used = this.quotaUsed[tier as keyof QuotaUsage]; // Safe cast knowing keys match
            return used < config.maxRequestsPerDay;
        }
        return true;
    }

    getTierConfig(tier: APITier): TierConfig | undefined {
        return this.tiers.get(tier);
    }

    trackUsage(tier: APITier | 'groq_fallback'): void {
        this.quotaUsed[tier]++;
    }

    private checkDailyReset(): void {
        const today = new Date().toISOString().split('T')[0];
        if (today !== this.lastResetDate) {
            console.log('🔄 Daily quota reset');
            this.quotaUsed = { pro: 0, free: 0, groq_fallback: 0, fallback: 0 };
            this.lastResetDate = today;
        }
    }

    /**
     * Force reset quota (used by admin/debug)
     */
    public resetQuota(): void {
        this.quotaUsed = { pro: 0, free: 0, groq_fallback: 0, fallback: 0 };
    }

    /**
     * Get usage statistics
     */
    getUsageStats() {
        this.checkDailyReset();
        return {
            date: this.lastResetDate,
            usage: this.quotaUsed,
            tiers: Object.fromEntries(this.tiers)
        };
    }

    /**
     * Update tier configuration
     */
    updateTierConfig(tier: APITier, updates: Partial<TierConfig>): void {
        const existing = this.tiers.get(tier);
        if (existing) {
            this.tiers.set(tier, { ...existing, ...updates });
        }
    }
}

export const tierRouter = new TierRouter();
export default TierRouter;
