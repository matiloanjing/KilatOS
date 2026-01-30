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
let _cachedTokenLength: number = 0;

/**
 * Get the QStash client instance (lazy initialization)
 * Only caches if token is valid - prevents caching empty token on cold start
 */
export function getQStashClient(): Client {
    const token = process.env.QSTASH_TOKEN;
    const tokenLength = token?.length || 0;

    // Log every time for debugging
    console.log('🔧 [QStash getClient] Token exists:', !!token, 'length:', tokenLength);

    if (!token) {
        console.error('❌ [QStash] QSTASH_TOKEN is empty/undefined!');
        // Return new client (will fail on use) - don't cache
        return new Client({ token: '' });
    }

    // Recreate if no client or token changed (shouldn't happen but safety net)
    if (!_qstashClient || tokenLength !== _cachedTokenLength) {
        _qstashClient = new Client({ token });
        _cachedTokenLength = tokenLength;
        console.log('✅ [QStash] Client initialized, token length:', tokenLength);
    }

    return _qstashClient;
}

let _receiverKeyHash: string = '';

/**
 * Get the QStash Receiver instance (lazy initialization)
 * Only caches if signing keys are valid - prevents caching empty keys on cold start
 */
export function getQStashReceiver(): Receiver {
    const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
    const keyHash = `${currentKey?.length || 0}-${nextKey?.length || 0}`;

    // Log every time for debugging
    console.log('🔧 [QStash getReceiver] Current key exists:', !!currentKey, 'length:', currentKey?.length || 0);
    console.log('🔧 [QStash getReceiver] Next key exists:', !!nextKey, 'length:', nextKey?.length || 0);

    if (!currentKey || !nextKey) {
        console.error('❌ [QStash] Signing keys empty! QSTASH_CURRENT_SIGNING_KEY or QSTASH_NEXT_SIGNING_KEY not set');
        // Return new receiver with empty keys (will fail verification) - don't cache
        return new Receiver({
            currentSigningKey: '',
            nextSigningKey: '',
        });
    }

    // Recreate if no receiver or keys changed
    if (!_qstashReceiver || keyHash !== _receiverKeyHash) {
        _qstashReceiver = new Receiver({
            currentSigningKey: currentKey,
            nextSigningKey: nextKey,
        });
        _receiverKeyHash = keyHash;
        console.log('✅ [QStash] Receiver initialized, key lengths:', currentKey.length, nextKey.length);
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
