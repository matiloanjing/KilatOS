/**
 * Hierarchical Memory System
 * Multi-level context and conversation management
 * 
 * Memory Levels:
 * 1. Immediate - Last 5 messages (in-memory)
 * 2. Session - Current conversation (Redis/Supabase)
 * 3. User - User preferences and history (Database)
 * 4. Global - Shared knowledge base (RAG)
 * 
 * Features:
 * - Intelligent context compression
 * - Forgetting mechanism (LRU/priority-based)
 * - Memory retrieval based on relevance
 * - Session state management
 */

import { createClient } from '@/lib/auth/server';
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface SessionState {
    sessionId: string;
    userId: string;
    agentType: string;
    createdAt: Date;
    updatedAt: Date;
    context: Record<string, any>;
    messageHistory: Message[];
}

export interface UserMemory {
    userId: string;
    preferences: Record<string, any>;
    conversationHistory: SessionState[];
    learningProgress: Record<string, any>;
    lastActive: Date;
}

// ============================================================================
// Hierarchical Memory Class
// ============================================================================

export class HierarchicalMemory {
    // Default limits - can be overridden by tier
    private defaultMaxMessages = 10; // Free tier default

    // ========================================================================
    // Level 1: Immediate Memory (In-Memory Cache)
    // ========================================================================

    /**
     * Get max messages based on tier
     */
    private async getMaxMessagesForTier(tier?: string): Promise<number> {
        // Import dynamically to avoid circular dependency
        const { TIER_LIMITS } = await import('@/lib/auth/user-tier');

        // Validate tier, default to 'free'
        const validTier = tier && ['free', 'pro', 'enterprise'].includes(tier) ? tier : 'free';

        // Type-safe lookup
        const limits = TIER_LIMITS[validTier as keyof typeof TIER_LIMITS];
        return limits?.maxSessionMessages || this.defaultMaxMessages;
    }

    /**
     * Add message to immediate memory (DATABASE-BACKED)
     * Persists to agent_states table for cross-refresh persistence
     * @param sessionId - Session identifier
     * @param message - Message to save
     * @param tier - User tier for determining limits (optional, defaults to 'free')
     * @param client - Optional Supabase client
     * @param agentType - Agent type identifier (optional)
     */
    async addToImmediate(sessionId: string, message: Message, tier?: string, client?: SupabaseClient, agentType?: string): Promise<void> {
        const supabase = client || await createClient();
        const maxMessages = await this.getMaxMessagesForTier(tier);

        try {
            // Get MAX step_number for this session (not COUNT, to avoid duplicates)
            const { data: maxData, error: maxError } = await supabase
                .from('agent_states')
                .select('step_number')
                .eq('session_id', sessionId)
                .eq('step_type', 'context_message')
                .order('step_number', { ascending: false })
                .limit(1)
                .single();

            // If no messages exist, start at 0, otherwise MAX + 1
            const stepNumber = maxError ? 0 : (maxData?.step_number ?? -1) + 1;

            // Save to database with agent_type
            const { error: insertError } = await supabase.from('agent_states').insert({
                session_id: sessionId,
                step_number: stepNumber,
                step_type: 'context_message',  // Special type for session context
                agent_type: agentType || null, // NEW: Track which agent created this message
                state_data: {
                    role: message.role,
                    content: message.content,
                    timestamp: message.timestamp.toISOString(),
                    metadata: message.metadata
                }
            });

            if (insertError) {
                console.error('[HierarchicalMemory] Insert error:', insertError);
                throw insertError;
            }

            console.log(`[HierarchicalMemory] ✅ Saved message #${stepNumber} (max: ${maxMessages}) to session ${sessionId.substring(0, 8)}`);

            // Keep only last N messages based on tier (cleanup old ones)
            if (stepNumber >= maxMessages) {
                const { data: oldMessages } = await supabase
                    .from('agent_states')
                    .select('id')
                    .eq('session_id', sessionId)
                    .eq('step_type', 'context_message')
                    .order('step_number', { ascending: true })
                    .limit(stepNumber - maxMessages + 1);

                if (oldMessages && oldMessages.length > 0) {
                    const idsToDelete = oldMessages.map(m => m.id);
                    await supabase
                        .from('agent_states')
                        .delete()
                        .in('id', idsToDelete);
                    console.log(`[HierarchicalMemory] 🧹 Cleaned up ${idsToDelete.length} old messages`);
                }
            }
        } catch (error) {
            console.error('[HierarchicalMemory] addToImmediate failed:', error);
            // Don't throw - make it non-blocking
        }
    }

