import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

/**
 * Create a Supabase client for Server Components
 * Uses cookies for session management
 */
export const createClient = cache(() => {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
});

/**
 * Create a Supabase Admin client (Service Role)
 * strictly for background jobs and server-side operations
 * bypassing RLS. Use with caution.
 */
export const createAdminClient = cache(() => {
    // Dynamic import to avoid client-side bundle issues if imported incorrectly
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
    }

    return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
});

/**
 * Get current user session (server-side)
 */
export async function getSession() {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error getting session:', error);
        return null;
    }

    return session;
}

/**
 * Get current user (server-side)
 */
export async function getUser() {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        console.error('Error getting user:', error);
        return null;
    }

    return user;
}

/**
 * Get user profile with subscription
 */
export async function getUserProfile() {
    const user = await getUser();

    if (!user) return null;

    const supabase = createClient();

    // Get profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Get subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

    return {
        ...user,
        profile,
        subscription,
    };
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
    const profile = await getUserProfile();
    return profile?.profile?.role === 'admin' || profile?.profile?.role === 'super_admin';
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth() {
    const user = await getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * Require admin role (throws if not admin)
 */
export async function requireAdmin() {
    const isAdminUser = await isAdmin();

    if (!isAdminUser) {
        throw new Error('Forbidden: Admin access required');
    }

    return true;
}
