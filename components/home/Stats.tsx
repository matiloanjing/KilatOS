'use client';

export default function Stats() {
    return (
        <section className="relative z-20 -mt-20 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="backdrop-blur-xl bg-[rgba(22,22,30,0.8)] rounded-2xl p-8 md:p-10 border-t border-white/10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
                        <div className="py-2">
                            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Uptime</p>
                            <p className="text-4xl font-mono font-bold text-white">99.9%</p>
                            <p className="text-xs text-green-400 mt-2 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span> Guaranteed
                            </p>
                        </div>
                        <div className="py-2">
                            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Queries Processed</p>
                            <p className="text-4xl font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00f0ff] to-[#0099ff]">10M+</p>
                            <p className="text-xs text-[#06b6d4] mt-2 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm">trending_up</span> +25% This Week
                            </p>
                        </div>
                        <div className="py-2">
                            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Active Developers</p>
                            <p className="text-4xl font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#a5a6f6]">50k+</p>
                            <p className="text-xs text-[#6366f1] mt-2 flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm">group</span> Global Community
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
