export function LoadingKilat() {
    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>

                {/* Lightning Bolt SVG */}
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-12 h-12 text-primary animate-bounce drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]"
                    style={{ animationDuration: '0.8s' }}
                >
                    <path
                        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="fill-primary"
                    />
                </svg>
            </div>
            <p className="text-primary font-mono text-sm animate-pulse tracking-widest">
                INITIALIZING...
            </p>
        </div>
    );
}
