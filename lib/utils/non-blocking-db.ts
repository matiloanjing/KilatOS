/**
 * Non-Blocking Database Operations
 * Fire-and-forget pattern for latency-sensitive paths
 * 
 * Uses Vercel's waitUntil when available, falls back to Promise.resolve()
 * 
 * Copyright © 2026 KilatCode Studio
 */

// Try to import waitUntil from Vercel (only works in Vercel environment)
let vercelWaitUntil: ((promise: Promise<any>) => void) | null = null;

// Background task queue for non-blocking operations
const backgroundTasks: Promise<any>[] = [];

/**
 * Fire-and-forget wrapper for non-critical DB operations
 * 
 * Usage:
 * ```
 * // Instead of: await saveGeneratedCode(data);
 * fireAndForget(() => saveGeneratedCode(data));
 * ```
 * 
 * @param fn - Async function to run in background
 */
export function fireAndForget(fn: () => Promise<any>): void {
    const promise = fn().catch((error) => {
        console.error('[Non-Blocking DB] Background task failed:', error);
        // Don't rethrow - this is fire-and-forget
    });

    // Track for cleanup if needed
    backgroundTasks.push(promise);

    // Clean up completed tasks periodically
    if (backgroundTasks.length > 10) {
        Promise.allSettled(backgroundTasks.slice(0, 5)).then(() => {
            backgroundTasks.splice(0, 5);
        });
    }
}

/**
 * Wait for all pending background tasks (useful for graceful shutdown)
 */
export async function waitForBackgroundTasks(): Promise<void> {
    await Promise.allSettled(backgroundTasks);
    backgroundTasks.length = 0;
}

/**
 * Get count of pending background tasks
 */
export function getPendingTaskCount(): number {
    return backgroundTasks.length;
}
