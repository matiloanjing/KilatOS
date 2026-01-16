/**
 * Deploy API Endpoint
 * 
 * POST: Deploy generated project to Vercel
 * 
 * Copyright © 2026 KilatOS
 */

import { NextResponse } from 'next/server';
import { deployManager } from '@/lib/deploy/deploy-manager';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectName, files, userId, sessionId, framework, autoDeleteHours = 24 } = body;

        // Validate input
        if (!projectName || !files || Object.keys(files).length === 0) {
            return NextResponse.json(
                { error: 'projectName and files are required' },
                { status: 400 }
            );
        }

        // Check if deploy system is configured
        if (!deployManager.isConfigured()) {
            return NextResponse.json(
                { error: 'Deploy system not configured. Please set GITHUB_TOKEN and VERCEL_TOKEN.' },
                { status: 503 }
            );
        }

        // Start deployment
        console.log(`🚀 Deploy API: Starting deployment for ${projectName}`);

        const result = await deployManager.deploy({
            projectName,
            files,
            userId,
            sessionId,
            framework,
            autoDeleteHours
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error, projectId: result.projectId },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            projectId: result.projectId,
            deploymentId: result.deploymentId,
            previewUrl: result.previewUrl,
            githubRepo: result.githubRepo,
            status: result.status
        });

    } catch (error) {
        console.error('❌ Deploy API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Deployment failed' },
            { status: 500 }
        );
    }
}

// GET: Check if deploy system is available
export async function GET() {
    return NextResponse.json({
        available: deployManager.isConfigured(),
        features: {
            vercel: !!process.env.VERCEL_TOKEN,
            github: !!process.env.GITHUB_TOKEN
        }
    });
}
