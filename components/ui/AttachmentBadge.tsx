'use client';

import { useState, useRef } from 'react';

export interface AttachedFile {
    file: File;
    type: 'image' | 'document';
    preview?: string; // base64 for images
}

interface AttachmentBadgeProps {
    attachment: AttachedFile;
    onRemove: () => void;
}

// File type icon mapping
const getFileIcon = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
        // Images
        png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️',
        // Documents
        pdf: '📕', doc: '📄', docx: '📄',
        // Spreadsheets
        xls: '📊', xlsx: '📊', csv: '📊',
        // Presentations
        ppt: '📽️', pptx: '📽️',
        // Text
        txt: '📝', md: '📝',
    };
    return icons[ext] || '📎';
};

// Format file size
const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Truncate filename
const truncateName = (name: string, maxLen: number = 20): string => {
    if (name.length <= maxLen) return name;
    const ext = name.split('.').pop() || '';
    const base = name.slice(0, name.length - ext.length - 1);
    const truncated = base.slice(0, maxLen - ext.length - 4) + '...';
    return `${truncated}.${ext}`;
};

export function AttachmentBadge({ attachment, onRemove }: AttachmentBadgeProps) {
    const { file, preview } = attachment;
    const isImage = attachment.type === 'image';

    return (
        <div className="relative group flex items-center gap-2 bg-[#1a1a20] border border-white/10 rounded-lg px-2 py-1.5 hover:border-primary/30 transition-all">
            {/* Preview/Icon */}
            {isImage && preview ? (
                <img
                    src={preview}
                    alt={file.name}
                    className="w-8 h-8 rounded object-cover"
                />
            ) : (
                <span className="text-lg">{getFileIcon(file.name)}</span>
            )}

            {/* File info */}
            <div className="flex flex-col">
                <span className="text-xs text-slate-300 font-medium">
                    {truncateName(file.name)}
                </span>
                <span className="text-[10px] text-slate-500">
                    {formatSize(file.size)}
                </span>
            </div>

            {/* Remove button */}
            <button
                onClick={onRemove}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                title="Remove"
            >
                <span className="text-[10px]">×</span>
            </button>
        </div>
    );
}

// Attachment menu for + button
interface AttachmentMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: () => void;
    onSelectDocument: () => void;
}

export function AttachmentMenu({ isOpen, onClose, onSelectImage, onSelectDocument }: AttachmentMenuProps) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop - higher z-index to catch clicks */}
            <div
                className="fixed inset-0 z-[90]"
                onClick={onClose}
            />

            {/* Menu - very high z-index to appear above everything */}
            <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a20] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] min-w-[180px]">
                <button
                    onClick={() => { onSelectImage(); onClose(); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors"
                >
                    <span className="text-lg">📷</span>
                    <span>Upload Image</span>
                </button>
                <button
                    onClick={() => { onSelectDocument(); onClose(); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors border-t border-white/5"
                >
                    <span className="text-lg">📄</span>
                    <span>Upload Document</span>
                </button>
            </div>
        </>
    );
}

// Utility to create AttachedFile from File
export async function createAttachedFile(file: File): Promise<AttachedFile> {
    const isImage = file.type.startsWith('image/');

    let preview: string | undefined;
    if (isImage) {
        preview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    }

    return {
        file,
        type: isImage ? 'image' : 'document',
        preview
    };
}

// Supported file types
export const ACCEPTED_IMAGE_TYPES = '.png,.jpg,.jpeg,.gif,.webp';
export const ACCEPTED_DOC_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv';
export const ACCEPTED_ALL_TYPES = `${ACCEPTED_IMAGE_TYPES},${ACCEPTED_DOC_TYPES}`;

// Max file sizes (in bytes)
export const MAX_FILE_SIZES: Record<string, number> = {
    image: 10 * 1024 * 1024,    // 10MB
    document: 20 * 1024 * 1024, // 20MB
};

export default AttachmentBadge;