    /**
     * Get immediate memory for session (FROM DATABASE)
     * Retrieves last N messages from agent_states based on tier
     * @param sessionId - Session identifier
     * @param tier - User tier for determining limits (optional, defaults to 'free')
     */
    async getImmediate(sessionId: string, tier?: string, client?: SupabaseClient): Promise<Message[]> {
        const supabase = client || await createClient();
        const maxMessages = await this.getMaxMessagesForTier(tier);

        const { data, error } = await supabase
            .from('agent_states')
            .select('*')
            .eq('session_id', sessionId)
            .eq('step_type', 'context_message')
            .order('step_number', { ascending: true })
            .limit(maxMessages);

        if (error || !data) {
            return [];
        }

        return data.map((item: any) => ({
            role: item.state_data?.role || 'user',
            content: item.state_data?.content || '',
            timestamp: new Date(item.state_data?.timestamp || item.created_at),
            metadata: item.state_data?.metadata
        }));
    }

    /**
     * Clear immediate memory for session (FROM DATABASE)
     */
    async clearImmediate(sessionId: string): Promise<void> {
        const supabase = await createClient();

        await supabase
            .from('agent_states')
            .delete()
            .eq('session_id', sessionId)
            .eq('step_type', 'context_message');
    }

    // ========================================================================
    // Level 2: Session Memory (Database)
    // ========================================================================

