import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for Client Components
 * Uses localStorage + cookies for persistent session management
 * 
 * Like ChatGPT/Gemini: Sessions persist until explicit logout
 * 
 * NOTE: Do NOT use custom storageKey - breaks PKCE OAuth flow!
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true,       // Keep session in localStorage
                autoRefreshToken: true,     // Auto-refresh before expiry
                detectSessionInUrl: true,   // Handle OAuth callbacks
                // NOTE: storageKey removed - was causing PKCE code verifier mismatch!
            }
        }
    );
}

