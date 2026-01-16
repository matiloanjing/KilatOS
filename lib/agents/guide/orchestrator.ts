/**
 * Guide Agent Orchestrator (Stateless)
 * Interactive learning with progressive knowledge points
 * Flow: Locate knowledge points → Generate interactive HTML → Summarize
 * Model: gemini-fast (speed + vision) → fallback: openai-fast
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletionWithFallback } from '@/lib/ai/pollination-client';
import { getModelForAgent, getFallbackModel } from '@/lib/config/models';
import { vectorSearch } from '@/lib/tools/rag';
import { getPrompt } from '@/lib/prompts/templates';
import {
    createSession,
    saveAgentState,
    loadAgentState,
    addMessage,
    completeSession,
} from '@/lib/db/session-manager';

// Get optimal model for Guide Agent
const GUIDE_PRIMARY_MODEL = getModelForAgent('guide');
const GUIDE_FALLBACK_MODEL = getFallbackModel('guide');

export interface GuideParams {
    notebooks: string[]; // List of notebook/document names
    kbName: string;
    userId?: string;
    locale?: 'en' | 'id';
}

export interface KnowledgePoint {
    id: string;
    title: string;
    content: string;
    htmlVisualization: string;
    order: number;
    isCompleted: boolean;
}

export interface GuideResult {
    sessionId: string;
    knowledgePoints: KnowledgePoint[];
    currentPointIndex: number;
    summary?: string;
    status: 'locating' | 'interactive' | 'completed';
}

/**
 * Step 1: Locate knowledge points from notebooks
 */
export async function startGuide(params: GuideParams): Promise<GuideResult> {
    const { notebooks, kbName, userId, locale = 'en' } = params;

    // Create session
    const session = await createSession({
        agent_type: 'guide',
        kb_name: kbName,
        user_id: userId,
        metadata: { notebooks },
    });

    // Search for content from notebooks
    const notebookQuery = notebooks.join(' ');
    const kbResults = await vectorSearch(notebookQuery, kbName, 20);
    const content = kbResults.map((r) => r.text).join('\n\n---\n\n');

    // Extract key knowledge points using gemini-fast
    const locatePrompt = `Analyze the following learning content and extract 5-8 key knowledge points that should be learned progressively.

Content:
${content.substring(0, 3000)}

For each knowledge point, provide:
1. Title (concise)
2. Main concept description
3. Order (1-8, progressive difficulty)

Respond with JSON array:
[
  {
    "id": "1",
    "title": "Point title",
    "content": "Main concept description",
    "order": 1
  },
  ...
]`;

    const response = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: locatePrompt }],
        GUIDE_PRIMARY_MODEL,
        GUIDE_FALLBACK_MODEL,
        {
            temperature: 0.5,
            maxTokens: 1500,
        }
    );

    // Parse knowledge points
    let knowledgePoints: KnowledgePoint[];
    try {
        const { safeParseJSON } = await import('@/lib/utils/json-sanitizer');
        const parsed = safeParseJSON(response);
        knowledgePoints = (Array.isArray(parsed) ? parsed : parsed.points || [])
            .sort((a: any, b: any) => a.order - b.order)
            .map((kp: any) => ({
                id: kp.id || `${kp.order}`,
                title: kp.title || 'Knowledge Point',
                content: kp.content || '',
                htmlVisualization: '', // Will be generated in next step
                order: kp.order || 1,
                isCompleted: false,
            }));
    } catch (e) {
        // Fallback: create simple points
        knowledgePoints = [
            {
                id: '1',
                title: 'Introduction',
                content: content.substring(0, 200),
                htmlVisualization: '',
                order: 1,
                isCompleted: false,
            },
        ];
    }

    // Save locating state
    await saveAgentState(session.id, 1, 'locating', {
        notebooks,
        knowledgePoints,
        currentPointIndex: 0,
    });

    return {
        sessionId: session.id,
        knowledgePoints,
        currentPointIndex: 0,
        status: 'locating',
    };
}

/**
 * Step 2: Generate interactive HTML visualization for current point
 */
export async function generateInteractivePoint(
    sessionId: string,
    pointIndex: number
): Promise<GuideResult> {
    // Load state
    const state = await loadAgentState(sessionId, 1);
    if (!state) {
        throw new Error('Guide state not found');
    }

    const { knowledgePoints, currentPointIndex } = state.state_data as any;
    const currentPoint = knowledgePoints[pointIndex];

    if (!currentPoint) {
        throw new Error('Knowledge point not found');
    }

    // Generate HTML visualization using gemini-fast (has vision capability)
    const visualizationPrompt = `Create an interactive HTML visualization for this learning concept.

Knowledge Point: ${currentPoint.title}
Content: ${currentPoint.content}

Generate a complete HTML snippet (just the body content) that:
1. Explains the concept clearly
2. Includes visual elements (diagrams using CSS/SVG)
3. Has interactive examples
4. Uses modern, clean design

Respond with valid HTML only (no markdown code fences).`;

    const htmlVisualization = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: visualizationPrompt }],
        GUIDE_PRIMARY_MODEL,
        GUIDE_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 2000,
        }
    );

    // Update point with visualization
    currentPoint.htmlVisualization = htmlVisualization;
    currentPoint.isCompleted = true;

    // Update state
    await saveAgentState(sessionId, 2, 'interactive', {
        knowledgePoints,
        currentPointIndex: pointIndex,
    });

    return {
        sessionId,
        knowledgePoints,
        currentPointIndex: pointIndex,
        status: 'interactive',
    };
}

/**
 * Step 3: Generate learning summary
 */
export async function completeGuide(
    sessionId: string,
    locale: 'en' | 'id' = 'en'
): Promise<GuideResult> {
    // Load state
    const state = await loadAgentState(sessionId, 2);
    if (!state) {
        throw new Error('Guide state not found');
    }

    const { knowledgePoints } = state.state_data as any;

    // Generate summary
    const summaryPrompt = `Summarize the learning journey through these knowledge points:

${knowledgePoints.map((kp: KnowledgePoint) => `${kp.order}. ${kp.title}\n${kp.content}`).join('\n\n')}

Provide:
1. Key takeaways
2. Connections between concepts
3. Next steps for further learning

Write in markdown format.`;

    const summary = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: summaryPrompt }],
        GUIDE_PRIMARY_MODEL,
        GUIDE_FALLBACK_MODEL,
        {
            temperature: 0.6,
            maxTokens: 1000,
        }
    );

    // Save final state
    await saveAgentState(sessionId, 3, 'summary', {
        knowledgePoints,
        summary,
    });

    await addMessage(sessionId, 'assistant', summary);
    await completeSession(sessionId);

    return {
        sessionId,
        knowledgePoints,
        currentPointIndex: knowledgePoints.length - 1,
        summary,
        status: 'completed',
    };
}

/**
 * Full guide workflow
 */
export async function guide(params: GuideParams): Promise<GuideResult> {
    // Step 1: Locate knowledge points
    const step1 = await startGuide(params);

    // Step 2: Generate visualizations for all points
    for (let i = 0; i < step1.knowledgePoints.length; i++) {
        await generateInteractivePoint(step1.sessionId, i);
    }

    // Step 3: Generate summary
    const step3 = await completeGuide(step1.sessionId, params.locale);

    return step3;
}