    /**
     * Ensure session exists (create if missing)
     */
    async ensureSession(sessionId: string, userId: string, agentType: string = 'general', client?: SupabaseClient): Promise<void> {
        const supabase = client || await createClient();

        // Check if exists
        const { data } = await supabase
            .from('sessions')
            .select('id')
            .eq('id', sessionId)
            .single();

        if (!data) {
            console.log(`[HierarchicalMemory] Creating new session record: ${sessionId}`);
            await supabase.from('sessions').insert({
                id: sessionId,
                user_id: userId,
                agent_type: agentType,
                context: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
    }

    /**
     * Create new session
     */
    async createSession(params: {
        userId: string;
        agentType: string;
        context?: Record<string, any>;
    }): Promise<SessionState> {
        const supabase = await createClient();
        const sessionId = this.generateSessionId();

        const session: SessionState = {
            sessionId,
            userId: params.userId,
            agentType: params.agentType,
            createdAt: new Date(),
            updatedAt: new Date(),
            context: params.context || {},
            messageHistory: []
        };

        // Save to database
        await supabase.from('sessions').insert({
            id: sessionId,
            user_id: params.userId,
            agent_type: params.agentType,
            context: params.context || {},
            created_at: session.createdAt.toISOString(),
            updated_at: session.updatedAt.toISOString()
        });

        return session;
    }

    /**
     * Load session state
     */
    async loadSession(sessionId: string): Promise<SessionState | null> {
        const supabase = await createClient();

        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            return null;
        }

        // Load message history
        const { data: messages } = await supabase
            .from('agent_states')
            .select('*')
            .eq('session_id', sessionId)
            .order('step_number', { ascending: true });

        return {
            sessionId: session.id,
            userId: session.user_id,
            agentType: session.agent_type,
            createdAt: new Date(session.created_at),
            updatedAt: new Date(session.updated_at),
            context: session.context || {},
            messageHistory: (messages || []).map((m: any) => ({
                role: m.state_data?.role || 'assistant',
                content: m.state_data?.content || '',
                timestamp: new Date(m.created_at),
                metadata: m.state_data?.metadata
            }))
        };
    }

    /**
     * Update session state
     */
    async updateSession(
        sessionId: string,
        updates: Partial<SessionState>
    ): Promise<void> {
        const supabase = await createClient();

        await supabase
            .from('sessions')
            .update({
                context: updates.context,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId);

        // Add new messages if any
        if (updates.messageHistory && updates.messageHistory.length > 0) {
            const currentSession = await this.loadSession(sessionId);
            const currentCount = currentSession?.messageHistory.length || 0;

            for (let i = 0; i < updates.messageHistory.length; i++) {
                const message = updates.messageHistory[i];

                await supabase.from('agent_states').insert({
                    session_id: sessionId,
                    step_number: currentCount + i,
                    step_type: 'message',
                    state_data: {
                        role: message.role,
                        content: message.content,
                        metadata: message.metadata
                    }
                });
            }
        }
    }

    // ========================================================================
    // Level 3: User Memory (Long-term Preferences)
    // ========================================================================

    /**
     * Load user memory
     */
    async loadUserMemory(userId: string): Promise<UserMemory | null> {
        const supabase = await createClient();

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!profile) return null;

        // Get recent sessions
        const { data: sessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(10);

        const conversationHistory = await Promise.all(
            (sessions || []).map((s: any) => this.loadSession(s.id))
        ).then(results => results.filter(Boolean) as SessionState[]);

        return {
            userId,
            preferences: profile.metadata?.preferences || {},
            conversationHistory,
            learningProgress: profile.metadata?.learning_progress || {},
            lastActive: new Date(profile.updated_at)
        };
    }

    /**
     * Update user preferences
     */
    async updateUserPreferences(
        userId: string,
        preferences: Record<string, any>
    ): Promise<void> {
        const supabase = await createClient();

        const { data: profile } = await supabase
            .from('profiles')
            .select('metadata')
            .eq('id', userId)
            .single();

        const metadata = profile?.metadata || {};
        metadata.preferences = {
            ...metadata.preferences,
            ...preferences
        };

        await supabase
            .from('profiles')
            .update({ metadata })
            .eq('id', userId);
    }

    // ========================================================================
    // Context Compression
    // ========================================================================

    /**
     * Compress long conversation history
     */
    async compressContext(messages: Message[], maxTokens: number = 2000): Promise<{
        compressed: Message[];
        summary: string;
        originalCount: number;
        compressedCount: number;
    }> {
        // Keep first message (system) and last N messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const recentMessages = messages.slice(-5);

        // Create summary of removed messages
        const removedMessages = messages.slice(
            systemMessages.length,
            messages.length - recentMessages.length
        );

        const summary = removedMessages.length > 0
            ? `[Earlier conversation: ${removedMessages.length} messages discussing ${this.extractTopics(removedMessages)}]`
            : '';

        const compressed = [
            ...systemMessages,
            ...(summary ? [{
                role: 'system' as const,
                content: summary,
                timestamp: new Date(),
                metadata: { compressed: true }
            }] : []),
            ...recentMessages
        ];

        return {
            compressed,
            summary,
            originalCount: messages.length,
            compressedCount: compressed.length
        };
    }

    /**
     * Extract main topics from messages
     */
    private extractTopics(messages: Message[]): string {
        // Simple keyword extraction
        const text = messages.map(m => m.content).join(' ');
        const words = text.toLowerCase().split(/\s+/);
        const wordCounts = new Map<string, number>();

        words.forEach(word => {
            if (word.length > 5) { // Filter short words
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        });

        const topWords = Array.from(wordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([word]) => word);

        return topWords.join(', ');
    }

    // ========================================================================
    // Utilities
    // ========================================================================

    /**
     * Generate session ID
     */
    private generateSessionId(): string {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Calculate total tokens in messages
     */
    estimateTokens(messages: Message[]): number {
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        return Math.ceil(totalChars / 4); // Rough estimate: 1 token ≈ 4 chars
    }

    /**
     * Get context summary
     */
    getContextSummary(session: SessionState): string {
        return `Session ${session.sessionId} (${session.agentType}) - ${session.messageHistory.length} messages`;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const hierarchicalMemory = new HierarchicalMemory();

export default HierarchicalMemory;
