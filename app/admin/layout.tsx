
import { createClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { getUserTier, getUserRole } from '@/lib/auth/user-tier';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login');
    }

    // Strict Admin Check
    // 1. Check DB Role (preferred)
    // 2. Whitelist Email (superadmin fallback)
    // NOTE: Enterprise Tier is explicitly EXCLUDED (Enterprise = Customer)
    const role = await getUserRole(user.id);

    const isAdmin = role === 'admin' || user.email === 'matiloanjing69@gmail.com';

    if (!isAdmin) {
        redirect('/dashboard');
    }

    return (
        <div className="min-h-screen bg-[#0a0118]">
            {children}
        </div>
    );
}
