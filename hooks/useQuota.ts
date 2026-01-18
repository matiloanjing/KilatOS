/**
 * useQuota Hook
 * Fetches and manages user daily quota from /api/kilat/usage
 * 
 * Usage:
 * const [quota, refreshQuota] = useQuota(userId, agentType);
 * 
 * Copyright © 2026 KilatOS
 */

import { useState, useEffect, useCallback } from 'react';

export interface QuotaData {
    used: number;
    limit: number;
    tier: string;
}

const DEFAULT_QUOTA: QuotaData = {
    used: 0,
    limit: 50,  // Database default for free tier code
    tier: 'free'
};

/**
 * Hook to fetch and manage user quota
 * @param userId - User ID from auth
 * @param agentType - Agent type: 'code' | 'image' (defaults to 'code')
 * @returns [quota, refreshQuota]
 */
export function useQuota(
    userId: string | undefined,
    agentType: 'code' | 'image' = 'code'
): [QuotaData, () => Promise<void>] {
    const [quota, setQuota] = useState<QuotaData>(DEFAULT_QUOTA);

    const fetchQuota = useCallback(async () => {
        if (!userId) return;

        try {
            const res = await fetch(`/api/kilat/usage?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();

                if (agentType === 'image') {
                    setQuota({
                        used: data.imageUsed || 0,
                        limit: data.imageLimit || 5,
                        tier: data.tier || 'free'
                    });
                } else {
                    setQuota({
                        used: data.codeUsed || 0,
                        limit: data.codeLimit || 20,
                        tier: data.tier || 'free'
                    });
                }
            }
        } catch (err) {
            console.warn('[useQuota] Failed to fetch:', err);
        }
    }, [userId, agentType]);

    // Fetch on mount and when userId changes
    useEffect(() => {
        fetchQuota();
    }, [fetchQuota]);

    return [quota, fetchQuota];
}

export default useQuota;
