import { createClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { quotaManager } from '@/lib/quota/quota-manager';
import { getUserEngagement } from '@/lib/analytics/session-analytics';
import { getUserTier, getTierLimits } from '@/lib/auth/user-tier';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatsCard } from '@/components/ui/StatsCard';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    Activity,
    CreditCard,
    Zap,
    Clock,
    Code,
    Image as ImageIcon
} from 'lucide-react';

export default async function DashboardPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Parallel Data Fetching
    const [
        tier,
        quota,
        usageHistory,
        engagement
    ] = await Promise.all([
        getUserTier(user.id),
        quotaManager.checkQuota(user.id),
        quotaManager.getUsageHistory(user.id, 7),
        getUserEngagement(user.id)
    ]);

    const limits = getTierLimits(tier);
    const usagePercent = Math.min(100, Math.round((quota.used / quota.limit) * 100));

    // Calculate trend (dummy logic for now as we build history)
    const todayUsage = quota.used;
    const avgUsage = usageHistory.length > 0
        ? usageHistory.reduce((acc: number, curr: { total: number }) => acc + curr.total, 0) / usageHistory.length
        : 0;
    const trendValue = avgUsage > 0
        ? Math.round(((todayUsage - avgUsage) / avgUsage) * 100)
        : 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <PageHeader
                title="Dashboard Overview"
                subtitle={`Welcome back! You are on the ${tier.toUpperCase()} plan.`}
                icon={<Activity className="w-6 h-6" />}
                action={
                    tier === 'free' && (
                        <Link href="/pricing" className="btn-premium text-sm px-6 py-2 inline-block">
                            Upgrade Plan
                        </Link>
                    )
                }
            />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Daily Credits"
                    value={`${quota.used} / ${quota.limit}`}
                    icon={<Zap className="w-6 h-6" />}
                    trend={{
                        value: Math.abs(trendValue),
                        isPositive: trendValue < 0, // Lower usage is "positive" for cost? Or maybe higher is better for engagement. Let's say higher usage is "active".
                        label: 'vs 7-day avg'
                    }}
                    gradient="purple"
                />
                <StatsCard
                    title="Code Generations"
                    value={engagement.totalActions || 0}
                    icon={<Code className="w-6 h-6" />}
                    gradient="blue"
                />
                <StatsCard
                    title="Images Created"
                    value="0" // Placeholder until image tracking is fully tied to analytics
                    icon={<ImageIcon className="w-6 h-6" />}
                    gradient="pink"
                />
                <StatsCard
                    title="Active Sessions"
                    value={engagement.totalSessions || 0}
                    icon={<Clock className="w-6 h-6" />}
                    gradient="cyan"
                />
            </div>

            {/* Main Content Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Usage Chart Section */}
                <GlassCard className="col-span-2 min-h-[400px]">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Usage Activity (Last 7 Days)
                    </h3>

                    {/* CSS-only Bar Chart */}
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {usageHistory.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                No activity recorded yet.
                            </div>
                        ) : (
                            usageHistory.map((day: { total: number; date: string }, i: number) => {
                                const heightPercent = Math.max(5, Math.min(100, (day.total / (limits.dailyPollen * 10)) * 100)); // Normalize roughly
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="w-full bg-white/5 rounded-t-lg relative overflow-hidden transition-all duration-300 hover:bg-white/10"
                                            style={{ height: `${heightPercent}%` }}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent opacity-50" />
                                            {/* Tooltip */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                {day.total} Credits
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </GlassCard>

                {/* Plan Details */}
                <GlassCard>
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-pink-400" />
                        Current Plan
                    </h3>

                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-lg font-bold text-white capitalize">{tier} Tier</span>
                                <span className="badge-premium bg-green-500/20 text-green-300 border-green-500/50">Active</span>
                            </div>
                            <p className="text-sm text-gray-300 mb-4">
                                {tier === 'free' ? 'Perfect for hobbyists and students.' : 'Professional power for developers.'}
                            </p>

                            {/* Quota Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Daily Quota</span>
                                    <span className="text-white">{usagePercent}% Used</span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${usagePercent > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                            }`}
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Plan Features</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    {limits.dailyPollen} Daily Credits
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    {tier === 'free' ? 'Standard' : 'High'} Priority Processing
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    {tier === 'free' ? 'Community' : 'Private'} Support
                                </li>
                            </ul>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
