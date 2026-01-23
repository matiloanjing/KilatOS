/**
 * Download API Endpoint
 * 
 * GET: Get download URL for project ZIP
 * 
 * Copyright © 2026 KilatOS
 */

import { NextResponse } from 'next/server';
import { deployManager } from '@/lib/deploy/deploy-manager';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const result = await deployManager.getDownloadUrl(projectId);

        if (!result) {
            return NextResponse.json(
                { error: 'Project not found or not deployed' },
                { status: 404 }
            );
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('❌ Download URL error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get download URL' },
            { status: 500 }
        );
    }
}
export const dynamic = 'force-dynamic';
