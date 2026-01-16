import React from 'react';
import { GlassCard } from './GlassCard';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
    trend?: {
        value: number; // percentage
        isPositive: boolean;
        label: string;
    };
    gradient?: 'purple' | 'blue' | 'pink' | 'cyan' | 'green';
    loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon,
    trend,
    gradient = 'purple',
    loading = false
}) => {
    if (loading) {
        return (
            <GlassCard className="h-32 flex items-center justify-center">
                <div className="spinner-premium h-8 w-8 border-2" />
            </GlassCard>
        );
    }

    const getGradientIcon = () => {
        switch (gradient) {
            case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'pink': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
            case 'cyan': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
            case 'green': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'purple': default: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        }
    };

    return (
        <GlassCard hoverEffect={true} className="relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>

                    {trend && (
                        <div className={`flex items-center mt-2 text-xs font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'
                            }`}>
                            <span className="mr-1">
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-gray-500">{trend.label}</span>
                        </div>
                    )}
                </div>

                {icon && (
                    <div className={`p-3 rounded-xl border ${getGradientIcon()} transition-transform group-hover:scale-110 duration-300`}>
                        {icon}
                    </div>
                )}
            </div>

            {/* Background Glow */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-opacity group-hover:opacity-30
                ${gradient === 'blue' ? 'bg-blue-500' :
                    gradient === 'pink' ? 'bg-pink-500' :
                        gradient === 'cyan' ? 'bg-cyan-500' :
                            gradient === 'green' ? 'bg-green-500' : 'bg-purple-500'
                }`}
            />
        </GlassCard>
    );
};
