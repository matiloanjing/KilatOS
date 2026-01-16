/**
 * CodeAudit API Route
 * GitHub repository analysis and automated PR creation
 * Copyright © 2025 KilatCode Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/options';
import { createGitHubClient } from '@/lib/github/client';
import { analyzeRepository, generateFixes } from '@/lib/github/analyzer';
import { createAuditFixPR } from '@/lib/github/pr-automation';

// Request validation schema
const AuditRequestSchema = z.object({
    repoUrl: z.string().url(),
    checks: z.array(z.enum(['security', 'performance', 'bugs', 'style'])).optional(),
    autoFix: z.boolean().optional().default(false),
    createPR: z.boolean().optional().default(false),
    maxFiles: z.number().optional()
});

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get GitHub access token
        const accessToken = (session.user as any).accessToken;
        const provider = (session.user as any).provider;

        if (provider !== 'github' || !accessToken) {
            return NextResponse.json(
                { error: 'GitHub authentication required' },
                { status: 403 }
            );
        }

        // Validate request
        const body = await req.json();
        const validatedData = AuditRequestSchema.parse(body);

        // Parse repository URL
        const repoMatch = validatedData.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!repoMatch) {
            return NextResponse.json(
                { error: 'Invalid GitHub repository URL' },
                { status: 400 }
            );
        }

        const [, owner, repo] = repoMatch;

        // Create GitHub client
        const githubClient = createGitHubClient(accessToken);

        // Analyze repository
        console.log(`🔍 Starting analysis: ${owner}/${repo}`);
        const analysis = await analyzeRepository(githubClient, owner, repo, {
            maxFiles: validatedData.maxFiles,
            checks: validatedData.checks
        });

        // Generate fixes if requested
        let fixes: Record<string, string> | undefined;
        let prResult;

        if (validatedData.autoFix && analysis.issues.length > 0) {
            console.log(`🔧 Generating fixes for ${analysis.issues.length} issues`);
            fixes = await generateFixes(githubClient, owner, repo, analysis.issues);

            // Create PR if requested
            if (validatedData.createPR && Object.keys(fixes).length > 0) {
                console.log(`🔀 Creating pull request with fixes`);
                prResult = await createAuditFixPR(githubClient, owner, repo, {
                    issues: analysis.issues.map(i => ({
                        file: i.file,
                        issue: i.message,
                        fix: i.suggestedFix || 'Auto-generated fix'
                    })),
                    fixes
                });
            }
        }

        return NextResponse.json({
            success: true,
            analysis: {
                ...analysis,
                fixes: fixes ? Object.keys(fixes).length : 0
            },
            pullRequest: prResult
        });

    } catch (error) {
        console.error('CodeAudit API error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation error', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// GET endpoint for checking auth status
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            );
        }

        const provider = (session.user as any).provider;
        const hasGitHubAccess = provider === 'github';

        return NextResponse.json({
            authenticated: true,
            user: {
                name: session.user.name,
                email: session.user.email,
                provider
            },
            hasGitHubAccess
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to check auth status' },
            { status: 500 }
        );
    }
}
