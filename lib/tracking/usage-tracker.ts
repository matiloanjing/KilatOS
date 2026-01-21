/**
 * Usage Tracking Service
 * Logs ALL agent usage to Supabase for analytics & ML learning
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/db/types';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

// ============================================================================
// Types
// ============================================================================

export interface UsageLogData {
    // User context
    userId?: string;
    sessionId?: string;

    // Agent info
    agentType: string;
    agentVersion?: string;

    // Task info
    taskInput: string;
    taskComplexity: 'light' | 'medium' | 'heavy';
    taskCategory?: string;

    // Optimization info
    baseTemplateUsed: string;
    enhancementsApplied: string[];
    qualityChecksRun: string[];
    provenPatternsUsed?: string[];

    // Execution info
    aiProvider: string;
    modelUsed: string;
    priority: 'high' | 'normal' | 'low';

    // Results
    success: boolean;
    outputText?: string;
    qualityScore: number;
    validationPassed: boolean;
    failedQualityChecks?: string[];

    // Performance
    latencyMs: number;
    tokensInput?: number;
    tokensOutput?: number;
    costUsd?: number;
    retries?: number;
}

export interface FeedbackData {
    requestId: string;
    userRating: number; // 1-5
    userFeedback?: string;
    userAccepted?: boolean;
}

export interface AnalyticsQuery {
    agentType?: string;
    startDate: Date;
    endDate: Date;
    groupBy?: 'hour' | 'day' | 'week';
}

// ============================================================================
// Usage Tracker Class
// ============================================================================

export class UsageTracker {
    // Using 'any' for supabase client because agent_usage_logs table 
    // is not in the generated Database types. This is a tracking service
    // that works at runtime but TypeScript doesn't have the schema.
    private supabase: any;
    private isInitialized = false;

    constructor() {
        // Only initialize on server-side
        if (typeof window === 'undefined') {
            this.supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server
            );
            this.isInitialized = true;
        }
    }

    // ==========================================================================
    // Core Tracking Methods
    // ==========================================================================

    /**
     * Log agent usage
     * This is the main entry point for all agent tracking
     */
    async logUsage(data: UsageLogData): Promise<string> {
        if (!this.isInitialized) {
            console.warn('UsageTracker not initialized (client-side)');
            return 'client-side-skip';
        }

        const requestId = uuidv4();

        try {
            // Cost Calculation Logic (Auto-Fill if 0/undefined)
            let finalCost = data.costUsd || 0;

            if (finalCost === 0 && data.modelUsed) {
                // Fetch pricing from llm_models database (DYNAMIC - not hardcoded!)
                try {
                    const { data: modelData } = await this.supabase
                        .from('llm_models')
                        .select('cost_per_request, input_cost_per_m, output_cost_per_m, model_type')
                        .or(`model_id.ilike.%${data.modelUsed}%,display_name.ilike.%${data.modelUsed}%`)
                        .limit(1)
                        .single();

                    if (modelData) {
                        if (modelData.model_type === 'image') {
                            // Image models: use cost_per_request
                            finalCost = parseFloat(modelData.cost_per_request) || 0;
                        } else {
                            // Text models: calculate from input/output tokens
                            const inputCostPerM = parseFloat(modelData.input_cost_per_m) || 0;
                            const outputCostPerM = parseFloat(modelData.output_cost_per_m) || 0;

                            const inTokens = data.tokensInput || (data.taskInput?.length || 0) * 0.25;
                            const outTokens = data.tokensOutput || (data.outputText?.length || 0) * 0.25;

                            finalCost = ((inTokens / 1_000_000) * inputCostPerM) +
                                ((outTokens / 1_000_000) * outputCostPerM);

                            // Minimum cost per request if token-based is 0
                            if (finalCost === 0) {
                                finalCost = parseFloat(modelData.cost_per_request) || 0;
                            }
                        }
                    }
                } catch (dbError) {
                    // Fallback: estimate based on model name patterns
                    console.warn('⚠️ [UsageTracker] Failed to fetch model pricing from DB:', dbError);

                    // Basic fallback estimates (only used if DB fails)
                    if (data.modelUsed.includes('flux') || data.modelUsed.includes('image')) {
                        finalCost = 0.04; // Image default
                    } else if (data.modelUsed.includes('groq') || data.modelUsed.includes('llama')) {
                        finalCost = 0; // Groq is free
                    } else {
                        // Estimate for text models: ~$0.075 per 1M input, ~$0.30 per 1M output
                        const inTokens = data.tokensInput || (data.taskInput?.length || 0) * 0.25;
                        const outTokens = data.tokensOutput || (data.outputText?.length || 0) * 0.25;
                        finalCost = ((inTokens / 1_000_000) * 0.075) + ((outTokens / 1_000_000) * 0.30);
                    }
                }
            }

            // Prepare data for insertion
            const logEntry = {
                request_id: requestId,
                user_id: data.userId || null,
                session_id: data.sessionId || null,

                agent_type: data.agentType,
                agent_version: data.agentVersion || '1.0',

                task_input: data.taskInput,
                task_complexity: data.taskComplexity,
                task_category: data.taskCategory || null,

                base_template_used: data.baseTemplateUsed,
                enhancements_applied: data.enhancementsApplied,
                quality_checks_run: data.qualityChecksRun,
                proven_patterns_used: data.provenPatternsUsed || null,

                ai_provider: data.aiProvider,
                model_used: data.modelUsed,
                priority: data.priority,

                success: data.success,
                output_text: await this.compressOutput(data.outputText), // gzip+base64 compressed
                output_hash: this.hashOutput(data.outputText),
                quality_score: data.qualityScore,
                validation_passed: data.validationPassed,
                failed_quality_checks: data.failedQualityChecks || null,

                latency_ms: data.latencyMs,
                tokens_input: data.tokensInput || null,
                tokens_output: data.tokensOutput || null,
                cost_usd: finalCost, // Use calculated cost
                retries: data.retries || 0
            };

            // Insert to database (AWAIT THIS to ensure log is saved)
            const { error } = await this.supabase!
                .from('agent_usage_logs')
                .insert(logEntry);

            if (error) {
                console.error('❌ Failed to log usage:', error.message);
            } else {
                console.log(`✅ Usage logged: ${requestId} (${data.agentType})`);
            }

            // Async: Update aggregated metrics (can remain fire and forget)
            this.updateAggregatedMetrics(data).catch(e =>
                console.error('Failed to update metrics:', e.message)
            );

            // Async: Update enhancement rules performance
            this.updateEnhancementPerformance(data).catch(e =>
                console.error('Failed to update enhancement perf:', e.message)
            );

            return requestId;

        } catch (error) {
            console.error('❌ Usage tracking error:', error);
            return requestId; // Return ID even if logging fails
        }
    }

    /**
     * Log user feedback
     */
    async logFeedback(data: FeedbackData): Promise<void> {
        if (!this.isInitialized) return;

        try {
            const { error } = await this.supabase
                .from('agent_usage_logs')
                .update({
                    user_rating: data.userRating,
                    user_feedback: data.userFeedback || null,
                    user_accepted: data.userAccepted !== undefined ? data.userAccepted : null
                })
                .eq('request_id', data.requestId);

            if (error) {
                console.error('Failed to log feedback:', error.message);
            } else {
                console.log(`✅ Feedback logged for: ${data.requestId}`);
            }
        } catch (error) {
            console.error('Feedback logging error:', error);
        }
    }

    // ==========================================================================
    // Aggregated Metrics
    // ==========================================================================

    /**
     * Update hourly aggregated metrics
     */
    private async updateAggregatedMetrics(data: UsageLogData): Promise<void> {
        const timeBucket = this.getHourBucket(new Date());

        // Check if entry exists
        const { data: existing } = await this.supabase
            .from('agent_performance_metrics')
            .select('*')
            .eq('time_bucket', timeBucket)
            .eq('bucket_size', '1hour')
            .eq('agent_type', data.agentType)
            .eq('ai_provider', data.aiProvider)
            .eq('complexity', data.taskComplexity)
            .single();

        if (existing) {
            // Update existing
            const newTotal = existing.total_requests + 1;
            const newSuccessful = existing.successful_requests + (data.success ? 1 : 0);
            const newFailed = existing.failed_requests + (data.success ? 0 : 1);

            // Running average for quality
            const newAvgQuality = (
                (existing.avg_quality_score * existing.total_requests) + data.qualityScore
            ) / newTotal;

            // Running average for latency
            const newAvgLatency = Math.round(
                ((existing.avg_latency_ms * existing.total_requests) + data.latencyMs) / newTotal
            );

            const newTotalCost = (existing.total_cost_usd || 0) + (data.costUsd || 0);

            const newRetryRate = (
                (existing.retry_rate * existing.total_requests) + (data.retries && data.retries > 0 ? 1 : 0)
            ) / newTotal;

            await this.supabase
                .from('agent_performance_metrics')
                .update({
                    total_requests: newTotal,
                    successful_requests: newSuccessful,
                    failed_requests: newFailed,
                    avg_quality_score: newAvgQuality,
                    avg_latency_ms: newAvgLatency,
                    total_cost_usd: newTotalCost,
                    retry_rate: newRetryRate,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

        } else {
            // Insert new
            await this.supabase
                .from('agent_performance_metrics')
                .insert({
                    time_bucket: timeBucket,
                    bucket_size: '1hour',
                    agent_type: data.agentType,
                    ai_provider: data.aiProvider,
                    complexity: data.taskComplexity,
                    total_requests: 1,
                    successful_requests: data.success ? 1 : 0,
                    failed_requests: data.success ? 0 : 1,
                    avg_quality_score: data.qualityScore,
                    avg_latency_ms: data.latencyMs,
                    total_cost_usd: data.costUsd || 0,
                    avg_tokens_input: data.tokensInput || 0,
                    avg_tokens_output: data.tokensOutput || 0,
                    retry_rate: (data.retries && data.retries > 0) ? 1.0 : 0.0
                });
        }
    }

    /**
     * Update enhancement rules performance
     */
    private async updateEnhancementPerformance(data: UsageLogData): Promise<void> {
        // Track each enhancement rule
        for (const ruleName of data.enhancementsApplied) {
            const periodStart = this.getWeekBucket(new Date());
            const periodEnd = new Date(periodStart);
            periodEnd.setDate(periodEnd.getDate() + 7);

            const { data: existing } = await this.supabase
                .from('enhancement_rules_performance')
                .select('*')
                .eq('agent_type', data.agentType)
                .eq('rule_name', ruleName)
                .eq('time_period_start', periodStart.toISOString())
                .single();

            if (existing) {
                // Update
                const newTimesApplied = existing.times_applied + 1;
                const newSuccesses = (existing.success_rate * existing.times_applied) + (data.success ? 1 : 0);
                const newSuccessRate = newSuccesses / newTimesApplied;

                const newAvgQuality = (
                    (existing.avg_quality_score * existing.times_applied) + data.qualityScore
                ) / newTimesApplied;

                await this.supabase
                    .from('enhancement_rules_performance')
                    .update({
                        times_applied: newTimesApplied,
                        success_rate: newSuccessRate,
                        avg_quality_score: newAvgQuality,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

            } else {
                // Insert
                await this.supabase
                    .from('enhancement_rules_performance')
                    .insert({
                        agent_type: data.agentType,
                        rule_name: ruleName,
                        rule_version: '1.0',
                        time_period_start: periodStart.toISOString(),
                        time_period_end: periodEnd.toISOString(),
                        times_applied: 1,
                        success_rate: data.success ? 1.0 : 0.0,
                        avg_quality_score: data.qualityScore,
                        quality_improvement: 0 // Calculate later vs baseline
                    });
            }
        }
    }

    // ==========================================================================
    // Analytics Queries
    // ==========================================================================

    /**
     * Get overall statistics
     */
    async getOverallStats(query: AnalyticsQuery) {
        const { data, error } = await this.supabase
            .from('agent_usage_logs')
            .select('agent_type, success, quality_score, cost_usd, latency_ms')
            .gte('created_at', query.startDate.toISOString())
            .lte('created_at', query.endDate.toISOString());

        if (error || !data) return null;

        // Aggregate
        const stats: Record<string, any> = {};

        for (const log of data) {
            if (!stats[log.agent_type]) {
                stats[log.agent_type] = {
                    total: 0,
                    successes: 0,
                    totalQuality: 0,
                    totalCost: 0,
                    totalLatency: 0
                };
            }

            const s = stats[log.agent_type];
            s.total++;
            s.successes += log.success ? 1 : 0;
            s.totalQuality += log.quality_score || 0;
            s.totalCost += log.cost_usd || 0;
            s.totalLatency += log.latency_ms || 0;
        }

        // Calculate averages
        for (const agentType of Object.keys(stats)) {
            const s = stats[agentType];
            s.successRate = (s.successes / s.total) * 100;
            s.avgQuality = s.totalQuality / s.total;
            s.avgCost = s.totalCost / s.total;
            s.avgLatency = s.totalLatency / s.total;
        }

        return stats;
    }

    /**
     * Get top performing enhancement rules
     */
    async getTopEnhancementRules(agentType: string, limit = 10) {
        const { data, error } = await this.supabase
            .from('enhancement_rules_performance')
            .select('*')
            .eq('agent_type', agentType)
            .order('success_rate', { ascending: false })
            .limit(limit);

        return data || [];
    }

    /**
     * Get low-performing rules (need improvement)
     */
    async getLowPerformingRules(agentType: string, threshold = 0.80) {
        const { data, error } = await this.supabase
            .from('enhancement_rules_performance')
            .select('*')
            .eq('agent_type', agentType)
            .lt('success_rate', threshold)
            .gte('times_applied', 10) // At least 10 uses
            .order('success_rate', { ascending: true });

        return data || [];
    }

    // ==========================================================================
    // Helper Methods
    // ==========================================================================

    /**
     * Compress output using gzip + base64 for storage efficiency
     * Saves ~70-90% space while preserving ALL data for AI training
     * To decompress: Buffer.from(base64, 'base64') → zlib.gunzipSync()
     */
    private async compressOutput(output?: string): Promise<string | null> {
        if (!output) return null;

        try {
            const compressed = await gzip(Buffer.from(output, 'utf-8'));
            const base64 = compressed.toString('base64');
            // Prefix with 'gz:' to indicate compressed data
            return 'gz:' + base64;
        } catch (error) {
            console.error('Compression failed, storing raw:', error);
            // Fallback: store raw if compression fails (truncate if too long)
            return output.length > 50000
                ? output.substring(0, 50000) + '...[truncated]'
                : output;
        }
    }

    /**
     * Truncate output (DEPRECATED - use compressOutput instead)
     */
    private truncateOutput(output?: string, maxLength = 50000): string | null {
        if (!output) return null;
        return output.length > maxLength
            ? output.substring(0, maxLength) + '...[truncated]'
            : output;
    }

    /**
     * Hash output for deduplication/caching
     */
    private hashOutput(output?: string): string | null {
        if (!output) return null;
        return crypto
            .createHash('sha256')
            .update(output)
            .digest('hex')
            .substring(0, 16); // First 16 chars
    }

    /**
     * Get hour bucket (truncate to hour) - Returns ISO string for PostgreSQL
     * FIX: Date object was being converted to "Wed Jan 21..." format which PostgreSQL rejects
     */
    private getHourBucket(date: Date): string {
        const d = new Date(date);
        d.setMinutes(0, 0, 0);
        return d.toISOString(); // Return ISO string, not Date object
    }

    /**
     * Get week bucket (start of week)
     */
    private getWeekBucket(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Start of week (Sunday)
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const usageTracker = new UsageTracker();

console.log('✅ Usage Tracker initialized');
