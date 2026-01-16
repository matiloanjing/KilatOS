/**
 * IdeaGen Agent Orchestrator (Stateless)
 * Automated idea generation and brainstorming
 * Flow: Decompose topic → Generate ideas → Synthesize
 * Model: claude (creative thinking) → fallback: openai
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletionWithFallback } from '@/lib/ai/pollination-client';
import { getModelForAgent, getFallbackModel } from '@/lib/config/models';
import { safeParseJSON } from '@/lib/utils/json-sanitizer';
import { vectorSearch } from '@/lib/tools/rag';
import { getPrompt } from '@/lib/prompts/templates';
import {
    createSession,
    saveAgentState,
    addMessage,
    completeSession,
} from '@/lib/db/session-manager';

// Get optimal model for IdeaGen Agent
const IDEAGEN_PRIMARY_MODEL = getModelForAgent('ideagen');
const IDEAGEN_FALLBACK_MODEL = getFallbackModel('ideagen');

export interface IdeaGenParams {
    topic: string;
    kbName: string;
    count?: number;
    userId?: string;
    locale?: 'en' | 'id';
}

export interface Idea {
    id: string;
    title: string;
    description: string;
    category: string;
    feasibility: number; // 0-1
    creativity: number; // 0-1
}

export interface IdeaGenResult {
    sessionId: string;
    topic: string;
    ideas: Idea[];
    synthesis?: string;
}

/**
 * Generate ideas for a topic
 */
export async function generateIdeas(params: IdeaGenParams): Promise<IdeaGenResult> {
    const { topic, kbName, count = 10, userId, locale = 'en' } = params;

    // Create session
    const session = await createSession({
        agent_type: 'ideagen',
        kb_name: kbName,
        user_id: userId,
        metadata: { topic, count },
    });

    // Get context from knowledge base
    const kbResults = await vectorSearch(topic, kbName, 10);
    const context = kbResults.map((r) => r.text).join('\n\n');

    // Step 1: Decompose topic into aspects
    const decomposePrompt = `Decompose this topic into 3-5 key aspects for idea generation:

Topic: ${topic}

Context from knowledge base:
${context.substring(0, 1500)}

Respond with JSON array of aspects:
["aspect1", "aspect2", "aspect3", ...]`;

    const aspectsResponse = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: decomposePrompt }],
        IDEAGEN_PRIMARY_MODEL,
        IDEAGEN_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 500,
        }
    );

    let aspects: string[];
    try {
        aspects = safeParseJSON(aspectsResponse) || [topic, `${topic} applications`, `${topic} innovations`];
    } catch (e) {
        aspects = [topic, `${topic} applications`, `${topic} innovations`];
    }

    // Step 2: Generate ideas for each aspect using claude for creativity
    const ideatePrompt = `Generate creative and innovative ideas related to: ${topic}

Focus on these aspects:
${aspects.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Context:
${context.substring(0, 1500)}

Generate ${count} diverse ideas, each with:
1. Title (catchy and clear)
2. Description (2-3 sentences)
3. Category (which aspect it belongs to)
4. Feasibility score (0-1, how practical is it)
5. Creativity score (0-1, how novel is it)

Respond with JSON array:
[
  {
    "id": "1",
    "title": "Idea title",
    "description": "Detailed description",
    "category": "aspect name",
    "feasibility": 0.8,
    "creativity": 0.9
  },
  ...
]`;

    const ideasResponse = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: ideatePrompt }],
        IDEAGEN_PRIMARY_MODEL,
        IDEAGEN_FALLBACK_MODEL,
        {
            temperature: 0.9, // High temperature for creativity
            maxTokens: 2500,
        }
    );

    // Parse ideas
    let ideas: Idea[];
    try {
        const parsed = safeParseJSON(ideasResponse);
        ideas = (Array.isArray(parsed) ? parsed : parsed.ideas || []).map((idea: any, idx: number) => ({
            id: idea.id || `${idx + 1}`,
            title: idea.title || `Idea ${idx + 1}`,
            description: idea.description || '',
            category: idea.category || aspects[0] || 'General',
            feasibility: idea.feasibility || 0.5,
            creativity: idea.creativity || 0.5,
        }));
    } catch (e) {
        // Fallback: extract ideas from text
        ideas = [
            {
                id: '1',
                title: topic,
                description: ideasResponse.substring(0, 200),
                category: 'General',
                feasibility: 0.5,
                creativity: 0.5,
            },
        ];
    }

    // Step 3: Synthesize top ideas
    const topIdeas = ideas
        .sort((a, b) => (b.feasibility + b.creativity) - (a.feasibility + a.creativity))
        .slice(0, Math.min(5, count));

    const synthesisPrompt = `Synthesize these top ideas into a cohesive innovation strategy:

Topic: ${topic}

Top Ideas:
${topIdeas.map((idea, i) => `${i + 1}. **${idea.title}**\n   ${idea.description}\n   Feasibility: ${idea.feasibility}, Creativity: ${idea.creativity}`).join('\n\n')}

Provide:
1. Common themes across the ideas
2. Recommended implementation order
3. Potential synergies between ideas
4. Next steps

Write in markdown format.`;

    const synthesis = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: synthesisPrompt }],
        IDEAGEN_PRIMARY_MODEL,
        IDEAGEN_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 1500,
        }
    );

    // Save state
    await saveAgentState(session.id, 1, 'ideagen_complete', {
        topic,
        aspects,
        ideas,
        synthesis,
    });

    await addMessage(session.id, 'assistant', JSON.stringify({ ideas, synthesis }, null, 2));
    await completeSession(session.id);

    return {
        sessionId: session.id,
        topic,
        ideas,
        synthesis,
    };
}


