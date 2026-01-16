import { NextRequest, NextResponse } from 'next/server';
import { suggestAgentsAsync } from '@/lib/agents/recommender';
import { AgentType } from '@/lib/agents/router';

export const runtime = 'nodejs'; // Required for Groq API calls

/**
 * Agent Suggestion API
 * Uses Groq LLM for multilingual intent detection
 * 
 * POST /api/kilat/suggest
 * Body: { message: string, currentAgent?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { message, currentAgent, recentMessages } = await req.json();

        if (!message) {
            return NextResponse.json({ suggestions: [] });
        }

        // Use async Groq-based detection (multilingual!)
        const suggestions = await suggestAgentsAsync({
            currentAgent: (currentAgent as AgentType) || 'chat',
            userMessage: message,
            projectContext: {}
        });

        // Filter: Remove imagegen/kilatimage suggestions for pure image requests
        // Image generation is auto-handled by kilatimage (shadow agent)
        const imageKeywords = /gambar|image|foto|photo|ilustrasi|illustration|logo|banner|art|seni|draw|sketch/i;
        const isImageRequest = imageKeywords.test(message);

        // Filter out low confidence and imagegen (for image requests)
        const filtered = suggestions.filter(s => {
            if (s.confidence <= 0.6) return false;

            // Don't suggest imagegen/kilatimage/codegen for image requests - auto-handled
            // KilatCode often triggers on 'buat/create', so we exclude it too for image/art requests
            if (isImageRequest && (s.agent === 'imagegen' || s.agent === 'kilatimage' || s.agent === 'codegen')) return false;

            return true;
        });

        return NextResponse.json({ suggestions: filtered });
    } catch (error) {
        console.error('Suggestion error:', error);
        return NextResponse.json({ suggestions: [] }, { status: 500 });
    }
}
