/**
 * Retry Handler - "The Cambuk Digital"
 * 
 * Features:
 * - Exponential backoff strategy
 * - Configurable max retries
 * - Quality validation
 * - Detailed error logging
 * 
 * Pattern: Recursive retry with increasing delays
 * 
 * Copyright © 2026 KilatOS
 */

export interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterMs?: number;
}

export interface RetryStats {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
    averageAttempts: number;
}

export class RetryHandler {
    private config: RetryConfig;
    private stats: RetryStats = {
        totalAttempts: 0,
        successfulRetries: 0,
        failedRetries: 0,
        averageAttempts: 0
    };

    constructor(config: Partial<RetryConfig> = {}) {
        this.config = {
            maxRetries: config.maxRetries || 3,
            initialDelayMs: config.initialDelayMs || 1000,
            maxDelayMs: config.maxDelayMs || 10000,
            backoffMultiplier: config.backoffMultiplier || 2,
            jitterMs: config.jitterMs || 100
        };
    }

    /**
     * Execute function with retry logic
     * 
     * @param fn - Function to execute
     * @param validator - Optional validation function
     * @param attempt - Current attempt number (for recursion)
     * @returns Promise with result
     */
    async executeWithRetry<T>(
        fn: () => Promise<T>,
        validator?: (result: T) => boolean,
        attempt = 1
    ): Promise<T> {
        this.stats.totalAttempts++;

        try {
            console.log(`👷 AI Mandor: Attempt ${attempt}/${this.config.maxRetries}...`);

            const result = await fn();

            // Quality validation
            if (validator && !validator(result)) {
                throw new Error('Result quality check failed');
            }

            // Success!
            if (attempt > 1) {
                this.stats.successfulRetries++;
                console.log(`✅ Success after ${attempt} attempts!`);
            } else {
                console.log('✅ Success on first attempt!');
            }

            this.updateAverageAttempts(attempt);
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            console.error(`💥 Attempt ${attempt} failed: ${errorMessage}`);

            // Check if should retry
            if (attempt >= this.config.maxRetries) {
                this.stats.failedRetries++;
                console.error(`🚫 Max retries (${this.config.maxRetries}) reached. Giving up.`);
                throw new Error(
                    `Failed after ${this.config.maxRetries} attempts: ${errorMessage}`
                );
            }

            // Calculate delay with exponential backoff + jitter
            const baseDelay = this.config.initialDelayMs *
                Math.pow(this.config.backoffMultiplier, attempt - 1);
            const jitter = Math.random() * (this.config.jitterMs || 0);
            const delay = Math.min(baseDelay + jitter, this.config.maxDelayMs);

            console.log(`🔄 Retrying in ${Math.round(delay)}ms... (exponential backoff)`);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Recursive retry (The Whip! 🤠💥)
            return this.executeWithRetry(fn, validator, attempt + 1);
        }
    }

    /**
     * Execute with automatic error categorization
     */
    async executeWithSmartRetry<T>(
        fn: () => Promise<T>,
        validator?: (result: T) => boolean
    ): Promise<T> {
        return this.executeWithRetry(
            fn,
            validator,
            1
        );
    }

    /**
     * Update average attempts metric
     */
    private updateAverageAttempts(attempts: number): void {
        const total = this.stats.successfulRetries + this.stats.failedRetries + 1;
        this.stats.averageAttempts =
            (this.stats.averageAttempts * (total - 1) + attempts) / total;
    }

    /**
     * Get retry statistics
     */
    getStats(): RetryStats {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
            averageAttempts: 0
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<RetryConfig>): void {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const retryHandler = new RetryHandler();

export default RetryHandler;
