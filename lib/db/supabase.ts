/**
 * Supabase Client Configuration
 * Project: rpmtfgntofxtxwmjpcxk
 * Copyright © 2025 KilatCode Studio
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check .env file.');
}

/**
 * Client-side Supabase client (browser-safe)
 * Uses anon key with RLS enabled
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

/**
 * Server-side Supabase client (admin)
 * Uses service role key - bypasses RLS
 * ONLY use in API routes, never expose to client
 */
export const supabaseAdmin = supabaseServiceKey
    ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    })
    : supabase; // Fallback to regular client if service key not available

/**
 * Check Supabase connection health
 */
export async function checkSupabaseConnection(): Promise<boolean> {
    try {
        const { error } = await supabase.from('sessions').select('count').limit(1);
        return !error;
    } catch (error) {
        console.error('Supabase connection failed:', error);
        return false;
    }
}

/**
 * Get Supabase project info
 */
export function getSupabaseInfo() {
    return {
        url: supabaseUrl,
        projectId: supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown',
        hasServiceKey: !!supabaseServiceKey,
    };
}
