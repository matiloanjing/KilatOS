'use client';

import { useState } from 'react';
import { GeneratedCode } from '@/lib/history/code-history';
import { CodeSnippetCard } from '@/components/ui/CodeSnippetCard';
import { SnippetModal } from './SnippetModal';

interface LibraryGridProps {
    history: GeneratedCode[];
}

export default function LibraryGrid({ history }: LibraryGridProps) {
    const [selectedSnippet, setSelectedSnippet] = useState<GeneratedCode | null>(null);

    const handleView = (snippet: GeneratedCode) => {
        setSelectedSnippet(snippet);
    };

    const handleClose = () => {
        setSelectedSnippet(null);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                {history.map((snippet) => (
                    <CodeSnippetCard
                        key={snippet.id}
                        snippet={snippet}
                        onView={handleView}
                    />
                ))}
            </div>

            <SnippetModal
                isOpen={!!selectedSnippet}
                snippet={selectedSnippet}
                onClose={handleClose}
            />
        </>
    );
}
