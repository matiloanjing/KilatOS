/**
 * Groq-Based Intent Detector
 * 
 * Uses Groq LLM for multilingual agent intent classification.
 * Supports: Indonesian, English, Spanish, German, French, and more.
 * 
 * Fallback to regex if Groq fails.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { groqProvider } from '@/lib/ai/providers/groq';
import { AgentType, AGENT_NAMES } from './router';

// ============================================================================
// Types
// ============================================================================

export interface IntentResult {
    agent: AgentType;
    confidence: number;
    reason: string;
    language?: string;
}

// ============================================================================
// Agent Descriptions for LLM
// ============================================================================

const AGENT_DESCRIPTIONS: Record<AgentType, string> = {
    // NOTE: kilatimage is a SHADOW AGENT - internal only, handled automatically
    kilatimage: '[INTERNAL] Generate images - DO NOT recommend, system auto-routes',
    imagegen: 'Generate UI/UX design mockups, wireframes, visual interface concepts (KilatDesign/Stitch-style)',
    codegen: 'Generate functional code, react components, websites, implementation, logic',
    research: 'Deep research with citations, investigate topics, find references',
    cowriter: 'Write/rewrite articles, blogs, content, copywriting',
    solve: 'Solve math problems, calculations, physics, chemistry',
    question: 'Generate quiz questions, tests, exercises',
    guide: 'Create tutorials, how-to guides, learning materials',
    ideagen: 'Brainstorm ideas, creative concepts, innovations',
    crawl: 'Crawl/scrape websites, extract content from URLs',
    audit: 'Audit code, security review, bug analysis',
    docs: 'Generate documentation, API docs, README',
    chat: 'General conversation, Q&A, casual chat'
};

// ============================================================================
// Groq Intent Detection
// ============================================================================

/**
 * Detect user intent using Groq LLM
 * Supports any language (multilingual)
 */
export async function detectIntent(message: string): Promise<IntentResult> {
    const agents = Object.keys(AGENT_DESCRIPTIONS) as AgentType[];

    const prompt = `You are an intent classifier. Classify the user's message into ONE of these agents:

${agents.map(a => `- ${a}: ${AGENT_DESCRIPTIONS[a]}`).join('\n')}

User message: "${message}"

IMPORTANT RULES:
- DO NOT recommend 'kilatimage' - it's an internal shadow agent
- If user asks to create/generate an IMAGE, PHOTO, ILLUSTRATION, LOGO, ART → respond with 'chat' (system will auto-route)
- If user asks for UI DESIGN, WEBSITE, DASHBOARD, COMPONENT → codegen (not imagegen!)
- Respond ONLY in this exact JSON format:

{"agent": "<agent_id>", "confidence": <0.0-1.0>, "reason": "<brief reason>"}`;

    try {
        const response = await groqProvider.call({
            prompt,
            model: 'llama-3.1-8b-instant', // Fastest model for classification
            temperature: 0.1, // Low temp for consistent classification
            maxTokens: 100
        });

        // Parse JSON response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);

            // Validate agent type
            if (agents.includes(result.agent)) {
                return {
                    agent: result.agent as AgentType,
                    confidence: Math.min(1, Math.max(0, result.confidence || 0.8)),
                    reason: result.reason || 'Classified by AI'
                };
            }
        }

        // Fallback to chat if parsing fails
        return {
            agent: 'chat',
            confidence: 0.5,
            reason: 'Default fallback'
        };

    } catch (error) {
        console.warn('[IntentDetector] Groq failed, using fallback:', error);
        return fallbackDetect(message);
    }
}

// ============================================================================
// Regex Fallback (Original Logic)
// ============================================================================

