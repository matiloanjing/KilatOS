/**
 * @deprecated THIS FILE IS DEPRECATED. USE @/lib/models/model-service इंस्टead.
 * Model Configuration for Multi-Agent Multi-LLM System
 * Each agent uses the optimal Pollination AI model for its task
 * Copyright © 2025 KilatCode Studio
 */
console.warn('⚠️ DEPRECATED: lib/config/models.ts sourced. Migrate to lib/models/model-service.ts');

export type AgentType = 'solve' | 'question' | 'research' | 'guide' | 'ideagen' | 'cowriter' | 'codegen' | 'imagegen' | 'audit';

export type PollinationModel =
    | 'claude'              // Best for deep reasoning, writing quality
    | 'claude-fast'         // Fast reasoning
    | 'claude-large'        // Most powerful
    | 'openai'              // GPT-4 compatible, creative tasks
    | 'openai-fast'         // GPT-4o mini, fast responses
    | 'openai-large'        // GPT-4o, advanced reasoning
    | 'gemini-fast'         // Good balance, vision, search
    | 'gemini-search'       // With search capability
    | 'gemini-large'        // Advanced reasoning
    | 'mistral'             // Open source alternative
    | 'qwen-coder'          // Specialized for code
    | 'perplexity-fast'     // Fast with search
    | 'perplexity-reasoning' // Deep reasoning with search
    | 'deepseek'            // Efficient reasoning
    | 'grok'                // xAI Grok (Free tier)
    | 'kimi-k2-thinking';   // Long context thinking

export type PollinationImageModel =
    | 'flux'                // Flux Schnell - Free tier (0.0002 pollen/image)
    | 'turbo'               // SDXL Turbo - Fast (0.0003 pollen/image)
    | 'zimage'              // Z-Image Turbo - Fast (0.0002 pollen/image)
    | 'gptimage'            // GPT Image 1 Mini - Best quality (2.5 pollen/image)
    | 'gptimage-large'      // GPT Image 1.5 - Premium quality (8.0 pollen/image)
    | 'seedream'            // Seedream 4.0 - Good quality (0.03 pollen/image)
    | 'seedream-pro'        // Seedream 4.5 Pro - Professional (0.04 pollen/image)
    | 'kontext'             // FLUX.1 Kontext - Contextual (0.04 pollen/image)
    | 'nanobanana'          // NanoBanana - Style transfer (0.3 pollen/image)
    | 'nanobanana-pro';     // NanoBanana Pro - Pro style transfer (1.25 pollen/image)

/**
 * Agent-to-Model Mapping
 * CRITICAL: These are DEFAULT models - actual selection uses getTierModel!
 * Primary should be FREE-tier compatible, fallback for reliability
 */
export const AGENT_MODEL_CONFIG: Record<AgentType, {
    primary: PollinationModel;
    fallback?: PollinationModel;
    reasoning: string;
}> = {
    solve: {
        primary: 'qwen-coder',        // Code-specialized (fallback auto-handled in pollination-client)
        fallback: 'openai-fast',
        reasoning: 'Logical reasoning - uses code-optimized model with auto-fallback',
    },
    question: {
        primary: 'openai-fast',       // FREE-tier safe ($0.06/$0.44)
        fallback: 'gemini-fast',
        reasoning: 'Question generation with structured output',
    },
    research: {
        primary: 'gemini-fast',       // FREE-tier safe ($0.10/$0.40)
        fallback: 'mistral',
        reasoning: 'Search + research compilation',
    },
    guide: {
        primary: 'gemini-fast',       // FREE-tier safe
        fallback: 'openai-fast',
        reasoning: 'Interactive HTML generation',
    },
    ideagen: {
        primary: 'mistral',           // FREE-tier safe (was: claude)
        fallback: 'openai-fast',
        reasoning: 'Creative thinking - uses cheap open-source model',
    },
    cowriter: {
        primary: 'mistral',           // FREE-tier safe (was: claude-fast) 
        fallback: 'openai-fast',
        reasoning: 'Writing quality with open-source model',
    },
    codegen: {
        primary: 'qwen-coder',        // Code-specialized (fallback auto-handled in pollination-client)
        fallback: 'openai-fast',
        reasoning: 'Code generation with auto-fallback to openai/gemini if timeout',
    },
    imagegen: {
        primary: 'gemini-fast',       // FREE-tier safe
        fallback: 'openai-fast',
        reasoning: 'Prompt optimization for image generation',
    },
    audit: {
        primary: 'qwen-coder',        // Code-specialized (fallback auto-handled in pollination-client)
        fallback: 'mistral',
        reasoning: 'Code analysis with auto-fallback if needed',
    },
};

