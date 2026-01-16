/**
 * Preview File Manager
 * Manages files for code preview
 * Copyright © 2025 KilatCode Studio
 */

export interface PreviewFile {
    path: string;
    content: string;
    language: string;
    isEntry?: boolean;
}

export interface FileTree {
    name: string;
    path: string;
    type: 'file' | 'directory';
    content?: string;
    children?: FileTree[];
}

/**
 * File Manager for Preview
 */
export class PreviewFileManager {
    private files: Map<string, PreviewFile> = new Map();

    constructor(initialFiles?: Record<string, string>) {
        if (initialFiles) {
            this.loadFiles(initialFiles);
        }
    }

    /**
     * Load files from object
     */
    loadFiles(files: Record<string, string>): void {
        for (const [path, content] of Object.entries(files)) {
            this.addFile(path, content);
        }
    }

    /**
     * Add a file
     */
    addFile(path: string, content: string, isEntry: boolean = false): void {
        const normalizedPath = this.normalizePath(path);
        const language = this.detectLanguage(normalizedPath);

        this.files.set(normalizedPath, {
            path: normalizedPath,
            content,
            language,
            isEntry
        });
    }

    /**
     * Get a file
     */
    getFile(path: string): PreviewFile | undefined {
        return this.files.get(this.normalizePath(path));
    }

    /**
     * Update file content
     */
    updateFile(path: string, content: string): boolean {
        const file = this.getFile(path);
        if (file) {
            file.content = content;
            return true;
        }
        return false;
    }

    /**
     * Delete a file
     */
    deleteFile(path: string): boolean {
        return this.files.delete(this.normalizePath(path));
    }

    /**
     * Get all files
     */
    getAllFiles(): PreviewFile[] {
        return Array.from(this.files.values());
    }

    /**
     * Get files as object (for WebContainer preview)
     */
    getFilesObject(): Record<string, string> {
        const obj: Record<string, string> = {};
        for (const [path, file] of this.files) {
            obj[path] = file.content;
        }
        return obj;
    }

    /**
     * Build file tree structure
     */
    getFileTree(): FileTree[] {
        const tree: FileTree[] = [];
        const paths = Array.from(this.files.keys()).sort();

        for (const path of paths) {
            const file = this.files.get(path)!;
            this.insertIntoTree(tree, path, file);
        }

        return tree;
    }

    /**
     * Get entry file path
     */
    getEntryFile(): string | null {
        // Look for explicitly marked entry
        for (const file of this.files.values()) {
            if (file.isEntry) {
                return file.path;
            }
        }

        // Common entry files
        const commonEntries = [
            '/index.tsx',
            '/index.ts',
            '/App.tsx',
            '/App.ts',
            '/src/index.tsx',
            '/src/App.tsx',
            '/app/page.tsx',
            '/main.tsx',
            '/main.ts'
        ];

        for (const entry of commonEntries) {
            if (this.files.has(entry)) {
                return entry;
            }
        }

        // Return first file
        return this.files.size > 0 ? Array.from(this.files.keys())[0] : null;
    }

    /**
     * Normalize file path
     */
    private normalizePath(path: string): string {
        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        return path;
    }

    /**
     * Detect language from file extension
     */
    private detectLanguage(path: string): string {
        const ext = path.split('.').pop()?.toLowerCase();
        const langMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'tsx',
            'js': 'javascript',
            'jsx': 'jsx',
            'css': 'css',
            'scss': 'scss',
            'html': 'html',
            'json': 'json',
            'md': 'markdown',
            'vue': 'vue',
            'svelte': 'svelte'
        };
        return langMap[ext || ''] || 'text';
    }

    /**
     * Insert file into tree structure
     */
    private insertIntoTree(tree: FileTree[], path: string, file: PreviewFile): void {
        const parts = path.split('/').filter(p => p);
        let current = tree;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            if (isLast) {
                // File
                current.push({
                    name: part,
                    path,
                    type: 'file',
                    content: file.content
                });
            } else {
                // Directory
                let dir = current.find(item => item.name === part && item.type === 'directory');
                if (!dir) {
                    dir = {
                        name: part,
                        path: '/' + parts.slice(0, i + 1).join('/'),
                        type: 'directory',
                        children: []
                    };
                    current.push(dir);
                }
                current = dir.children!;
            }
        }
    }

    /**
     * Get file count
     */
    getFileCount(): number {
        return this.files.size;
    }

    /**
     * Clear all files
     */
    clear(): void {
        this.files.clear();
    }
}

/**
 * Convert CodeGen output to preview files
 */
export function codeGenToPreviewFiles(codeFiles: Record<string, string>): PreviewFileManager {
    const manager = new PreviewFileManager();

    // Auto-detect entry file
    const hasApp = 'App.tsx' in codeFiles || 'App.ts' in codeFiles;
    const hasIndex = 'index.tsx' in codeFiles || 'index.ts' in codeFiles;

    for (const [path, content] of Object.entries(codeFiles)) {
        const isEntry = path === 'index.tsx' || path === 'index.ts' ||
            (path === 'App.tsx' && !hasIndex) ||
            (path === 'App.ts' && !hasIndex);

        manager.addFile(path, content, isEntry);
    }

    return manager;
}
