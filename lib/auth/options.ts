import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { createClient } from '@supabase/supabase-js';

// Supabase client for auth
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        db: {
            schema: 'next_auth'
        }
    }
);

export const authOptions: NextAuthOptions = {
    // Use Supabase adapter for session storage
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!
    }),

    // OAuth providers
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code'
                }
            }
        }),
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'read:user user:email repo' // Request repo access
                }
            }
        })
    ],

    // Session configuration
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },

    // JWT configuration
    jwt: {
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },

    // Callbacks
    callbacks: {
        async jwt({ token, account, profile }) {
            // Store OAuth access token in JWT for API calls
            if (account) {
                token.accessToken = account.access_token;
                token.provider = account.provider;
                token.providerAccountId = account.providerAccountId;
            }

            // Add user info
            if (profile) {
                token.email = profile.email;
                token.name = profile.name;
                token.picture = (profile as any).avatar_url || (profile as any).picture;
            }

            return token;
        },

        async session({ session, token }) {
            // Make access token available in session
            if (session.user) {
                (session.user as any).accessToken = token.accessToken;
                (session.user as any).provider = token.provider;
                (session.user as any).id = token.providerAccountId;
            }

            return session;
        },

        async signIn({ user, account, profile }) {
            // Allow sign in
            return true;
        }
    },

    // Pages
    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error'
    },

    // Events
    events: {
        async signIn({ user, account, profile, isNewUser }) {
            console.log(`✅ User signed in: ${user.email} via ${account?.provider}`);

            // Create user context on first sign in
            if (isNewUser) {
                console.log(`🆕 New user created: ${user.email}`);
                // TODO: Initialize user preferences and context
            }
        },

        async signOut({ token }) {
            console.log(`👋 User signed out`);
        }
    },

    // Debug mode in development
    debug: process.env.NODE_ENV === 'development'
};