/**
 * Code execution planning model (fallback handled by pollination-client.ts)
 */
export const CODE_MODEL: PollinationModel = 'gemini-fast';

/**
 * Image model selection strategy (NEW - tier-based)
 * Maps quality requirements to appropriate image models
 */
export const IMAGE_MODEL_STRATEGY: Record<'draft' | 'standard' | 'high' | 'ultra', PollinationImageModel> = {
    draft: 'flux',          // Free tier - fastest iterations
    standard: 'seedream',   // Paid tier - good quality/cost balance
    high: 'seedream-pro',   // Paid tier - professional outputs
    ultra: 'gptimage',      // Enterprise - best quality + vision
};

/**
 * Image model capabilities and pricing
 */
export const IMAGE_MODEL_INFO: Record<PollinationImageModel, {
    cost: number;        // pollen per image
    speed: 'fastest' | 'very-fast' | 'medium' | 'slow';
    quality: 'decent' | 'good' | 'very-good' | 'excellent' | 'best';
    capabilities: string[];
}> = {
    'flux': {
        cost: 0.0002,
        speed: 'fastest',
        quality: 'good',
        capabilities: ['fast-generation', 'free-tier'],
    },
    'zimage': {
        cost: 0.0002,
        speed: 'fastest',
        quality: 'decent',
        capabilities: ['fast-generation'],
    },
    'turbo': {
        cost: 0.0003,
        speed: 'very-fast',
        quality: 'good',
        capabilities: ['fast-generation', 'iterations'],
    },
    'seedream': {
        cost: 0.03,
        speed: 'medium',
        quality: 'very-good',
        capabilities: ['balanced'],
    },
    'kontext': {
        cost: 0.04,
        speed: 'medium',
        quality: 'very-good',
        capabilities: ['contextual-understanding', 'complex-scenes'],
    },
    'seedream-pro': {
        cost: 0.04,
        speed: 'medium',
        quality: 'excellent',
        capabilities: ['professional-quality', 'detailed'],
    },
    'nanobanana': {
        cost: 0.3,
        speed: 'medium',
        quality: 'very-good',
        capabilities: ['style-transfer', 'artistic'],
    },
    'nanobanana-pro': {
        cost: 1.25,
        speed: 'medium',
        quality: 'excellent',
        capabilities: ['style-transfer', 'artistic', 'professional'],
    },
    'gptimage': {
        cost: 2.5,
        speed: 'slow',
        quality: 'best',
        capabilities: ['vision', 'highest-quality', 'complex-prompts'],
    },
    'gptimage-large': {
        cost: 8.0,
        speed: 'slow',
        quality: 'best',
        capabilities: ['vision', 'premium-quality', 'large-images'],
    },
};

/**
 * Model capabilities and pricing
 * Source: https://pollinations.ai/api/docs
 */
