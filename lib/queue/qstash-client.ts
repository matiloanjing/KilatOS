/**
 * QStash Client for Background Job Processing
 * 
 * Uses Upstash QStash to run long-running jobs outside Vercel Lambda timeout.
 * Supports 15min+ execution with automatic retries.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { Client, Receiver } from '@upstash/qstash';

// ============================================================================
// QSTASH CLIENT (Lazy Initialization - reads env vars at runtime)
// ============================================================================

let _qstashClient: Client | null = null;
let _qstashReceiver: Receiver | null = null;

/**
 * Get the QStash client instance (lazy initialization)
 * This ensures QSTASH_TOKEN is read at runtime, not build time
 */
export function getQStashClient(): Client {
    if (!_qstashClient) {
        const token = process.env.QSTASH_TOKEN;
        if (!token) {
            console.warn('⚠️ QSTASH_TOKEN not set - background jobs will fall back to fire-and-forget');
        }
        _qstashClient = new Client({
            token: token || '',
        });
        console.log('🔧 [QStash] Client initialized at runtime, token exists:', !!token);
    }
    return _qstashClient;
}

/**
 * Get the QStash Receiver instance (lazy initialization)
 * This ensures signing keys are read at runtime, not build time
 */
export function getQStashReceiver(): Receiver {
    if (!_qstashReceiver) {
        _qstashReceiver = new Receiver({
            currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
            nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
        });
    }
    return _qstashReceiver;
}

// Legacy exports for backward compatibility (will trigger lazy init)
export const qstash = {
    get publishJSON() {
        return getQStashClient().publishJSON.bind(getQStashClient());
    }
};

export const qstashReceiver = {
    get verify() {
        return getQStashReceiver().verify.bind(getQStashReceiver());
    }
};

// ============================================================================
// JOB PAYLOAD TYPE
// ============================================================================

export interface QStashJobPayload {
    jobId: string;
    message: string;
    mode: 'planning' | 'fast';
    selectedModel: string;
    sessionId?: string;
    userId: string;
    agentType: string;
    attachments?: any[];
    authToken?: string; // For RLS-scoped Supabase client
}

// ============================================================================
// HELPER: Publish Job to QStash
// ============================================================================

/**
 * Publish a job to QStash for background processing
 * Returns messageId if successful, null if fallback to fire-and-forget
 */
export async function publishJobToQStash(
    payload: QStashJobPayload,
    baseUrl: string
): Promise<{ messageId: string | null; fallback: boolean }> {
    // Check if QStash is configured
    const token = process.env.QSTASH_TOKEN;
    console.log('🔍 [QStash publishJobToQStash] Token exists:', !!token, 'length:', token?.length || 0);

    if (!token) {
        console.warn('⚠️ QStash not configured, using fallback');
        return { messageId: null, fallback: true };
    }

    try {
        const targetUrl = `${baseUrl}/api/kilat/process-job`;
        console.log('🔍 [QStash publishJobToQStash] Target URL:', targetUrl);
        console.log('🔍 [QStash publishJobToQStash] Payload jobId:', payload.jobId);

        // Use lazy-initialized client
        const client = getQStashClient();

        const response = await client.publishJSON({
            url: targetUrl,
            body: payload,
            retries: 3,
            // Callback on completion (optional - for monitoring)
            // callback: `${baseUrl}/api/kilat/job-callback`,
            // 15 minute timeout (QStash max)
            timeout: '15m',
        });

        console.log(`✅ Job ${payload.jobId} queued to QStash: ${response.messageId}`);
        return { messageId: response.messageId, fallback: false };
    } catch (error) {
        const err = error as any;
        console.error('❌ QStash publish failed:', {
            name: err?.name,
            message: err?.message,
            status: err?.status,
            statusCode: err?.statusCode,
            body: err?.body,
            response: err?.response,
            stack: err?.stack?.slice(0, 500)
        });
        return { messageId: null, fallback: true };
    }
}

// ============================================================================
// HELPER: Verify QStash Webhook Signature
// ============================================================================

/**
 * Verify that the request came from QStash (not a random attacker)
 */
export async function verifyQStashSignature(
    signature: string,
    body: string
): Promise<boolean> {
    if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
        console.warn('⚠️ QStash signing keys not configured, skipping verification');
        return true; // Allow in dev mode
    }

    try {
        // Use lazy-initialized receiver
        const receiver = getQStashReceiver();
        const isValid = await receiver.verify({
            signature,
            body,
        });
        return isValid;
    } catch (error) {
        console.error('❌ QStash signature verification failed:', error);
        return false;
    }
}
