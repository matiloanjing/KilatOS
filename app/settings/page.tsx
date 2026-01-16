'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import IconNav from '@/components/ui/IconNav';
import { useState } from 'react';
import { Settings, Moon, Sun, Bell, Shield, Key } from 'lucide-react';

export default function SettingsPage() {
    const { user, signOut } = useAuth();
    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState(true);

    return (
        <div className="flex bg-background-dark min-h-screen font-sans text-slate-200">
            <IconNav />
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                    <PageHeader
                        title="Settings"
                        subtitle="Manage execution preferences and account security."
                        icon={<Settings className="w-6 h-6" />}
                    />

                    {/* Account Section */}
                    <GlassCard>
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Account
                        </h3>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">{user?.email}</h4>
                                <p className="text-sm text-slate-400">Standard User (Free Tier)</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="btn-danger px-4 py-2 text-sm rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            Sign Out
                        </button>
                    </GlassCard>

                    {/* Preferences */}
                    <GlassCard>
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Sun className="w-5 h-5 text-amber-400" />
                            Appearance
                        </h3>
                        <div className="flex items-center justify-between py-4 border-b border-white/5">
                            <div>
                                <h4 className="font-medium">Theme Mode</h4>
                                <p className="text-sm text-slate-400">Select your preferred interface theme.</p>
                            </div>
                            <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`p-2 rounded ${theme === 'dark' ? 'bg-primary/20 text-white' : 'text-slate-500'}`}
                                >
                                    <Moon className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`p-2 rounded ${theme === 'light' ? 'bg-primary/20 text-white' : 'text-slate-500'}`}
                                >
                                    <Sun className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </GlassCard>

                    {/* API Keys */}
                    <GlassCard>
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Key className="w-5 h-5 text-emerald-400" />
                            API Configuration
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-300">OpenAI Key (Optional)</label>
                                <input type="password" placeholder="sk-..." className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-primary/50 outline-none transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-300">Anthropic Key (Optional)</label>
                                <input type="password" placeholder="sk-ant-..." className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:border-primary/50 outline-none transition-colors" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Providing your own keys allows you to bypass rate limits on standard models.
                            </p>
                        </div>
                    </GlassCard>
                </div>
            </main>
        </div>
    );
}
