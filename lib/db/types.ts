/**
 * Database Type Definitions
 * Auto-generated from Supabase schema
 * Copyright © 2025 KilatCode Studio
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            sessions: {
                Row: {
                    id: string
                    user_id: string | null
                    agent_type: string
                    kb_name: string | null
                    created_at: string
                    updated_at: string
                    status: string
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    agent_type: string
                    kb_name?: string | null
                    created_at?: string
                    updated_at?: string
                    status?: string
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    agent_type?: string
                    kb_name?: string | null
                    created_at?: string
                    updated_at?: string
                    status?: string
                    metadata?: Json | null
                }
            }
            messages: {
                Row: {
                    id: string
                    session_id: string
                    role: string
                    content: string
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    role: string
                    content: string
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    role?: string
                    content?: string
                    metadata?: Json | null
                    created_at?: string
                }
            }
            agent_states: {
                Row: {
                    id: string
                    session_id: string
                    step_number: number
                    step_type: string
                    state_data: Json
                    citations: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    step_number: number
                    step_type: string
                    state_data: Json
                    citations?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    step_number?: number
                    step_type?: string
                    state_data?: Json
                    citations?: Json | null
                    created_at?: string
                }
            }
            knowledge_bases: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    embedding_model: string | null
                    embedding_dim: number | null
                    created_at: string
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    embedding_model?: string | null
                    embedding_dim?: number | null
                    created_at?: string
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    embedding_model?: string | null
                    embedding_dim?: number | null
                    created_at?: string
                    metadata?: Json | null
                }
            }
            embeddings: {
                Row: {
                    id: string
                    kb_id: string
                    chunk_text: string
                    chunk_metadata: Json | null
                    embedding: number[] // pgvector
                    created_at: string
                }
                Insert: {
                    id?: string
                    kb_id: string
                    chunk_text: string
                    chunk_metadata?: Json | null
                    embedding: number[]
                    created_at?: string
                }
                Update: {
                    id?: string
                    kb_id?: string
                    chunk_text?: string
                    chunk_metadata?: Json | null
                    embedding?: number[]
                    created_at?: string
                }
            }
            agent_usage_logs: {
                Row: {
                    request_id: string
                    user_id: string | null
                    session_id: string | null
                    agent_type: string
                    agent_version: string
                    task_input: string
                    task_complexity: string
                    model_provider: string
                    model_name: string
                    input_tokens: number
                    output_tokens: number
                    total_tokens: number
                    cost_usd: number
                    latency_ms: number
                    tokens_per_second: number
                    output_text: string
                    tool_calls: Json | null
                    error_message: string | null
                    status: string
                    user_rating: number | null
                    user_feedback: string | null
                    user_accepted: boolean | null
                    retries: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    request_id: string
                    user_id?: string | null
                    session_id?: string | null
                    agent_type: string
                    agent_version: string
                    task_input: string
                    task_complexity: string
                    model_provider: string
                    model_name: string
                    input_tokens: number
                    output_tokens: number
                    total_tokens: number
                    cost_usd: number
                    latency_ms: number
                    tokens_per_second: number
                    output_text: string
                    tool_calls?: Json | null
                    error_message?: string | null
                    status: string
                    user_rating?: number | null
                    user_feedback?: string | null
                    user_accepted?: boolean | null
                    retries?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    request_id?: string
                    user_id?: string | null
                    session_id?: string | null
                    agent_type?: string
                    agent_version?: string
                    task_input?: string
                    task_complexity?: string
                    model_provider?: string
                    model_name?: string
                    input_tokens?: number
                    output_tokens?: number
                    total_tokens?: number
                    cost_usd?: number
                    latency_ms?: number
                    tokens_per_second?: number
                    output_text?: string
                    tool_calls?: Json | null
                    error_message?: string | null
                    status?: string
                    user_rating?: number | null
                    user_feedback?: string | null
                    user_accepted?: boolean | null
                    retries?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            agent_performance_metrics: {
                Row: {
                    id: string
                    time_bucket: string
                    bucket_size: string
                    agent_type: string
                    ai_provider: string
                    complexity: string
                    total_requests: number
                    successful_requests: number
                    failed_requests: number
                    total_tokens: number
                    avg_latency_ms: number
                    avg_quality_score: number
                    total_cost_usd: number
                    retry_rate: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    time_bucket: string
                    bucket_size: string
                    agent_type: string
                    ai_provider: string
                    complexity: string
                    total_requests: number
                    successful_requests: number
                    failed_requests: number
                    total_tokens: number
                    avg_latency_ms: number
                    avg_quality_score: number
                    total_cost_usd: number
                    retry_rate: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    time_bucket?: string
                    bucket_size?: string
                    agent_type?: string
                    ai_provider?: string
                    complexity?: string
                    total_requests?: number
                    successful_requests?: number
                    failed_requests?: number
                    total_tokens?: number
                    avg_latency_ms?: number
                    avg_quality_score?: number
                    total_cost_usd?: number
                    retry_rate?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            enhancement_rules_performance: {
                Row: {
                    id: string
                    agent_type: string
                    rule_name: string
                    rule_version: string
                    time_period_start: string
                    time_period_end: string
                    times_applied: number
                    success_rate: number
                    avg_quality_score: number
                    quality_improvement: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    agent_type: string
                    rule_name: string
                    rule_version: string
                    time_period_start: string
                    time_period_end: string
                    times_applied: number
                    success_rate: number
                    avg_quality_score: number
                    quality_improvement: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    agent_type?: string
                    rule_name?: string
                    rule_version?: string
                    time_period_start?: string
                    time_period_end?: string
                    times_applied?: number
                    success_rate?: number
                    avg_quality_score?: number
                    quality_improvement?: number
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Functions: {
            match_embeddings: {
                Args: {
                    query_embedding: number[]
                    kb_id: string
                    match_count: number
                    similarity_threshold: number
                }
                Returns: {
                    chunk_text: string
                    chunk_metadata: Json
                    similarity: number
                }[]
            }
        }
    }
}
