import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    icon,
    action
}) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
                {icon && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-purple-400">
                        {icon}
                    </div>
                )}
                <div>
                    <h1 className="text-3xl font-bold gradient-text pb-1">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-gray-400 text-sm md:text-base mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action && (
                <div className="flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
};
