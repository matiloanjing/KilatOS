/**
 * Deploy Status API Endpoint
 * 
 * GET: Check deployment status
 * DELETE: Cleanup deployment
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

        const status = await deployManager.getStatus(projectId);

        if (!status) {
            return NextResponse.json(
                { error: 'Deployment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(status);

    } catch (error) {
        console.error('❌ Deploy status error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get status' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        const success = await deployManager.cleanup(projectId);

        if (!success) {
            return NextResponse.json(
                { error: 'Cleanup failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Deployment cleaned up' });

    } catch (error) {
        console.error('❌ Cleanup error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Cleanup failed' },
            { status: 500 }
        );
    }
}
