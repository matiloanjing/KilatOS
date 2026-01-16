'use client';
/**
 * KilatWrite - Project Index
 * 
 * Redirects to a new project or existing project
 * Supports ?projectId=xxx for cross-agent navigation
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { LoadingKilat } from '@/components/ui/LoadingKilat';

export default function KilatWriteIndexPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else {
                // Check for projectId in URL (for cross-agent navigation)
                const projectId = searchParams.get('projectId') || crypto.randomUUID();
                router.push(`/kilatwrite/c/${projectId}`);
            }
        }
    }, [user, loading, router, searchParams]);

    return (
        <div className="h-screen w-screen bg-obsidian flex items-center justify-center">
            <LoadingKilat />
        </div>
    );
}
