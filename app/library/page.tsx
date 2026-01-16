import { createClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { getUserCodeHistory } from '@/lib/history/code-history';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Library, Filter } from 'lucide-react';
import LibraryGrid from '@/components/library/LibraryGrid';
import Link from 'next/link';

export default async function LibraryPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    const history = await getUserCodeHistory(user.id, 50);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <PageHeader
                title="Code Library"
                subtitle="Browse and manage your AI-generated code snippets."
                icon={<Library className="w-6 h-6" />}
                action={
                    <div className="flex gap-2">
                        <button className="btn-outline-premium text-sm px-4 py-2 flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filter
                        </button>
                    </div>
                }
            />

            {history.length === 0 ? (
                <GlassCard className="flex flex-col items-center justify-center h-96 text-center">
                    <div className="p-4 rounded-full bg-white/5 mb-6">
                        <Library className="w-12 h-12 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Code Generated Yet</h3>
                    <p className="text-gray-400 max-w-md mb-8">
                        Your generated code snippets will appear here automatically.
                        Start a chat to create your first project!
                    </p>
                    <Link href="/chat" className="btn-premium">
                        Start Coding
                    </Link>
                </GlassCard>
            ) : (
                <LibraryGrid history={history} />
            )}
        </div>
    );
}

