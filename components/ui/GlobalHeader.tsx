import React from 'react';

interface GlobalHeaderProps {
    onPublish: () => void;
    projectName?: string;
}

export function GlobalHeader({ onPublish, projectName = 'kilatos-app' }: GlobalHeaderProps) {
    return (
        <header className="glass-header border-b border-panel-border px-4 py-2 flex items-center justify-between z-30 shrink-0 h-[52px]">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-xl">bolt</span>
                    </div>
                    <h1 className="text-white text-lg font-display font-bold tracking-widest uppercase">
                        KilatOS <span className="text-primary">Agent</span>
                    </h1>
                </div>
                <div className="h-6 w-px bg-panel-border"></div>
                {/* Real Navigation */}
                <nav className="flex gap-4">
                    <a href="/dashboard" className="text-sm font-display font-medium tracking-wide text-accent-purple hover:text-white transition-colors">Dashboard</a>
                    <a href="/faq" className="text-sm font-display font-medium tracking-wide text-accent-purple hover:text-white transition-colors">Docs</a>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center bg-obsidian border border-panel-border rounded-lg px-3 py-1.5 w-64 focus-within:border-primary transition-colors">
                    <span className="material-symbols-outlined text-accent-purple text-sm mr-2">search</span>
                    <input
                        className="bg-transparent border-none focus:ring-0 text-sm p-0 w-full placeholder:text-slate-600 text-slate-200 outline-none"
                        placeholder={`Search ${projectName}...`}
                        type="text"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onPublish}
                        className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">publish</span>
                        <span>Publish</span>
                    </button>
                </div>
                {/* User Avatar Placeholder - Should eventually come from Auth */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-400 border border-white/20"></div>
            </div>
        </header>
    );
}
