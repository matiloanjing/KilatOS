import { LoadingKilat } from '@/components/ui/LoadingKilat';

export default function DashboardLoading() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-obsidian z-50">
            <LoadingKilat />
        </div>
    );
}
