/**
 * Prompt Optimizer for Image Generation
 * Enhances prompts for better image quality
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletion } from '@/lib/ai/pollination-client';

export interface PromptOptimizationOptions {
    mode?: 'text2image' | 'image2image' | 'style-transfer' | 'ui-mockup' | 'variations';
    style?: 'realistic' | 'artistic' | 'anime' | 'minimalist' | 'abstract';
    addDetails?: boolean;
    emphasizeQuality?: boolean;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    textModel?: string; // User's selected text model for prompt optimization
}

/**
 * Optimize image generation prompt
 */
export async function optimizePrompt(
    userPrompt: string,
    options: PromptOptimizationOptions = {}
): Promise<string> {
    const {
        mode = 'text2image',
        style,
        addDetails = true,
        emphasizeQuality = true,
        conversationHistory = [],
        textModel = 'openai-fast' // Default fallback, but caller should pass user's selection
    } = options;

    // CONTEXT INJECTION: Extract previous image styles from conversation
    let contextualStyleNote = '';
    if (conversationHistory.length > 0) {
        // Look for previous image generation prompts
        const previousPrompts = conversationHistory
            .filter(msg => msg.content.toLowerCase().includes('optimized:') || msg.content.toLowerCase().includes('image'))
            .map(msg => msg.content)
            .join(' ');

        // Detect style keywords from history
        const styleKeywords = ['anime', 'realistic', 'artistic', 'minimalist', 'abstract', 'cartoon', '3d', 'photorealistic'];
        const detectedStyles = styleKeywords.filter(keyword => previousPrompts.toLowerCase().includes(keyword));

        if (detectedStyles.length > 0) {
            contextualStyleNote = `\n- IMPORTANT: Maintain consistent ${detectedStyles[0]} style from previous context`;
        }
    }

    const systemPrompt = `You are an expert prompt engineer for AI image generation.

Your task: Transform user prompts into optimal prompts for image generation models.

Guidelines:
- Be specific and descriptive
- Include visual details (lighting, composition, colors, style)
- Add quality modifiers if needed
- Keep it concise but detailed (max 200 words)
- Use comma-separated keywords
${style ? `- Emphasize ${style} style` : ''}
${emphasizeQuality ? '- Add quality terms: "high quality", "detailed", "professional"' : ''}
${contextualStyleNote}

Mode: ${mode}
${mode === 'ui-mockup' ? 'Focus on: UI/UX terminology, modern design, clarity' : ''}
${mode === 'style-transfer' ? 'Focus on: Artistic style, techniques, medium' : ''}

Return ONLY the optimized prompt, no explanations.`;

    const userMessage = `Optimize this image prompt for ${mode}:

"${userPrompt}"

${style ? `Desired style: ${style}` : ''}`;

    const optimized = await chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        { model: textModel, temperature: 0.7 } // Use user's selected model
    );

    return optimized.trim();
}

/**
 * Enhance prompt for specific style
 */
export function enhanceForStyle(prompt: string, style: string): string {
    const styleModifiers: Record<string, string> = {
        realistic: 'photorealistic, highly detailed, 8k resolution, professional photography',
        artistic: 'artistic interpretation, expressive brushstrokes, vibrant colors, masterpiece',
        anime: 'anime style, manga art, clean lines, cel-shaded, vibrant colors',
        minimalist: 'minimalist design, clean, simple, elegant, uncluttered composition',
        abstract: 'abstract art, conceptual, non-representational, creative interpretation'
    };

    const modifier = styleModifiers[style] || '';
    return modifier ? `${prompt}, ${modifier}` : prompt;
}

/**
 * Add quality modifiers to prompt
 */
export function addQualityModifiers(prompt: string, quality: 'draft' | 'standard' | 'high' | 'ultra'): string {
    const qualityModifiers: Record<string, string> = {
        draft: '',
        standard: 'good quality, detailed',
        high: 'high quality, highly detailed, professional',
        ultra: 'ultra high quality, masterpiece, extremely detailed, award-winning, 8k'
    };

    const modifier = qualityModifiers[quality];
    return modifier ? `${prompt}, ${modifier}` : prompt;
}

/**
 * Optimize for UI mockup generation
 */
export function optimizeForUIMockup(description: string, theme: 'light' | 'dark'): string {
    const baseTerms = 'modern UI design, clean interface, professional mockup, high fidelity';
    const themeTerms = theme === 'dark'
        ? 'dark mode, dark background, contrast colors'
        : 'light mode, bright, clean white background';

    return `${description}, ${baseTerms}, ${themeTerms}, UI/UX design, Figma style mockup`;
}

/**
 * Extract key visual elements from prompt
 */
export function extractVisualElements(prompt: string): {
    subjects: string[];
    colors: string[];
    mood: string[];
    composition: string[];
} {
    // Simple keyword extraction (could be enhanced with NLP)
    const words = prompt.toLowerCase().split(/\s+/);

    const colorKeywords = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray', 'vibrant', 'pastel', 'warm', 'cool'];
    const moodKeywords = ['happy', 'sad', 'dramatic', 'peaceful', 'energetic', 'calm', 'mysterious', 'bright', 'dark', 'moody'];
    const compositionKeywords = ['centered', 'symmetrical', 'asymmetrical', 'rule of thirds', 'close-up', 'wide angle', 'portrait', 'landscape'];

    return {
        subjects: words.filter(w => !colorKeywords.includes(w) && !moodKeywords.includes(w) && !compositionKeywords.includes(w)),
        colors: words.filter(w => colorKeywords.includes(w)),
        mood: words.filter(w => moodKeywords.includes(w)),
        composition: words.filter(w => compositionKeywords.includes(w))
    };
}
