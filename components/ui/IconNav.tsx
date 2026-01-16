'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
    icon: string;
    title: string;
    href: string;
    active?: boolean;
}

const navItems: NavItem[] = [
    { icon: 'home', title: 'Home', href: '/' },
    { icon: 'chat_bubble', title: 'Chat', href: '/chat' },
    { icon: 'code', title: 'KilatCode', href: '/kilatcode' },
    { icon: 'palette', title: 'KilatDesign', href: '/kilatdesign' },
    { icon: 'bug_report', title: 'KilatAudit', href: '/kilataudit' },
];

export default function IconNav() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <nav className="w-16 flex flex-col items-center py-4 border-r border-panel-border bg-obsidian z-30 flex-shrink-0">
            {/* Logo removed - moved to GlobalHeader */}


            {/* Navigation Items */}
            <div className="flex flex-col gap-6 w-full items-center flex-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`p-2.5 rounded-xl transition-all ${isActive
                                ? 'text-white bg-primary/10 border border-primary/20 shadow-glow-sm'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                            title={item.title}
                        >
                            <span className="material-icons-round">{item.icon}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Section */}
            <div className="mt-auto flex flex-col gap-6 items-center">
                <Link
                    href="/settings"
                    className="p-2.5 rounded-xl text-slate-500 hover:text-white transition-colors"
                    title="Settings"
                >
                    <span className="material-icons-round">settings</span>
                </Link>

                {/* User Avatar with Logout */}
                {user ? (
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-primary to-transparent cursor-pointer group relative"
                        title={`Logout (${user.email})`}
                    >
                        <div className="w-full h-full rounded-full bg-charcoal overflow-hidden border-2 border-obsidian">
                            {user.user_metadata?.avatar_url ? (
                                <img
                                    alt="User Avatar"
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity"
                                    src={user.user_metadata.avatar_url}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-sm group-hover:opacity-40 transition-opacity">
                                    {user.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                        </div>
                        {/* Logout icon overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-icons-round text-white text-lg">logout</span>
                        </div>
                    </button>
                ) : (
                    <Link
                        href="/login"
                        className="p-2.5 rounded-xl text-slate-500 hover:text-white transition-colors"
                        title="Sign in"
                    >
                        <span className="material-icons-round">login</span>
                    </Link>
                )}
            </div>
        </nav>
    );
}