const FALLBACK_PATTERNS: Record<AgentType, RegExp[]> = {
    // kilatimage: Shadow agent - no patterns, system auto-routes from page.tsx
    kilatimage: [], // Empty - handled internally via detectImageRequest()
    imagegen: [
        /stitch|ui design|mockup|wireframe/i,
        /desain tampilan|visual u[ix]/i,
    ],
    codegen: [
        /implement|kode|code|buat|create/i,
        /react|vue|next|typescript|javascript/i,
        /website|web|app|aplikasi|system/i,
        /desain|design|ui|ux|mockup|layout|interface/i,
        /dashboard|component|komponen/i,
    ],
    research: [
        /riset|research|cari tahu|investigate/i,
        /referensi|reference|source|sumber/i,
    ],
    cowriter: [
        /tulis|write|rewrite|artikel|article|blog/i,
        /content|konten|copywriting/i,
    ],
    solve: [
        /hitung|calculate|math|rumus|matematika/i,
        /soal|problem|solve|fisika|physics|kimia|chemistry/i,
    ],
    question: [
        /quiz|soal|pertanyaan|question|test|ujian|exam/i,
    ],
    guide: [
        /tutorial|guide|langkah|step|panduan/i,
        /cara|how to|belajar|learn/i,
    ],
    ideagen: [
        /ide|idea|brainstorm|fitur|feature|concept/i,
        /kreativ|creative|inovasi|innovation/i,
    ],
    crawl: [
        /scrape|crawl|ekstrak|extract/i,
        /seperti.*\.com|like.*\.com/i,
    ],
    audit: [
        /audit|review code|security|keamanan/i,
        /bug|error|issue|masalah/i,
    ],
    docs: [
        /dokumentasi|documentation|readme|jsdoc/i,
    ],
    chat: [
        /chat|tanya|ask|ngobrol/i,
    ],
};

// Design exclusions - if these appear, prefer codegen over imagegen
const DESIGN_CODE_KEYWORDS = /website|web|html|css|ui|ux|component|komponen|layout|page|halaman|dashboard|aplikasi|app|frontend|interface|react|tailwind/i;

function fallbackDetect(message: string): IntentResult {
    const lowerMessage = message.toLowerCase();

    // Special handling: check if "gambar/image" appears but with design context
    const hasImageKeyword = /gambar|image|foto|photo|ilustrasi|illustration|logo|banner/i.test(message);
    const hasDesignContext = DESIGN_CODE_KEYWORDS.test(message);

    if (hasImageKeyword && hasDesignContext) {
        // User wants UI design, not actual image
        return {
            agent: 'codegen',
            confidence: 0.85,
            reason: 'Design context detected, routing to code generation'
        };
    }

    // Check each agent's patterns
    for (const [agent, patterns] of Object.entries(FALLBACK_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(message)) {
                return {
                    agent: agent as AgentType,
                    confidence: 0.75,
                    reason: `Pattern matched: ${pattern.source.substring(0, 30)}...`
                };
            }
        }
    }

    // Default to chat
    return {
        agent: 'chat',
        confidence: 0.5,
        reason: 'No specific pattern matched'
    };
}

// ============================================================================
// Hybrid Detection (Groq + Fallback)
// ============================================================================

/**
 * Hybrid intent detection: tries Groq first, falls back to regex
 * Use this for production to ensure reliability
 */
export async function detectIntentHybrid(message: string): Promise<IntentResult> {
    try {
        const groqResult = await detectIntent(message);

        // If Groq is confident, use it
        if (groqResult.confidence >= 0.7) {
            return groqResult;
        }

        // Otherwise, double-check with regex
        const fallbackResult = fallbackDetect(message);

        // If they agree, boost confidence
        if (groqResult.agent === fallbackResult.agent) {
            return {
                ...groqResult,
                confidence: Math.min(1, groqResult.confidence + 0.1)
            };
        }

        // Use whichever has higher confidence
        return groqResult.confidence > fallbackResult.confidence ? groqResult : fallbackResult;

    } catch (error) {
        console.warn('[IntentDetector] Hybrid detection falling back to regex');
        return fallbackDetect(message);
    }
}

// ============================================================================
// Export
// ============================================================================

export { fallbackDetect };
export default detectIntent;
