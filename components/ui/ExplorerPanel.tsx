import React, { useMemo, useState } from 'react';

interface ExplorerPanelProps {
    files: Record<string, string> | null;
    activeFile: string | null;
    onFileSelect: (path: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: Record<string, FileNode>;
}

// Helper to build tree from flat file map
function buildFileTree(files: Record<string, string>): Record<string, FileNode> {
    const tree: Record<string, FileNode> = {};

    Object.keys(files).sort().forEach(path => {
        const parts = path.split('/').filter(Boolean);
        let currentLevel = tree;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const fullPath = '/' + parts.slice(0, index + 1).join('/');

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    name: part,
                    path: isFile ? fullPath : '', // Only files have actionable paths for now
                    type: isFile ? 'file' : 'directory',
                    children: isFile ? undefined : {}
                };
            }

            if (!isFile) {
                currentLevel = currentLevel[part].children!;
            }
        });
    });

    return tree;
}

const FileIcon = ({ name }: { name: string }) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return <span className="material-symbols-outlined text-[18px] text-blue-400">javascript</span>;
    if (name.endsWith('.css')) return <span className="material-symbols-outlined text-[18px] text-blue-300">css</span>;
    if (name.endsWith('.json')) return <span className="material-symbols-outlined text-[18px] text-yellow-400">data_object</span>;
    if (name.endsWith('.html')) return <span className="material-symbols-outlined text-[18px] text-orange-500">html</span>;
    return <span className="material-symbols-outlined text-[18px] text-slate-400">description</span>;
};

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => (
    <span className={`material-symbols-outlined text-[18px] text-accent-purple transition-transform ${isOpen ? 'rotate-90' : ''}`}>
        chevron_right
    </span>
);

const FileTreeItem = ({ node, level, activeFile, onFileSelect }: { node: FileNode, level: number, activeFile: string | null, onFileSelect: (path: string) => void }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (node.type === 'directory') {
        return (
            <div>
                <div
                    className="flex items-center gap-1 py-1 hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white transition-colors select-none"
                    style={{ paddingLeft: `${level * 12 + 12}px` }}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <FolderIcon isOpen={isOpen} />
                    <span className="material-symbols-outlined text-[18px] text-accent-purple mr-1">folder</span>
                    <span className="text-[13px] font-medium truncate">{node.name}</span>
                </div>
                {isOpen && node.children && Object.values(node.children).map(child => (
                    <FileTreeItem key={child.name} node={child} level={level + 1} activeFile={activeFile} onFileSelect={onFileSelect} />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-2 py-1.5 cursor-pointer transition-colors border-l-2 select-none ${activeFile === node.path
                ? 'active-file-glow border-primary text-white'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            style={{ paddingLeft: `${level * 12 + 12}px` }}
            onClick={() => onFileSelect(node.path)}
        >
            <FileIcon name={node.name} />
            <span className="text-[13px] font-medium truncate">{node.name}</span>
        </div>
    );
};

export function ExplorerPanel({ files, activeFile, onFileSelect, isCollapsed, onToggleCollapse }: ExplorerPanelProps) {
    const fileTree = useMemo(() => files ? buildFileTree(files) : {}, [files]);

    return (
        <aside
            className={`
                bg-obsidian border-r border-panel-border flex flex-col relative z-20 flex-shrink-0
                ${isCollapsed ? 'w-[40px] panel-collapsed' : 'w-60 panel-expanded'}
            `}
        >
            {/* Expanded Content */}
            <div className={`flex-col h-full ${isCollapsed ? 'hidden' : 'flex'}`}>
                <div className="px-4 py-3 flex items-center justify-between shrink-0">
                    <span className="text-[11px] font-bold text-white uppercase tracking-widest">Explorer</span>
                    <div className="flex gap-1 text-accent-purple">
                        <span className="material-symbols-outlined text-sm cursor-pointer hover:text-white">create_new_folder</span>
                        <span className="material-symbols-outlined text-sm cursor-pointer hover:text-white">note_add</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-2 scrollbar-custom">
                    {Object.keys(fileTree).length > 0 ? (
                        <>
                            <div className="px-4 py-1 flex items-center gap-2 text-accent-purple mb-1">
                                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                                <span className="text-[12px] font-bold uppercase tracking-wider text-slate-300">Project</span>
                            </div>
                            {Object.values(fileTree).map(node => (
                                <FileTreeItem key={node.name} node={node} level={0} activeFile={activeFile} onFileSelect={onFileSelect} />
                            ))}
                        </>
                    ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                            No files generated yet.
                        </div>
                    )}
                </div>
            </div>

            {/* Collapsed Content */}
            <div className={`absolute inset-0 flex flex-col items-center py-6 gap-8 ${!isCollapsed ? 'hidden' : 'flex'}`}>
                <span className="material-symbols-outlined text-accent-purple text-xl">folder</span>
                <span className="text-[10px] font-bold text-accent-purple uppercase tracking-[0.2em] vertical-text whitespace-nowrap">EXPLORER</span>
            </div>

            {/* Toggle Button */}
            <button
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 size-6 bg-obsidian border border-panel-border rounded-full flex items-center justify-center text-accent-purple toggle-glow shadow-lg hover:bg-panel-border transition-colors"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Expand Explorer" : "Collapse Explorer"}
            >
                <span className={`material-symbols-outlined text-sm transition-transform ${isCollapsed ? 'rotate-180' : ''}`}>
                    chevron_left
                </span>
            </button>
        </aside>
    );
}
