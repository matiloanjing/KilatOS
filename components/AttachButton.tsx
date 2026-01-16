'use client';

import React, { useState, useRef } from 'react';
import { Plus, Image, FileText, Workflow, X } from 'lucide-react';

/**
 * AttachButton - Add context button with file/image/workflow options
 * 
 * Supports:
 * - Images (for vision/image2image)
 * - Files (PDF, TXT - extract text)
 * - Workflows (predefined actions)
 */

export interface AttachedFile {
    id: string;
    type: 'image' | 'pdf' | 'txt' | 'workflow';
    name: string;
    content?: string;  // For text files
    url?: string;      // For images
    file?: File;       // Original file
}

interface AttachButtonProps {
    attachedFiles: AttachedFile[];
    onFilesChange: (files: AttachedFile[]) => void;
    className?: string;
}

export function AttachButton({
    attachedFiles,
    onFilesChange,
    className = ''
}: AttachButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles: AttachedFile[] = [];

        for (const file of Array.from(files)) {
            const url = URL.createObjectURL(file);
            newFiles.push({
                id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'image',
                name: file.name,
                url,
                file
            });
        }

        onFilesChange([...attachedFiles, ...newFiles]);
        setIsOpen(false);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles: AttachedFile[] = [];

        for (const file of Array.from(files)) {
            const ext = file.name.split('.').pop()?.toLowerCase();

            if (ext === 'pdf') {
                // For PDF, we'd need pdf-parse on backend
                newFiles.push({
                    id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'pdf',
                    name: file.name,
                    file
                });
            } else if (ext === 'txt' || ext === 'md') {
                const content = await file.text();
                newFiles.push({
                    id: `txt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'txt',
                    name: file.name,
                    content,
                    file
                });
            }
        }

        onFilesChange([...attachedFiles, ...newFiles]);
        setIsOpen(false);
    };

    const removeFile = (id: string) => {
        onFilesChange(attachedFiles.filter(f => f.id !== id));
    };

    return (
        <div className={`attach-button ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="attach-trigger"
                title="Add context"
            >
                <Plus size={18} />
            </button>

            {isOpen && (
                <>
                    <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="dropdown-menu">
                        <div className="dropdown-header">Add context</div>

                        <button
                            className="menu-item"
                            onClick={() => imageInputRef.current?.click()}
                        >
                            <Image size={16} />
                            <span>Images</span>
                        </button>

                        <button
                            className="menu-item"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileText size={16} />
                            <span>Files (PDF, TXT)</span>
                        </button>

                        <button className="menu-item">
                            <Workflow size={16} />
                            <span>Workflows</span>
                        </button>
                    </div>
                </>
            )}

            {/* Hidden file inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            <style jsx>{`
                .attach-button {
                    position: relative;
                }

                .attach-trigger {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    cursor: pointer;
                    color: #94a3b8;
                    transition: all 0.2s ease;
                }

                .attach-trigger:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #e2e8f0;
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .dropdown-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 40;
                }

                .dropdown-menu {
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 0;
                    min-width: 180px;
                    background: #1e293b;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
                    z-index: 50;
                    overflow: hidden;
                }

                .dropdown-header {
                    padding: 10px 12px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .menu-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #e2e8f0;
                    font-size: 13px;
                    text-align: left;
                    transition: background 0.2s ease;
                }

                .menu-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
            `}</style>
        </div>
    );
}

/**
 * AttachedFilesList - Display attached files with remove option
 */
export function AttachedFilesList({
    files,
    onRemove
}: {
    files: AttachedFile[];
    onRemove: (id: string) => void;
}) {
    if (files.length === 0) return null;

    return (
        <div className="attached-files">
            {files.map(file => (
                <div key={file.id} className="attached-file">
                    {file.type === 'image' && file.url ? (
                        <img src={file.url} alt={file.name} className="file-thumbnail" />
                    ) : (
                        <div className="file-icon">
                            <FileText size={16} />
                        </div>
                    )}
                    <span className="file-name">{file.name}</span>
                    <button
                        className="remove-btn"
                        onClick={() => onRemove(file.id)}
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}

            <style jsx>{`
                .attached-files {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 8px 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .attached-file {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                }

                .file-thumbnail {
                    width: 24px;
                    height: 24px;
                    object-fit: cover;
                    border-radius: 4px;
                }

                .file-icon {
                    color: #8b5cf6;
                }

                .file-name {
                    font-size: 12px;
                    color: #e2e8f0;
                    max-width: 100px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .remove-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #64748b;
                    padding: 2px;
                    transition: color 0.2s ease;
                }

                .remove-btn:hover {
                    color: #ef4444;
                }
            `}</style>
        </div>
    );
}

export default AttachButton;
