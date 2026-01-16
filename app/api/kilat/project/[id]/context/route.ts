/**
 * Cross-Agent Context API
 * 
 * Returns all agent data for a single project, enabling cross-agent awareness.
 * 
 * GET /api/kilat/project/[id]/context
 * → Returns: { code, design, audit, docs, research, ... }
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Agent type mapping
const AGENT_TYPES = {
    'codegen': 'code',
    'imagegen': 'design',
    'audit': 'audit',
    'docs': 'docs',
    'research': 'research',
    'cowriter': 'write',
    'solve': 'solve',
    'question': 'question',
    'guide': 'guide',
    'ideagen': 'idea',
    'crawl': 'crawl',
    'KilatCode': 'code',
    'KilatDesign': 'design',
    'KilatAudit': 'audit',
    'KilatDocs': 'docs',
    'KilatResearch': 'research',
    'KilatWrite': 'write',
    'KilatSolve': 'solve',
    'KilatQuestion': 'question',
    'KilatGuide': 'guide',
    'KilatIdea': 'idea',
    'KilatCrawl': 'crawl',
} as const;

type AgentCategory = typeof AGENT_TYPES[keyof typeof AGENT_TYPES];

interface ProjectContext {
    projectId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    agents: {
        code?: AgentData;
        design?: AgentData;
        audit?: AgentData;
        docs?: AgentData;
        research?: AgentData;
        write?: AgentData;
        solve?: AgentData;
        question?: AgentData;
        guide?: AgentData;
        idea?: AgentData;
        crawl?: AgentData;
    };
    messages: Message[];
    files: Record<string, string>;
}

interface AgentData {
    lastUpdate: string;
    messageCount: number;
    hasOutput: boolean;
    outputType?: string;
    summary?: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    agent?: string;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('sb-access-token')?.value;

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
        });

        // 1. Get session info
        const { data: session } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', projectId)
            .single();

        // 2. Get all agent states for this project
        const { data: agentStates } = await supabase
            .from('agent_states')
            .select('*')
            .eq('session_id', projectId)
            .order('created_at', { ascending: true });

        // 3. Parse and categorize by agent type
        const agents: ProjectContext['agents'] = {};
        const messages: Message[] = [];
        let files: Record<string, string> = {};

        if (agentStates) {
            for (const state of agentStates) {
                const data = state.state_data || {};
                const agentName = state.agent_name || data.agent || 'unknown';
                const category = AGENT_TYPES[agentName as keyof typeof AGENT_TYPES] || 'code';

                // Collect messages
                messages.push({
                    id: state.id,
                    role: data.role || 'assistant',
                    content: data.content || data.message || '',
                    timestamp: state.created_at,
                    agent: agentName,
                });

                // Collect files
                if (data.files) {
                    files = { ...files, ...data.files };
                }

                // Track agent activity
                if (!agents[category]) {
                    agents[category] = {
                        lastUpdate: state.updated_at || state.created_at,
                        messageCount: 0,
                        hasOutput: false,
                    };
                }
                agents[category]!.messageCount++;

                if (data.files || data.images || data.audits || data.sections) {
                    agents[category]!.hasOutput = true;
                    if (data.files) agents[category]!.outputType = 'files';
                    if (data.images) agents[category]!.outputType = 'images';
                    if (data.audits) agents[category]!.outputType = 'audits';
                    if (data.sections) agents[category]!.outputType = 'docs';
                }
            }
        }

        const context: ProjectContext = {
            projectId,
            title: session?.title || 'Untitled Project',
            createdAt: session?.created_at || new Date().toISOString(),
            updatedAt: session?.updated_at || new Date().toISOString(),
            agents,
            messages,
            files,
        };

        return NextResponse.json({ success: true, context });
    } catch (error) {
        console.error('[Context API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get project context' },
            { status: 500 }
        );
    }
}

// POST: Update project context with new data from an agent
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: projectId } = await params;
        const body = await request.json();
        const { agentType, data } = body;

        const cookieStore = await cookies();
        const accessToken = cookieStore.get('sb-access-token')?.value;

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
        });

        // Store agent output in agent_states
        const { error } = await supabase
            .from('agent_states')
            .insert({
                session_id: projectId,
                agent_name: agentType,
                state_data: data,
                created_at: new Date().toISOString(),
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Context API] POST Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update context' },
            { status: 500 }
        );
    }
}
