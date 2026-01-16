/**
 * Question Agent Orchestrator (Stateless)
 * Generate and validate practice questions
 * Modes: Custom (from requirements) | Mimic (clone exam style from PDF)
 * Model: openai (structured output) → fallback: gemini-fast
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

// Get optimal model for Question Agent
const QUESTION_PRIMARY_MODEL = getModelForAgent('question');
const QUESTION_FALLBACK_MODEL = getFallbackModel('question');

export interface QuestionParams {
    mode: 'custom' | 'mimic';
    requirements?: string; // For custom mode
    examPdfContent?: string; // For mimic mode
    kbName: string;
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionType?: 'multiple-choice' | 'short-answer' | 'essay' | 'mixed';
    userId?: string;
    locale?: 'en' | 'id';
}

export interface GeneratedQuestion {
    id: string;
    question: string;
    type: string;
    options?: string[];
    correct_answer: string;
    explanation: string;
    difficulty: string;
    validation_score?: number;
}

export interface QuestionResult {
    sessionId: string;
    mode: string;
    questions: GeneratedQuestion[];
    validationScores?: number[];
    averageScore?: number;
}

/**
 * Generate questions in custom mode
 * Based on requirements and knowledge base context
 */
export async function generateCustomQuestions(
    params: QuestionParams
): Promise<QuestionResult> {
    const {
        requirements = '',
        kbName,
        count = 5,
        difficulty = 'medium',
        questionType = 'mixed',
        userId,
        locale = 'en',
    } = params;

    // Create session
    const session = await createSession({
        agent_type: 'question',
        kb_name: kbName,
        user_id: userId,
        metadata: { mode: 'custom', requirements, count, difficulty },
    });

    // Get context from knowledge base
    const kbResults = await vectorSearch(requirements, kbName, 10);
    const context = kbResults.map((r) => r.text).join('\n\n');

    // Generate questions using openai model for structured output
    const generationPrompt = getPrompt('question_generate', locale, {
        requirements,
        difficulty,
        question_type: questionType,
        count: count.toString(),
        context,
    });

    const systemMessage = { role: 'system' as const, content: generationPrompt };
    const response = await chatCompletionWithFallback(
        [systemMessage],
        QUESTION_PRIMARY_MODEL,
        QUESTION_FALLBACK_MODEL,
        {
            temperature: 0.8,
            maxTokens: 2048,
        }
    );

    // Parse questions from response (expect JSON array)
    let questions: GeneratedQuestion[];
    try {
        const parsed = safeParseJSON(response);
        questions = parsed ? (Array.isArray(parsed) ? parsed : parsed.questions || [parsed]) : [];
    } catch (e) {
        // Fallback: create simple questions from text
        questions = [
            {
                id: '1',
                question: response.substring(0, 200),
                type: questionType,
                correct_answer: 'See explanation',
                explanation: response,
                difficulty,
            },
        ];
    }

    // Validate each question
    const validationScores: number[] = [];
    for (const q of questions) {
        const validationPrompt = getPrompt('question_validate', locale, {
            question: JSON.stringify(q),
            requirements,
            context,
        });

        const validationResponse = await chatCompletionWithFallback(
            [{ role: 'system' as const, content: validationPrompt }],
            QUESTION_PRIMARY_MODEL,
            QUESTION_FALLBACK_MODEL,
            {
                temperature: 0.3,
                maxTokens: 500,
            }
        );


        try {
            const validation = safeParseJSON(validationResponse);
            q.validation_score = validation.overall || 0.8;
            validationScores.push(q.validation_score || 0.8);
        } catch (e) {
            q.validation_score = 0.75; // Default score
            validationScores.push(0.75);
        }

    }

    const averageScore =
        validationScores.reduce((a, b) => a + b, 0) / validationScores.length;

    // Save state
    await saveAgentState(session.id, 1, 'generate_questions', {
        mode: 'custom',
        requirements,
        questions,
        validationScores,
        averageScore,
    });

    await addMessage(session.id, 'assistant', JSON.stringify(questions, null, 2));
    await completeSession(session.id);

    return {
        sessionId: session.id,
        mode: 'custom',
        questions,
        validationScores,
        averageScore,
    };
}

/**
 * Generate questions in mimic mode
 * Clone exam style from uploaded PDF
 */
export async function generateMimicQuestions(
    params: QuestionParams
): Promise<QuestionResult> {
    const {
        examPdfContent = '',
        kbName,
        count = 5,
        userId,
        locale = 'en',
    } = params;

    // Create session
    const session = await createSession({
        agent_type: 'question',
        kb_name: kbName,
        user_id: userId,
        metadata: { mode: 'mimic', count },
    });

    // Analyze exam style from PDF
    const styleAnalysisPrompt = `Analyze this exam and identify:
1. Question types used
2. Difficulty level
3. Format and structure
4. Topics covered

Exam content:
${examPdfContent.substring(0, 2000)}

Respond with JSON:
{
  "questionTypes": ["type1", "type2"],
  "difficulty": "medium",
  "format": "description",
  "topics": ["topic1", "topic2"]
}`;

    const styleAnalysis = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: styleAnalysisPrompt }],
        QUESTION_PRIMARY_MODEL,
        QUESTION_FALLBACK_MODEL,
        {
            temperature: 0.3,
            maxTokens: 500,
        }
    );

    let style: any;
    try {
        style = safeParseJSON(styleAnalysis);
    } catch (e) {
        style = {
            questionTypes: ['multiple-choice'],
            difficulty: 'medium',
            format: 'standard',
            topics: ['general'],
        };
    }

    // Get context from KB
    const topicQuery = style.topics.join(' ');
    const kbResults = await vectorSearch(topicQuery, kbName, 10);
    const context = kbResults.map((r) => r.text).join('\n\n');

    // Generate questions matching the exam style
    const mimicPrompt = `Generate ${count} questions that EXACTLY match this exam style:

Style Analysis:
${JSON.stringify(style, null, 2)}

Reference exam format:
${examPdfContent.substring(0, 1000)}

Use this knowledge base context:
${context.substring(0, 1000)}

Generate questions as JSON array with same format as the reference exam.`;

    const response = await chatCompletionWithFallback(
        [{ role: 'system' as const, content: mimicPrompt }],
        QUESTION_PRIMARY_MODEL,
        QUESTION_FALLBACK_MODEL,
        {
            temperature: 0.7,
            maxTokens: 2048,
        }
    );

    // Parse questions
    let questions: GeneratedQuestion[];
    try {
        const parsed = safeParseJSON(response);
        questions = Array.isArray(parsed) ? parsed : parsed.questions || [parsed];
    } catch (e) {
        questions = [
            {
                id: '1',
                question: response.substring(0, 200),
                type: style.questionTypes[0] || 'mixed',
                correct_answer: 'See explanation',
                explanation: response,
                difficulty: style.difficulty,
            },
        ];
    }

    // Save state
    await saveAgentState(session.id, 1, 'mimic_questions', {
        mode: 'mimic',
        style,
        questions,
    });

    await addMessage(session.id, 'assistant', JSON.stringify(questions, null, 2));
    await completeSession(session.id);

    return {
        sessionId: session.id,
        mode: 'mimic',
        questions,
    };
}

/**
 * Main question generation entry point
 */
export async function generateQuestions(
    params: QuestionParams
): Promise<QuestionResult> {
    if (params.mode === 'mimic') {
        return generateMimicQuestions(params);
    } else {
        return generateCustomQuestions(params);
    }
}


