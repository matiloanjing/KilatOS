/**
 * Cross-Agent Context Injection
 * 
 * Injects context from other agents into AI prompts.
 * Enables AI to see what other agents have done on the same project.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface CrossAgentContext {
    hasContext: boolean;
    agentSummaries: AgentSummary[];
    files: Record<string, string>;
    recentMessages: string[];
    injectionText: string;
}

export interface AgentSummary {
    agentType: string;
    agentName: string;
    messageCount: number;
    hasOutput: boolean;
    outputType?: string;
    lastContent?: string;
}

// Agent type display names
const AGENT_NAMES: Record<string, string> = {
    code: 'KilatCode',
    design: 'KilatDesign',
    audit: 'KilatAudit',
    docs: 'KilatDocs',
    research: 'KilatResearch',
    write: 'KilatWrite',
    solve: 'KilatSolve',
    question: 'KilatQuestion',
    guide: 'KilatGuide',
    idea: 'KilatIdea',
    crawl: 'KilatCrawl',
    codegen: 'KilatCode',
    imagegen: 'KilatDesign',
    cowriter: 'KilatWrite',
    ideagen: 'KilatIdea',
};

/**
 * Load cross-agent context for a session
 * Returns aggregated data from all agents that have worked on this project
 */
export async function loadCrossAgentContext(
    sessionId: string,
    currentAgentType: string
): Promise<CrossAgentContext> {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get all agent states for this session
        const { data: agentStates, error } = await supabase
            .from('agent_states')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(50); // Limit to last 50 entries

        if (error || !agentStates || agentStates.length === 0) {
            return {
                hasContext: false,
                agentSummaries: [],
                files: {},
                recentMessages: [],
                injectionText: ''
            };
        }

        // Aggregate by agent type
        const agentData: Record<string, { count: number; hasOutput: boolean; outputType?: string; lastContent?: string }> = {};
        const files: Record<string, string> = {};
        const recentMessages: string[] = [];

        for (const state of agentStates) {
            const data = state.state_data || {};
            const agentName = state.agent_name || data.agent || 'unknown';

            // Skip current agent's data (we don't need to inject our own context)
            if (agentName === currentAgentType || agentName === AGENT_NAMES[currentAgentType]) {
                continue;
            }

            // Track agent activity
            if (!agentData[agentName]) {
                agentData[agentName] = { count: 0, hasOutput: false };
            }
            agentData[agentName].count++;

            // Collect files
            if (data.files) {
                Object.assign(files, data.files);
                agentData[agentName].hasOutput = true;
                agentData[agentName].outputType = 'files';
            }

            // Collect outputs
            if (data.images) {
                agentData[agentName].hasOutput = true;
                agentData[agentName].outputType = 'images';
            }

            // Store last content for summary
            if (data.content && !agentData[agentName].lastContent) {
                agentData[agentName].lastContent = data.content.slice(0, 200);
            }

            // Collect recent messages (up to 5)
            if (recentMessages.length < 5 && data.content) {
                recentMessages.push(`[${AGENT_NAMES[agentName] || agentName}]: ${data.content.slice(0, 100)}...`);
            }
        }

        // Build agent summaries
        const agentSummaries: AgentSummary[] = Object.entries(agentData).map(([type, data]) => ({
            agentType: type,
            agentName: AGENT_NAMES[type] || type,
            messageCount: data.count,
            hasOutput: data.hasOutput,
            outputType: data.outputType,
            lastContent: data.lastContent
        }));

        // Build injection text for AI prompt
        const injectionText = buildInjectionText(agentSummaries, files, recentMessages);

        return {
            hasContext: agentSummaries.length > 0 || Object.keys(files).length > 0,
            agentSummaries,
            files,
            recentMessages,
            injectionText
        };
    } catch (error) {
        console.error('[CrossAgentContext] Error loading context:', error);
        return {
            hasContext: false,
            agentSummaries: [],
            files: {},
            recentMessages: [],
            injectionText: ''
        };
    }
}

/**
 * Build the text to inject into AI prompts
 */
function buildInjectionText(
    agentSummaries: AgentSummary[],
    files: Record<string, string>,
    recentMessages: string[]
): string {
    if (agentSummaries.length === 0 && Object.keys(files).length === 0) {
        return '';
    }

    let text = '\n\n## 🔗 CROSS-AGENT CONTEXT\n';
    text += 'Other agents have worked on this project. Use this information:\n\n';

    // Agent activity summary
    if (agentSummaries.length > 0) {
        text += '### Agents Active:\n';
        for (const agent of agentSummaries) {
            text += `- **${agent.agentName}**: ${agent.messageCount} interactions`;
            if (agent.hasOutput) {
                text += ` (produced ${agent.outputType})`;
            }
            text += '\n';
        }
        text += '\n';
    }

    // Files from other agents
    const fileNames = Object.keys(files);
    if (fileNames.length > 0) {
        text += '### Available Files:\n';
        text += fileNames.slice(0, 10).join(', ');
        if (fileNames.length > 10) {
            text += ` (+${fileNames.length - 10} more)`;
        }
        text += '\n\n';

        // Include first 2 important files' content (abridged)
        const importantExtensions = ['.tsx', '.ts', '.jsx', '.js', '.py', '.css'];
        const importantFiles = fileNames
            .filter(f => importantExtensions.some(ext => f.endsWith(ext)))
            .slice(0, 2);

        for (const fileName of importantFiles) {
            const content = files[fileName];
            if (content && content.length < 2000) {
                text += `#### ${fileName}\n\`\`\`\n${content.slice(0, 1000)}\n\`\`\`\n\n`;
            }
        }
    }

    // Recent messages from other agents
    if (recentMessages.length > 0) {
        text += '### Recent Activity:\n';
        for (const msg of recentMessages.slice(0, 3)) {
            text += `- ${msg}\n`;
        }
        text += '\n';
    }

    text += '---\n\n';

    return text;
}

/**
 * Inject cross-agent context into a prompt
 * Call this when building prompts for AI
 */
export function injectCrossAgentContext(
    basePrompt: string,
    crossAgentContext: CrossAgentContext
): string {
    if (!crossAgentContext.hasContext) {
        return basePrompt;
    }

    // Insert cross-agent context before the user request section
    const userRequestMarker = '## USER REQUEST:';
    const insertIndex = basePrompt.indexOf(userRequestMarker);

    if (insertIndex !== -1) {
        return (
            basePrompt.slice(0, insertIndex) +
            crossAgentContext.injectionText +
            basePrompt.slice(insertIndex)
        );
    }

    // Fallback: append at the end before user input
    return basePrompt + crossAgentContext.injectionText;
}
