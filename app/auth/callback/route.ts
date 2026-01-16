import { createClient } from '@/lib/auth/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const origin = requestUrl.origin;

    if (code) {
        const supabase = createClient();

        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth callback error:', error);
            return NextResponse.redirect(`${origin}/login?error=auth_failed`);
        }
    }

    // Redirect to chat on success (dashboard not implemented yet)
    return NextResponse.redirect(`${origin}/chat`);
}
