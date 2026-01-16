/**
 * Agent Recommender - Suggest agents based on context
 * 
 * Analyzes current task and recommends relevant agents to call.
 * Now with Groq-based multilingual intent detection!
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { AgentType, AGENT_NAMES } from './router';
import { detectIntentHybrid, IntentResult } from './intent-detector';

export interface AgentSuggestion {
    agent: AgentType;
    name: string;
    reason: string;
    confidence: number;
    priority: number;
    estimated_tokens: number;
    auto_allowed: boolean;
}

export interface RecommendationContext {
    currentAgent: AgentType;
    userMessage: string;
    projectContext?: any;
    previousAgents?: AgentType[];
}

// Trigger patterns for each agent
const TRIGGER_PATTERNS: Record<AgentType, { patterns: RegExp[]; confidence: number }[]> = {
    research: [
        { patterns: [/riset|research|cari tahu|investigate/i], confidence: 0.9 },
        { patterns: [/referensi|reference|source|sumber/i], confidence: 0.85 },
        { patterns: [/literature|paper|academic|jurnal/i], confidence: 0.9 },
    ],
    crawl: [
        { patterns: [/seperti\s+\w+|like\s+\w+\.com/i], confidence: 0.9 },
        { patterns: [/scrape|crawl|ekstrak dari/i], confidence: 0.95 },
        { patterns: [/inspirasi dari|inspiration from/i], confidence: 0.85 },
        { patterns: [/tokopedia|shopee|bukalapak|gojek|grab/i], confidence: 0.9 },
    ],

    // Note: kilatimage is a SHADOW AGENT - internal only, never recommended to users
    // Image generation is handled internally when image keywords detected in any chat
    kilatimage: [], // Empty - shadow agent, not recommended
    imagegen: [
        // KilatDesign: UI/UX MOCKUPS (Stitch Style)
        { patterns: [/stitch|ui design|mockup|wireframe/i], confidence: 0.95 },
        { patterns: [/desain tampilan|visual u[ix]/i], confidence: 0.9 },
        { patterns: [/landing page design|app design/i], confidence: 0.85 },
    ],
    codegen: [
        // CODE GENERATION including UI/UX design
        { patterns: [/implement|kode|code|buat|create/i], confidence: 0.85 },
        { patterns: [/react|vue|next|typescript/i], confidence: 0.9 },
        { patterns: [/aplikasi|app|website|system/i], confidence: 0.85 },
        { patterns: [/desain|design|ui|ux|mockup|layout|interface/i], confidence: 0.88 }, // UI design = code
        { patterns: [/tampilan|komponen|component|dashboard/i], confidence: 0.85 },
    ],
    audit: [
        { patterns: [/cek|check|audit|review code/i], confidence: 0.9 },
        { patterns: [/security|keamanan|vulnerability/i], confidence: 0.95 },
        { patterns: [/bug|error|issue|masalah/i], confidence: 0.8 },
    ],
    docs: [
        { patterns: [/dokumentasi|documentation|readme/i], confidence: 0.95 },
        { patterns: [/tulis doc|write doc|api ref/i], confidence: 0.9 },
        { patterns: [/jsdoc|swagger|openapi/i], confidence: 0.9 },
    ],
    cowriter: [
        { patterns: [/tulis|write|rewrite|edit/i], confidence: 0.8 },
        { patterns: [/artikel|article|blog|content/i], confidence: 0.9 },
        { patterns: [/perbaiki tulisan|improve writing/i], confidence: 0.9 },
    ],
    solve: [
        { patterns: [/hitung|calculate|math|rumus/i], confidence: 0.95 },
        { patterns: [/soal|problem|solve/i], confidence: 0.85 },
        { patterns: [/fisika|physics|kimia|chemistry/i], confidence: 0.9 },
    ],
    question: [
        { patterns: [/quiz|soal|pertanyaan|question/i], confidence: 0.9 },
        { patterns: [/test|ujian|exam/i], confidence: 0.9 },
        { patterns: [/latihan|practice|exercise/i], confidence: 0.85 },
    ],
    guide: [
        { patterns: [/tutorial|guide|langkah|step/i], confidence: 0.9 },
        { patterns: [/cara|how to|belajar|learn/i], confidence: 0.85 },
        { patterns: [/panduan|manual|instructions/i], confidence: 0.9 },
    ],
    ideagen: [
        { patterns: [/ide|idea|brainstorm/i], confidence: 0.9 },
        { patterns: [/fitur|feature|concept/i], confidence: 0.8 },
        { patterns: [/kreativ|creative|inovasi|innovation/i], confidence: 0.85 },
    ],
    chat: [
        { patterns: [/chat|tanya|ask|ngobrol/i], confidence: 0.5 },
    ],
};

// Agent compatibility matrix - which agents work well together
// Note: kilatimage excluded - it's an internal shadow agent
const AGENT_COMPATIBILITY: Record<AgentType, AgentType[]> = {
    codegen: ['research', 'crawl', 'audit', 'docs'],
    imagegen: ['codegen', 'ideagen'], // KilatDesign
    audit: ['codegen', 'docs'],
    docs: ['codegen', 'research'],
    research: ['codegen', 'ideagen', 'docs', 'guide'],
    cowriter: ['research', 'ideagen'],
    solve: ['research', 'guide'],
    question: ['research', 'guide'],
    guide: ['research', 'question', 'codegen'],
    ideagen: ['research', 'codegen', 'imagegen'],
    crawl: ['research', 'codegen', 'imagegen'],
    chat: ['research', 'guide'],
    kilatimage: [], // Shadow agent - not recommended to users
};

/**
 * Suggest agents based on user message and context
 */
