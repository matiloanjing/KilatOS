/**
 * KilatApp - Base Interface for All Agents
 * 
 * Every agent in KilatOS must implement this interface.
 * This is the "App Protocol" - like iOS apps.
 * 
 * Philosophy:
 * - Simple interface, powerful implementation
 * - Each app is self-contained
 * - OS just routes and manages
 * 
 * Copyright © 2026 KilatCode Studio
 */

// ============================================================================
// Response Types
// ============================================================================

export type KilatResponseType = 'text' | 'code' | 'image' | 'math' | 'mixed' | 'error' | 'files' | 'redirect';

export interface KilatResponse {
    success: boolean;
    type: KilatResponseType;
    content: string | object;

    // Optional structured data (critical for files/WebContainer)
    data?: any;

    // Optional metadata
    metadata?: {
        agent: string;
        executionTime?: number;
        tokensUsed?: number;
        model?: string;
        files?: Array<{ name: string; content: string; language?: string }>;
        [key: string]: any;
    };
}

// ============================================================================
// Context Types
// ============================================================================

export interface KilatContext {
    userId?: string;
    sessionId?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    /**
     * Optional callback for reporting progress back to the OS/Queue
     */
    onProgress?: (progress: number, message: string) => Promise<void>;
    /**
     * RAG context from knowledge base (auto-injected by KilatOS)
     */
    ragContext?: string;
    preferences?: {
        language?: string;       // 'id' | 'en'
        codeStyle?: string;      // 'typescript' | 'javascript' | etc
        verbosity?: 'brief' | 'detailed';
    };
    [key: string]: any;
}

// ============================================================================
// KilatApp Interface (Every Agent Must Implement)
// ============================================================================

export interface KilatApp {
    // Identity
    readonly name: string;              // "KilatCode"
    readonly description: string;       // "Generate production-ready code"
    readonly icon?: string;             // "💻"
    readonly version?: string;          // "2.0.0"

    // Trigger words for auto-routing
    readonly triggers: string[];        // ["buat", "code", "program", "generate"]

    // Capabilities
    readonly capabilities?: string[];   // ["code", "test", "lint"]

    /**
     * Check if this app can handle the input
     * Used by OS for routing decisions
     */
    canHandle(input: string): boolean;

    /**
     * Get routing confidence score (0-100)
     * Higher = more confident this app should handle
     */
    getConfidence?(input: string): number;

    /**
     * Execute the main functionality
     * This is where the magic happens
     */
    execute(input: string, context?: KilatContext): Promise<KilatResponse>;

    /**
     * Get app info for display
     */
    getInfo?(): { name: string; description: string; icon?: string };
}

// ============================================================================
// Base Implementation (Optional helper class)
// ============================================================================

export abstract class BaseKilatApp implements KilatApp {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly triggers: string[];

    readonly icon?: string;
    readonly version?: string = '1.0.0';
    readonly capabilities?: string[];

    /**
     * Default canHandle - checks triggers
     */
    canHandle(input: string): boolean {
        const lower = input.toLowerCase();
        return this.triggers.some(trigger => lower.includes(trigger));
    }

    /**
     * Default confidence based on trigger matches
     */
    getConfidence(input: string): number {
        const lower = input.toLowerCase();
        const matches = this.triggers.filter(t => lower.includes(t));
        return Math.min(matches.length * 25, 100);
    }

    /**
     * Get basic info
     */
    getInfo() {
        return {
            name: this.name,
            description: this.description,
            icon: this.icon
        };
    }

    /**
     * Abstract execute - must be implemented
     */
    abstract execute(input: string, context?: KilatContext): Promise<KilatResponse>;

    /**
     * Helper: Create success response
     */
    protected success(content: string | object, type: KilatResponseType = 'text'): KilatResponse {
        return {
            success: true,
            type,
            content,
            metadata: { agent: this.name }
        };
    }

    /**
     * Helper: Create error response
     */
    protected error(message: string): KilatResponse {
        return {
            success: false,
            type: 'error',
            content: message,
            metadata: { agent: this.name }
        };
    }
}

// ============================================================================
// Export
// ============================================================================

export default KilatApp;
