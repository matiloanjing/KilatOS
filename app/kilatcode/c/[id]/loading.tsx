import { LoadingKilat } from '@/components/ui/LoadingKilat';

export default function Loading() {
    return (
        <div className="h-screen w-screen bg-obsidian flex items-center justify-center">
            <LoadingKilat />
        </div>
    );
}
