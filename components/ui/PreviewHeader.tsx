'use client';

interface PreviewHeaderProps {
    projectName?: string;
    previewUrl?: string;
    viewMode: 'preview' | 'code';
    onViewModeChange: (mode: 'preview' | 'code') => void;
    onPublish?: () => void;
}

export default function PreviewHeader({
    projectName = 'MY-APP',
    previewUrl,
    viewMode,
    onViewModeChange,
    onPublish
}: PreviewHeaderProps) {
    return (
        <header className="h-16 border-b border-border-premium flex items-center justify-between px-6 bg-charcoal/40 backdrop-blur-md z-20 flex-shrink-0">
            <div className="flex items-center gap-4 min-w-0">
                {/* Breadcrumb */}
                <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                    PROJECTS <span className="mx-2 text-slate-700">/</span> <span className="text-white">{projectName}</span>
                </div>

                {/* URL Bar */}
                {previewUrl && (
                    <div className="hidden lg:flex flex-1 max-w-md ml-4">
                        <div className="w-full bg-[#0a0a0f] rounded-lg border border-white/5 px-3 py-1.5 flex items-center justify-between group">
                            <div className="flex items-center gap-2 text-slate-500 text-[11px] overflow-hidden">
                                <span className="material-icons-round text-xs text-emerald-500/70">lock</span>
                                <span className="text-slate-400 font-mono truncate">{previewUrl}</span>
                            </div>
                            <button className="material-icons-round text-slate-600 hover:text-white text-xs cursor-pointer">
                                refresh
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 ml-4">
                {/* Supabase Button */}
                <button className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg">
                    <svg className="w-3 h-3" viewBox="0 0 109 113" fill="none">
                        <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)" />
                        <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fillOpacity="0.2" />
                        <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E" />
                        <defs>
                            <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#249361" />
                                <stop offset="1" stopColor="#3ECF8E" />
                            </linearGradient>
                            <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
                                <stop />
                                <stop offset="1" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                    </svg>
                    Supabase
                </button>

                {/* GitHub Button */}
                <button className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    GitHub
                </button>

                <div className="h-6 w-px bg-white/10 mx-1"></div>

                {/* View Toggle */}
                <div className="bg-[#1a1a20]/80 backdrop-blur-md p-1 rounded-xl flex border border-white/10 shadow-2xl">
                    <button
                        onClick={() => onViewModeChange('preview')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 transition-all ${viewMode === 'preview'
                                ? 'bg-primary text-white shadow-sm border border-white/10'
                                : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">visibility</span> Preview
                    </button>
                    <button
                        onClick={() => onViewModeChange('code')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2 transition-all ${viewMode === 'code'
                                ? 'bg-primary text-white shadow-sm border border-white/10'
                                : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">code</span> Code
                    </button>
                </div>

                {/* Publish Button */}
                <button
                    onClick={onPublish}
                    className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-extrabold hover:bg-primary-dark transition-all flex items-center gap-2 uppercase tracking-tight shadow-lg shadow-primary/20"
                >
                    <span className="material-icons-round text-sm">rocket_launch</span> Publish
                </button>
            </div>
        </header>
    );
}
