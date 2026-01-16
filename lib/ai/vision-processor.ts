/**
 * Vision Processor Service
 * 
 * Pre-processes images and documents using gemini-fast vision model.
 * Returns text descriptions that can be passed to ANY LLM model.
 * 
 * Strategy: Use vision model to "read" attachments, convert to text.
 * This allows non-vision models (qwen-coder, mistral) to understand images.
 * 
 * Copyright © 2026 KilatCode Studio
 */

import { uploadImageFromBase64 } from '@/lib/utils/vision-uploader';

const VISION_MODEL = 'gemini-fast'; // Free tier, supports vision
const POLLINATION_API = 'https://text.pollinations.ai';

export interface AttachmentInput {
    type: 'image' | 'document';
    name: string;
    base64: string;  // Data URL or base64 string
    mimeType?: string;
}

export interface ProcessedAttachment {
    type: 'image' | 'document';
    name: string;
    description: string;
    imageUrl?: string; // For reference/debugging
    processingTime: number;
}

/**
 * Process a single attachment with vision model
 */
async function processImage(
    attachment: AttachmentInput,
    userId?: string
): Promise<ProcessedAttachment> {
    const startTime = Date.now();

    try {
        // Upload image to get public URL
        const { url } = await uploadImageFromBase64(attachment.base64, userId);

        // Call vision model to describe the image
        const prompt = `Analyze this image and provide a detailed description. Include:
1. What type of content is this (screenshot, photo, diagram, etc.)?
2. Main elements and their arrangement
3. Any text visible in the image
4. Colors, style, and design elements
5. If it's a UI/app screenshot, describe the interface components

Be specific and detailed so another AI can understand this image without seeing it.`;

        const response = await fetch(`${POLLINATION_API}/${encodeURIComponent(prompt)}?model=${VISION_MODEL}&image=${encodeURIComponent(url)}`);

        if (!response.ok) {
            throw new Error(`Vision API failed: ${response.status}`);
        }

        const description = await response.text();

        return {
            type: 'image',
            name: attachment.name,
            description: description.trim(),
            imageUrl: url,
            processingTime: Date.now() - startTime
        };
    } catch (error) {
        console.error('[VisionProcessor] Image processing failed:', error);
        return {
            type: 'image',
            name: attachment.name,
            description: `[Failed to process image: ${attachment.name}]`,
            processingTime: Date.now() - startTime
        };
    }
}

/**
 * Process a document (extract text content)
 * For now, supports text-based documents only
 */
async function processDocument(
    attachment: AttachmentInput
): Promise<ProcessedAttachment> {
    const startTime = Date.now();

    try {
        // Decode base64 to text for text-based documents
        const base64Data = attachment.base64.replace(/^data:[^;]+;base64,/, '');
        const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');

        // Truncate if too long (max 10k chars)
        const maxLength = 10000;
        const truncated = textContent.length > maxLength
            ? textContent.slice(0, maxLength) + '\n... [truncated]'
            : textContent;

        return {
            type: 'document',
            name: attachment.name,
            description: `Document: ${attachment.name}\n\n${truncated}`,
            processingTime: Date.now() - startTime
        };
    } catch (error) {
        console.error('[VisionProcessor] Document processing failed:', error);
        return {
            type: 'document',
            name: attachment.name,
            description: `[Failed to process document: ${attachment.name}]`,
            processingTime: Date.now() - startTime
        };
    }
}

/**
 * Process multiple attachments in parallel
 */
export async function processAttachments(
    attachments: AttachmentInput[],
    userId?: string
): Promise<ProcessedAttachment[]> {
    if (!attachments || attachments.length === 0) {
        return [];
    }

    console.log(`[VisionProcessor] Processing ${attachments.length} attachments...`);

    const results = await Promise.all(
        attachments.map(async (att) => {
            if (att.type === 'image') {
                return processImage(att, userId);
            } else {
                return processDocument(att);
            }
        })
    );

    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    console.log(`[VisionProcessor] Processed ${results.length} attachments in ${totalTime}ms`);

    return results;
}

/**
 * Build injection text for AI prompt
 * Returns formatted text summarizing all attachments
 */
export function buildAttachmentInjection(
    processedAttachments: ProcessedAttachment[]
): string {
    if (!processedAttachments || processedAttachments.length === 0) {
        return '';
    }

    let text = '\n\n## 📎 ATTACHED FILES\n';
    text += `User has attached ${processedAttachments.length} file(s). Use this information:\n\n`;

    for (const att of processedAttachments) {
        const icon = att.type === 'image' ? '🖼️' : '📄';
        text += `### ${icon} ${att.name}\n`;
        text += att.description;
        text += '\n\n';
    }

    text += '---\n\n';

    return text;
}

/**
 * Full processing pipeline: attachments → descriptions → injection text
 */
export async function processAndInjectAttachments(
    attachments: AttachmentInput[],
    userId?: string
): Promise<{ processed: ProcessedAttachment[]; injectionText: string }> {
    const processed = await processAttachments(attachments, userId);
    const injectionText = buildAttachmentInjection(processed);

    return { processed, injectionText };
}
