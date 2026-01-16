/**
 * AI Rate Limiter
 * Protects from IP ban by Cloudflare WAF
 * 
 * Features:
 * - Token bucket algorithm
 * - Configurable limits per tier
 * - Concurrent request control
 * - Real-time status monitoring
 * 
 * Copyright © 2026 KilatOS
 */

export interface RateLimitConfig {
    maxRequestsPerSecond: number;
    maxConcurrent: number;
    cooldownMs: number;
    burstAllowance?: number;
}

export class AIRateLimiter {
    private requestTimes: number[] = [];
    private activeRequests = 0;
    private config: RateLimitConfig;
    private lastResetTime = Date.now();

    constructor(config: Partial<RateLimitConfig> = {}) {
        this.config = {
            maxRequestsPerSecond: config.maxRequestsPerSecond || 8,  // Increased for multi-agent
            maxConcurrent: config.maxConcurrent || 6,                // 4 agents + orchestrator + merger
            cooldownMs: config.cooldownMs || 1000,
            burstAllowance: config.burstAllowance || 3
        };
    }

    /**
     * Wait until safe to make request
     * Implements token bucket algorithm with burst allowance
     */
    async waitForSlot(): Promise<void> {
        const startWait = Date.now();

        while (!this.canProceed()) {
            // Clean old timestamps
            this.cleanOldTimestamps();

            // Wait for cooldown period
            await new Promise(resolve =>
                setTimeout(resolve, this.config.cooldownMs / 10)
            );

            // Prevent infinite loop
            if (Date.now() - startWait > 30000) {
                throw new Error('Rate limiter timeout after 30s');
            }
        }

        // Acquire slot
        this.requestTimes.push(Date.now());
        this.activeRequests++;
    }

    /**
     * Release slot after request completion
     */
    releaseSlot(): void {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
    }

    /**
     * Check if can proceed with request
     */
    private canProceed(): boolean {
        this.cleanOldTimestamps();

        const requestsInWindow = this.requestTimes.length;
        const maxAllowed = this.config.maxRequestsPerSecond +
            (this.config.burstAllowance || 0);

        return (
            requestsInWindow < maxAllowed &&
            this.activeRequests < this.config.maxConcurrent
        );
    }

    /**
     * Clean timestamps older than 1 second
     */
    private cleanOldTimestamps(): void {
        const now = Date.now();
        this.requestTimes = this.requestTimes.filter(
            time => now - time < 1000
        );
    }

    /**
     * Get current limiter status
     */
    getStatus() {
        this.cleanOldTimestamps();

        return {
            requestsLastSecond: this.requestTimes.length,
            activeRequests: this.activeRequests,
            canProceed: this.canProceed(),
            config: this.config,
            utilization: {
                requests: `${this.requestTimes.length}/${this.config.maxRequestsPerSecond}`,
                concurrent: `${this.activeRequests}/${this.config.maxConcurrent}`
            }
        };
    }

    /**
     * Reset limiter (for testing or daily reset)
     */
    reset(): void {
        this.requestTimes = [];
        this.activeRequests = 0;
        this.lastResetTime = Date.now();
    }

    /**
     * Update configuration dynamically
     */
    updateConfig(newConfig: Partial<RateLimitConfig>): void {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const rateLimiter = new AIRateLimiter();

export default AIRateLimiter;