export function suggestAgents(context: RecommendationContext): AgentSuggestion[] {
    const { currentAgent, userMessage, previousAgents = [] } = context;
    const suggestions: AgentSuggestion[] = [];

    // Get compatible agents for current agent
    const compatibleAgents = AGENT_COMPATIBILITY[currentAgent] || [];

    // Analyze message for triggers
    for (const [agent, triggers] of Object.entries(TRIGGER_PATTERNS)) {
        const agentType = agent as AgentType;

        // Skip current agent and already used agents
        if (agentType === currentAgent || previousAgents.includes(agentType)) {
            continue;
        }

        // Check triggers
        for (const trigger of triggers) {
            const hasMatch = trigger.patterns.some(pattern => pattern.test(userMessage));

            if (hasMatch) {
                // Boost confidence if compatible
                const isCompatible = compatibleAgents.includes(agentType);
                const adjustedConfidence = isCompatible
                    ? Math.min(trigger.confidence + 0.1, 1.0)
                    : trigger.confidence * 0.8;

                // Only add if above threshold
                if (adjustedConfidence >= 0.6) {
                    // Check if already in suggestions
                    const existing = suggestions.find(s => s.agent === agentType);
                    if (existing) {
                        // Update if higher confidence
                        if (adjustedConfidence > existing.confidence) {
                            existing.confidence = adjustedConfidence;
                        }
                    } else {
                        suggestions.push({
                            agent: agentType,
                            name: AGENT_NAMES[agentType],
                            reason: getReasonForAgent(agentType, userMessage),
                            confidence: adjustedConfidence,
                            priority: isCompatible ? 1 : 2,
                            estimated_tokens: getEstimatedTokens(agentType),
                            auto_allowed: adjustedConfidence >= 0.85,
                        });
                    }
                }
                break; // One match per agent is enough
            }
        }
    }

    // Sort by priority then confidence
    return suggestions.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.confidence - a.confidence;
    });
}

/**
 * Get human-readable reason for suggestion
 */
function getReasonForAgent(agent: AgentType, message: string): string {
    const reasons: Record<AgentType, string> = {
        research: 'Riset latar belakang dan referensi',
        crawl: 'Ekstrak patterns dari website',
        imagegen: 'Generate desain UI/mockup',
        kilatimage: 'Generate gambar (internal)', // Shadow agent
        codegen: 'Implementasi ke kode',
        audit: 'Cek keamanan dan kualitas kode',
        docs: 'Buat dokumentasi',
        cowriter: 'Perbaiki dan edit tulisan',
        solve: 'Selesaikan perhitungan',
        question: 'Generate soal latihan',
        guide: 'Buat tutorial step-by-step',
        ideagen: 'Brainstorm ide dan konsep',
        chat: 'Diskusi umum',
    };
    return reasons[agent] || 'Kebutuhan tambahan';
}

export const AGENT_HUMAN_NAMES: Record<AgentType, string> = {
    research: 'KilatResearch',
    crawl: 'KilatCrawl',
    imagegen: 'KilatDesign',
    kilatimage: 'KilatImage',
    codegen: 'KilatCode',
    audit: 'KilatAudit',
    docs: 'KilatDocs',
    cowriter: 'KilatWrite',
    solve: 'KilatSolve',
    question: 'KilatQuestion',
    guide: 'KilatGuide',
    ideagen: 'KilatIdea',
    chat: 'KilatChat',
};

const AGENT_THRESHOLDS: Record<AgentType, number> = {
    research: 0.7,
    crawl: 0.8,
    imagegen: 0.8,
    kilatimage: 0.9,
    codegen: 0.75,
    audit: 0.8,
    docs: 0.8,
    cowriter: 0.75,
    solve: 0.85,
    question: 0.8,
    guide: 0.8,
    ideagen: 0.75,
    chat: 0.1,
};

/**
 * Estimate token usage per agent
 */
function getEstimatedTokens(agent: AgentType): number {
    const estimates: Record<AgentType, number> = {
        research: 3000,
        crawl: 1500,
        kilatimage: 1000, // Added kilatimage
        imagegen: 500,
        codegen: 5000,
        audit: 2000,
        docs: 2500,
        cowriter: 1500,
        solve: 2000,
        question: 1500,
        guide: 2500,
        ideagen: 1000,
        chat: 500,
    };
    return estimates[agent] || 1000;
}

/**
 * Check if auto-execution should proceed
 */