export const MODEL_INFO: Record<PollinationModel, {
    contextWindow: number;
    inputCost: number;  // pollen per million tokens
    outputCost: number; // pollen per million tokens
    capabilities: string[];
}> = {
    'claude-large': {
        contextWindow: 200_000,
        inputCost: 5.0,
        outputCost: 25.0,
        capabilities: ['reasoning', 'vision', 'long-context'],
    },
    'claude': {
        contextWindow: 330_000,
        inputCost: 3.0,
        outputCost: 15.0,
        capabilities: ['reasoning', 'vision', 'creative'],
    },
    'claude-fast': {
        contextWindow: 980_000,
        inputCost: 1.0,
        outputCost: 5.0,
        capabilities: ['reasoning', 'vision', 'fast'],
    },
    'openai-large': {
        contextWindow: 100_000,
        inputCost: 1.75,
        outputCost: 14.0,
        capabilities: ['reasoning', 'vision', 'audio'],
    },
    'openai': {
        contextWindow: 8000,
        inputCost: 0.15,
        outputCost: 0.6,
        capabilities: ['vision', 'creative'],
    },
    'openai-fast': {
        contextWindow: 11_000,
        inputCost: 0.06,
        outputCost: 0.44,
        capabilities: ['vision', 'fast'],
    },
    'gemini-large': {
        contextWindow: 120_000,
        inputCost: 2.0,
        outputCost: 12.0,
        capabilities: ['reasoning', 'vision', 'audio', 'search'],
    },
    'gemini-search': {
        contextWindow: 1600,
        inputCost: 0.5,
        outputCost: 3.0,
        capabilities: ['vision', 'search', 'tools'],
    },
    'gemini-fast': {
        contextWindow: 12_000,
        inputCost: 0.1,
        outputCost: 0.4,
        capabilities: ['vision', 'search', 'tools', 'embeddings'],
    },
    'perplexity-reasoning': {
        contextWindow: 290,
        inputCost: 1.0,
        outputCost: 5.0,
        capabilities: ['reasoning', 'search'],
    },
    'perplexity-fast': {
        contextWindow: 4100,
        inputCost: 1.0,
        outputCost: 1.0,
        capabilities: ['search', 'fast'],
    },
    'qwen-coder': {
        contextWindow: 4500,
        inputCost: 0.9,
        outputCost: 0.9,
        capabilities: ['code', 'reasoning'],
    },
    'deepseek': {
        contextWindow: 840,
        inputCost: 0.58,
        outputCost: 1.68,
        capabilities: ['reasoning', 'efficient'],
    },
    'kimi-k2-thinking': {
        contextWindow: 570,
        inputCost: 0.6,
        outputCost: 2.5,
        capabilities: ['reasoning', 'thinking'],
    },
    'mistral': {
        contextWindow: 13_000,
        inputCost: 0.15,
        outputCost: 0.35,
        capabilities: ['open-source', 'efficient'],
    },
    'grok': {
        contextWindow: 128_000,
        inputCost: 0.20,
        outputCost: 0.50,
        capabilities: ['reasoning', 'fast', 'xai'],
    },
};

/**
 * Get model for specific agent
 */
export function getModelForAgent(agentType: AgentType): PollinationModel {
    return AGENT_MODEL_CONFIG[agentType].primary;
}

/**
 * Get fallback model if primary fails
 * ALWAYS returns a model - never undefined for production safety
 */
export function getFallbackModel(agentType: AgentType): PollinationModel {
    // Use config fallback, or default to openai-fast as safe universal fallback
    return AGENT_MODEL_CONFIG[agentType].fallback ?? 'openai-fast';
}

/**
 * Get model info
 */
export function getModelInfo(model: PollinationModel) {
    return MODEL_INFO[model];
}

/**
 * Estimate cost for a text generation request
 */
export function estimateCost(
    model: PollinationModel,
    inputTokens: number,
    outputTokens: number
): number {
    const info = MODEL_INFO[model];
    const inputCost = (inputTokens / 1_000_000) * info.inputCost;
    const outputCost = (outputTokens / 1_000_000) * info.outputCost;
    return inputCost + outputCost;
}

/**
 * Get image model cost
 */
export function getImageModelCost(model: PollinationImageModel): number {
    return IMAGE_MODEL_INFO[model].cost;
}

/**
 * Select optimal image model based on quality and budget
 */
export function selectImageModel(
    qualityLevel: 'draft' | 'standard' | 'high' | 'ultra',
    budgetConstraint?: 'low' | 'medium' | 'unlimited'
): PollinationImageModel {
    // If budget is low, always use cheapest
    if (budgetConstraint === 'low') {
        return 'zimage';
    }

    // If unlimited budget, use best for quality level
    if (budgetConstraint === 'unlimited') {
        return IMAGE_MODEL_STRATEGY[qualityLevel];
    }

    // Default: use strategy mapping
    return IMAGE_MODEL_STRATEGY[qualityLevel];
}
