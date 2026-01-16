/**
 * Groq API Provider
 * 
 * Features:
 * - FREE tier (14,000 requests/day!)
 * - Super fast inference (~0.3s response time)
 * - Multiple models (Llama, Mixtral, Whisper)
 * - Perfect for light tasks and fallback
 * 
 * Models Available:
 * - llama-3.3-70b-versatile (Smart, versatile) [Updated from 3.1]
 * - llama-3.1-8b-instant (Super fast!)
 * - mixtral-8x7b-32768 (Multilingual, long context)
 * - whisper-large-v3 (Audio transcription)
 * 
 * Get API key: https://console.groq.com
 * 
 * Copyright © 2026 KilatOS
 */

export interface GroqRequest {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface GroqResponse {
    content: string;
    model: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: string;
}

export class GroqProvider {
    private apiKey: string;
    private baseURL = 'https://api.groq.com/openai/v1';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GROQ_API_KEY || '';

        if (!this.apiKey) {
            console.warn('⚠️ Groq API key not found. Set GROQ_API_KEY environment variable.');
        }
    }

    /**
     * Call Groq chat completion API
     */
    async call(request: GroqRequest): Promise<GroqResponse> {
        if (!this.apiKey) {
            throw new Error('Groq API key not configured');
        }

        const model = request.model || 'llama-3.3-70b-versatile';

        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: request.prompt }],
                temperature: request.temperature || 0.7,
                max_tokens: request.maxTokens || 2048,
                stream: request.stream || false
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq API error (${response.status}): ${error}`);
        }

        const data = await response.json();

        return {
            content: data.choices[0].message.content,
            model: data.model,
            usage: {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens
            },
            finishReason: data.choices[0].finish_reason
        };
    }

    /**
     * Transcribe audio using Whisper model
     * 
     * @param audioFile - Audio file (mp3, wav, m4a, etc.)
     * @param language - Optional language code (e.g., 'id' for Indonesian)
     */
    async transcribe(
        audioFile: File | Blob,
        language?: string
    ): Promise<{ text: string; language: string; duration: number }> {
        if (!this.apiKey) {
            throw new Error('Groq API key not configured');
        }

        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('model', 'whisper-large-v3');
        if (language) {
            formData.append('language', language);
        }

        const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq transcription error (${response.status}): ${error}`);
        }

        const data = await response.json();

        return {
            text: data.text,
            language: data.language || language || 'unknown',
            duration: data.duration || 0
        };
    }

    /**
     * Get available models
     */
    async getModels() {
        if (!this.apiKey) {
            return [];
        }

        const response = await fetch(`${this.baseURL}/models`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.data;
        }

        return [];
    }

    /**
     * Check if API key is valid
     */
    async validateApiKey(): Promise<boolean> {
        try {
            await this.getModels();
            return true;
        } catch {
            return false;
        }
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const groqProvider = new GroqProvider();

export default GroqProvider;