export function shouldAutoExecute(
    suggestions: AgentSuggestion[],
    mode: 'auto' | 'recommended' | 'manual',
    confidenceThreshold: number = 0.85
): AgentSuggestion[] {
    if (mode === 'manual') return [];
    if (mode === 'auto') {
        return suggestions.filter(s => s.auto_allowed && s.confidence >= confidenceThreshold);
    }
    // recommended mode - return all for user approval
    return suggestions;
}

// ============================================================================
// Groq-Based Async Suggestion (MULTILINGUAL)
// ============================================================================

/**
 * Async version that uses Groq for multilingual intent detection
 * Supports: Indonesian, English, Spanish, German, French, and more!
 */
export async function suggestAgentsAsync(context: RecommendationContext): Promise<AgentSuggestion[]> {
    const { currentAgent, userMessage, previousAgents = [] } = context;

    try {
        // Use Groq-based hybrid detection
        const intentResult = await detectIntentHybrid(userMessage);

        // Skip if same as current agent
        if (intentResult.agent === currentAgent || previousAgents.includes(intentResult.agent)) {
            // Fall back to regex-based suggestions
            return suggestAgents(context);
        }

        // Get compatible agents
        const compatibleAgents = AGENT_COMPATIBILITY[currentAgent] || [];
        const isCompatible = compatibleAgents.includes(intentResult.agent);

        // Build suggestion
        const groqSuggestion: AgentSuggestion = {
            agent: intentResult.agent,
            name: AGENT_NAMES[intentResult.agent],
            reason: intentResult.reason,
            confidence: intentResult.confidence,
            priority: isCompatible ? 1 : 2,
            estimated_tokens: getEstimatedTokens(intentResult.agent),
            auto_allowed: intentResult.confidence >= 0.85,
        };

        // Also get regex-based suggestions as backup
        const regexSuggestions = suggestAgents(context);

        // Merge: Groq first, then regex (deduplicated)
        const merged = [groqSuggestion];
        for (const regexSugg of regexSuggestions) {
            if (regexSugg.agent !== groqSuggestion.agent) {
                merged.push(regexSugg);
            }
        }

        return merged.filter(s => s.confidence >= 0.6);

    } catch (error) {
        console.warn('[Recommender] Groq failed, falling back to regex:', error);
        return suggestAgents(context);
    }
}

// ============================================================================
// POST-TASK SUGGESTIONS (Phase 1: Cross-Agent Workflow)
// Suggest next agents after completing a task
// ============================================================================

/**
 * Workflow map: After completing agent X, suggest these agents
 * Note: kilatimage excluded - shadow agent
 */
export const POST_TASK_FLOW: Record<AgentType, { agent: AgentType, reason: string }[]> = {
    ideagen: [
        { agent: 'codegen', reason: '🚀 Implementasi ide dengan KilatCode' },
        { agent: 'research', reason: '📚 Riset lebih dalam tentang konsep ini' },
    ],
    codegen: [
        { agent: 'imagegen', reason: '🎨 Buat mockup UI dengan KilatDesign' },
        { agent: 'audit', reason: '🛡️ Audit keamanan kode dengan KilatAudit' },
        { agent: 'docs', reason: '📖 Generate dokumentasi dengan KilatDocs' },
    ],
    imagegen: [
        { agent: 'codegen', reason: '💻 Implementasi desain ke kode' },
    ],
    research: [
        { agent: 'ideagen', reason: '💡 Brainstorm ide berdasarkan temuan' },
        { agent: 'codegen', reason: '🚀 Build berdasarkan hasil riset' },
    ],
    audit: [
        { agent: 'codegen', reason: '🔧 Perbaiki masalah di KilatCode' },
    ],
    docs: [],
    cowriter: [
        { agent: 'docs', reason: '📖 Format sebagai dokumentasi' },
    ],
    solve: [
        { agent: 'guide', reason: '📝 Buat tutorial dari solusi ini' },
    ],
    question: [
        { agent: 'guide', reason: '📝 Buat tutorial pendukung' },
    ],
    guide: [
        { agent: 'question', reason: '❓ Buat kuis untuk menguji pemahaman' },
    ],
    crawl: [
        { agent: 'codegen', reason: '🚀 Build berdasarkan data scraping' },
        { agent: 'research', reason: '📚 Analisis data lebih dalam' },
    ],
    chat: [],
    kilatimage: [], // Shadow agent - not suggested
};

/**
 * Get post-task suggestions based on completed agent
 * Called after a task is completed to suggest next workflow steps
 */
export function getPostTaskSuggestions(completedAgent: AgentType): AgentSuggestion[] {
    const flows = POST_TASK_FLOW[completedAgent] || [];

    return flows.map((flow, index) => ({
        agent: flow.agent,
        name: AGENT_NAMES[flow.agent],
        reason: flow.reason,
        confidence: 0.85 - (index * 0.05), // Primary = 0.85, secondary = 0.80, etc
        priority: index + 1,
        estimated_tokens: getEstimatedTokens(flow.agent),
        auto_allowed: false, // Never auto-execute after task
    }));
}

