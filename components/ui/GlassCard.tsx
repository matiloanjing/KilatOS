import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
    children,
    className = '',
    hoverEffect = true
}) => {
    return (
        <div className={`
            ${hoverEffect ? 'card-premium' : 'glass rounded-2xl p-6'}
            ${className}
        `}>
            {children}
        </div>
    );
};
