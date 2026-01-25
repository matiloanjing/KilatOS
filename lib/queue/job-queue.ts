/**
 * Job Queue Service
 * Handles async multi-agent task processing with Supabase storage
 * 
 * Flow:
 * 1. Client submits request → Returns jobId instantly
 * 2. Backend processes in background → Updates job status
 * 3. Client polls /api/kilat/status → Gets current progress/result
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { createClient } from '@supabase/supabase-js';

// Types
export interface Job {
    id: string;
    user_id: string;
    session_id?: string;
    input_message: string;
    agent_type: string;
    execution_mode: 'planning' | 'fast';  // NEW: Track execution mode for AI training
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    current_step?: string;
    output_content?: string;
    files?: Record<string, string>;
    metadata?: Record<string, any>;
    error_message?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
}

export interface CreateJobInput {
    userId?: string;
    sessionId?: string;
    inputMessage: string;
    agentType?: string;
    executionMode?: 'planning' | 'fast';  // NEW: Specify execution mode
}

export interface UpdateJobInput {
    status?: Job['status'];
    progress?: number;
    currentStep?: string;
    outputContent?: string;
    files?: Record<string, string>;
    metadata?: Record<string, any>;
    errorMessage?: string;
}

// Job Queue Class
export class JobQueue {
    private supabase: any;  // Using 'any' for untyped Supabase tables
    private isInitialized = false;

    constructor() {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (url && key) {
            this.supabase = createClient(url, key);
            this.isInitialized = true;
            console.log('✅ JobQueue initialized');
        } else {
            console.warn('⚠️ JobQueue: Missing Supabase credentials');
        }
    }

    /**
     * Create a new job (returns instantly)
     */
    async createJob(input: CreateJobInput): Promise<string | null> {
        if (!this.isInitialized) return null;

        try {
            const { data, error } = await this.supabase
                .from('job_queue')
                .insert({
                    user_id: input.userId!, // REQUIRED - auth is mandatory, no anonymous fallback
                    session_id: input.sessionId,
                    input_message: input.inputMessage,
                    agent_type: input.agentType || 'code',
                    execution_mode: input.executionMode || 'planning',  // NEW: Track mode
                    status: 'pending',
                    progress: 0
                })
                .select('id')
                .single();

            if (error) {
                console.error('Failed to create job:', error.message);
                return null;
            }

            console.log(`📋 Job created: ${data.id}`);
            return data.id;
        } catch (error) {
            console.error('JobQueue.createJob error:', error);
            return null;
        }
    }

    /**
     * Update job status and progress
     */
    async updateJob(jobId: string, updates: UpdateJobInput): Promise<boolean> {
        if (!this.isInitialized) return false;

        try {
            const updateData: any = {};

            if (updates.status) {
                updateData.status = updates.status;
                if (updates.status === 'processing') {
                    updateData.started_at = new Date().toISOString();
                } else if (updates.status === 'completed' || updates.status === 'failed') {
                    updateData.completed_at = new Date().toISOString();
                }
            }
            if (updates.progress !== undefined) updateData.progress = updates.progress;
            if (updates.currentStep) updateData.current_step = updates.currentStep;
            if (updates.outputContent) updateData.output_content = updates.outputContent;
            if (updates.files) updateData.files = updates.files;
            if (updates.metadata) updateData.metadata = updates.metadata;
            if (updates.errorMessage) updateData.error_message = updates.errorMessage;

            const { error } = await this.supabase
                .from('job_queue')
                .update(updateData)
                .eq('id', jobId);

            if (error) {
                console.error('Failed to update job:', error.message);
                return false;
            }

            return true;
        } catch (error) {
            console.error('JobQueue.updateJob error:', error);
            return false;
        }
    }

    /**
     * Get job by ID (for polling)
     */
    async getJob(jobId: string): Promise<Job | null> {
        if (!this.isInitialized) return null;

        try {
            const { data, error } = await this.supabase
                .from('job_queue')
                .select('*')
                .eq('id', jobId)
                .single();

            if (error) {
                console.error('Failed to get job:', error.message);
                return null;
            }

            return data as Job;
        } catch (error) {
            console.error('JobQueue.getJob error:', error);
            return null;
        }
    }

    /**
     * Get user's recent jobs
     */
    async getUserJobs(userId: string, limit = 10): Promise<Job[]> {
        if (!this.isInitialized) return [];

        try {
            const { data, error } = await this.supabase
                .from('job_queue')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Failed to get user jobs:', error.message);
                return [];
            }

            return data as Job[];
        } catch (error) {
            console.error('JobQueue.getUserJobs error:', error);
            return [];
        }
    }

    /**
     * Delete job (for cleanup)
     */
    async deleteJob(jobId: string): Promise<boolean> {
        if (!this.isInitialized) return false;

        try {
            const { error } = await this.supabase
                .from('job_queue')
                .delete()
                .eq('id', jobId);

            return !error;
        } catch (error) {
            return false;
        }
    }

    /**
     * Cleanup stuck jobs (mark as failed if processing for too long)
     * Called by status API to auto-recover stuck jobs
     * 
     * FIX 2026-01-19: Vercel function timeouts leave jobs in "processing" forever.
     * This method marks stuck jobs as failed so users can retry.
     * 
     * @param maxAgeMinutes - Jobs processing longer than this are marked failed (default 10 min)
     */
    async cleanupStuckJobs(maxAgeMinutes: number = 10): Promise<number> {
        if (!this.isInitialized) return 0;

        try {
            const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

            const { data, error } = await this.supabase
                .from('job_queue')
                .update({
                    status: 'failed',
                    error_message: `Job timed out (stuck processing for over ${maxAgeMinutes} minutes). Please try again.`,
                    completed_at: new Date().toISOString()
                })
                .eq('status', 'processing')
                .lt('started_at', cutoffTime)
                .select('id');

            if (error) {
                console.error('cleanupStuckJobs error:', error.message);
                return 0;
            }

            const count = data?.length || 0;
            if (count > 0) {
                console.log(`🧹 Cleaned up ${count} stuck jobs`);
            }
            return count;
        } catch (error) {
            console.error('JobQueue.cleanupStuckJobs error:', error);
            return 0;
        }
    }

    /**
     * Cleanup old completed/failed jobs to prevent database bloat
     * @param maxAgeDays - Jobs older than this get deleted (default 7 days)
     */
    async cleanupOldJobs(maxAgeDays: number = 7): Promise<number> {
        if (!this.isInitialized) return 0;

        try {
            const cutoffTime = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await this.supabase
                .from('job_queue')
                .delete()
                .in('status', ['completed', 'failed'])
                .lt('completed_at', cutoffTime)
                .select('id');

            if (error) {
                console.error('cleanupOldJobs error:', error.message);
                return 0;
            }

            const count = data?.length || 0;
            if (count > 0) {
                console.log(`🧹 Cleaned up ${count} old jobs (>${maxAgeDays} days)`);
            }
            return count;
        } catch (error) {
            console.error('JobQueue.cleanupOldJobs error:', error);
            return 0;
        }
    }

    /**
     * Get job with automatic stuck-job cleanup
     * If job is stuck processing, mark as failed
     * 
     * ENHANCED: Also opportunistically cleans ALL stuck jobs (10% of polls)
     * This provides redundancy in case cron doesn't run
     */
    async getJobWithCleanup(jobId: string, maxAgeMinutes: number = 10): Promise<Job | null> {
        // ENHANCEMENT: 10% chance to clean ALL stuck jobs
        // Distributes cleanup across polls without hammering the DB
        if (Math.random() < 0.1) {
            try {
                const cleaned = await this.cleanupStuckJobs(maxAgeMinutes);
                if (cleaned > 0) {
                    console.log(`🧹 Opportunistic cleanup: ${cleaned} stuck jobs`);
                }
            } catch (e) {
                // Silent fail - don't break polling
            }
        }

        const job = await this.getJob(jobId);

        if (job && job.status === 'processing' && job.started_at) {
            const startTime = new Date(job.started_at).getTime();
            const maxAge = maxAgeMinutes * 60 * 1000;

            if (Date.now() - startTime > maxAge) {
                // Job is stuck - mark as failed
                await this.updateJob(jobId, {
                    status: 'failed',
                    errorMessage: `Job timed out (stuck processing for over ${maxAgeMinutes} minutes). Please try again.`
                });

                // Return updated job
                return await this.getJob(jobId);
            }
        }

        return job;
    }
}

// Export singleton
export const jobQueue = new JobQueue();

export default JobQueue;
