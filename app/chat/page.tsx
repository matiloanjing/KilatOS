'use client';
/**
 * Chat Page - Redirect to Session
 * 
 * This page redirects to a new or existing session.
 * - If session limit not full → create new session
 * - If session limit full → redirect to last session
 * 
 * Format: /chat → /chat/c/[sessionId]
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LoadingKilat } from '@/components/ui/LoadingKilat';

export default function ChatPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [status, setStatus] = useState('Checking sessions...');

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        const redirectToSession = async () => {
            if (isRedirecting) return;
            setIsRedirecting(true);

            try {
                // First, check existing sessions
                setStatus('Loading sessions...');
                const sessionsRes = await fetch('/api/kilat/sessions');

                if (sessionsRes.ok) {
                    const sessionsData = await sessionsRes.json();
                    const sessions = sessionsData.sessions || [];

                    // If user has sessions, check if we should open last one or create new
                    if (sessions.length > 0) {
                        // Try to create new session first
                        setStatus('Creating new session...');
                        const createRes = await fetch('/api/kilat/sessions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: 'New Chat' })
                        });

                        if (createRes.ok) {
                            const data = await createRes.json();
                            if (data.session?.id) {
                                router.replace(`/chat/c/${data.session.id}`);
                                return;
                            }
                        } else if (createRes.status === 403) {
                            // Session limit full - redirect to last session
                            setStatus('Session limit reached, opening last session...');
                            const lastSession = sessions[0]; // Already sorted by updated_at desc
                            router.replace(`/chat/c/${lastSession.id}`);
                            return;
                        }
                    }
                }

                // No sessions yet - create new one
                setStatus('Creating first session...');
                const res = await fetch('/api/kilat/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'New Chat' })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.session?.id) {
                        router.replace(`/chat/c/${data.session.id}`);
                        return;
                    }
                }

                // Fallback: generate local ID if API fails
                const fallbackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                router.replace(`/chat/c/${fallbackId}`);

            } catch (e) {
                console.error('[Chat] Failed to handle session, using fallback');
                const fallbackId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                router.replace(`/chat/c/${fallbackId}`);
            }
        };

        redirectToSession();
    }, [user, loading, router, isRedirecting]);

    return (
        <div className="h-screen w-screen bg-obsidian flex items-center justify-center flex-col gap-4">
            <LoadingKilat />
            <p className="text-slate-400 text-sm">{status}</p>
        </div>
    );
}
