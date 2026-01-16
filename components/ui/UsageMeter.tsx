'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';

interface UsageData {
    used: number;
    limit: number;
    type: 'code' | 'image';
}

interface UsageMeterProps {
    compact?: boolean;
}

export function UsageMeter({ compact = false }: UsageMeterProps) {
    const { user } = useAuth();
    const [usage, setUsage] = useState<{ code: UsageData; image: UsageData }>({
        code: { used: 0, limit: 20, type: 'code' },
        image: { used: 0, limit: 5, type: 'image' },
    });
    const [tier, setTier] = useState<string>('free');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsage = async () => {
            if (!user?.id) return;

            try {
                // Fetch from quota API (if exists) or use defaults
                const res = await fetch(`/api/kilat/usage?userId=${user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUsage({
                        code: {
                            used: data.codeUsed || 0,
                            limit: data.codeLimit || 20,
                            type: 'code'
                        },
                        image: {
                            used: data.imageUsed || 0,
                            limit: data.imageLimit || 5,
                            type: 'image'
                        },
                    });
                    setTier(data.tier || 'free');
                }
            } catch (err) {
                console.error('Usage fetch error:', err);
            }
            setLoading(false);
        };

        fetchUsage();
    }, [user?.id]);

    const getPercentage = (used: number, limit: number) => Math.min((used / limit) * 100, 100);

    const getColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-primary';
    };

    if (loading || !user) {
        return null;
    }

    if (compact) {
        const codePercent = getPercentage(usage.code.used, usage.code.limit);
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs">
                <span className="material-symbols-outlined text-sm text-primary">bolt</span>
                <span className="text-gray-400">{usage.code.limit - usage.code.used} left</span>
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getColor(codePercent)} transition-all`}
                        style={{ width: `${codePercent}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">speed</span>
                    Daily Usage
                </h3>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${tier === 'enterprise' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                        tier === 'pro' ? 'bg-primary' : 'bg-gray-600'
                    }`}>
                    {tier}
                </span>
            </div>

            {/* Code Usage */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">code</span>
                        Code Requests
                    </span>
                    <span className="text-white font-mono">
                        {usage.code.used}/{usage.code.limit}
                    </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getColor(getPercentage(usage.code.used, usage.code.limit))} transition-all duration-500`}
                        style={{ width: `${getPercentage(usage.code.used, usage.code.limit)}%` }}
                    />
                </div>
            </div>

            {/* Image Usage */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">image</span>
                        Image Requests
                    </span>
                    <span className="text-white font-mono">
                        {usage.image.used}/{usage.image.limit}
                    </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${getColor(getPercentage(usage.image.used, usage.image.limit))} transition-all duration-500`}
                        style={{ width: `${getPercentage(usage.image.used, usage.image.limit)}%` }}
                    />
                </div>
            </div>

            {/* Warning if near limit */}
            {(getPercentage(usage.code.used, usage.code.limit) >= 80 ||
                getPercentage(usage.image.used, usage.image.limit) >= 80) && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <span className="material-symbols-outlined text-yellow-500 text-sm">warning</span>
                        <p className="text-xs text-yellow-400">
                            Approaching daily limit. Resets at midnight UTC.
                        </p>
                    </div>
                )}

            {tier === 'free' && (
                <button className="w-full py-2 text-xs font-semibold text-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-opacity">
                    Upgrade to Pro →
                </button>
            )}
        </div>
    );
}

export default UsageMeter;
