/**
 * Deploy Manager
 * 
 * Orchestrates deployment workflow:
 * 1. Create GitHub repo
 * 2. Push generated code
 * 3. Deploy to Vercel
 * 4. Track in database
 * 5. Schedule cleanup
 * 
 * Copyright © 2026 KilatOS
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { GitHubClient } from '@/lib/github/client';
import { vercelClient, type DeployOptions } from './vercel-client';

// ============================================================================
// Types
// ============================================================================

export interface DeployRequest {
    projectName: string;
    files: Record<string, string>;  // path -> content
    userId?: string;
    sessionId?: string;
    framework?: 'nextjs' | 'vite' | 'express' | 'static';  // Updated: Added express support
    autoDeleteHours?: number;  // 0 = keep forever
}

// ============================================================================
// Framework Auto-Detection (for WebContainer compatibility)
// ============================================================================

/**
 * Detect framework from files for deployment
 * Matches WebContainerPreview.tsx detection logic
 */
function detectFramework(files: Record<string, string>): 'nextjs' | 'vite' | 'express' | 'static' {
    const packageJsonContent = files['package.json'] || files['/package.json'];
    if (!packageJsonContent) {
        // Check for static HTML
        if (files['index.html'] || files['/index.html']) {
            return 'static';
        }
        return 'static'; // Default to static if no package.json
    }

    try {
        const pkg = JSON.parse(packageJsonContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.next) return 'nextjs';
        if (deps.vite) return 'vite';
        if (deps.express) return 'express';
    } catch {
        // Invalid JSON, fallback to static
    }

    return 'static';
}

export interface DeployResult {
    success: boolean;
    projectId: string;
    deploymentId?: string;
    previewUrl?: string;
    githubRepo?: string;
    error?: string;
    status: 'pending' | 'building' | 'ready' | 'error';
}

export interface DeployStatus {
    projectId: string;
    status: 'pending' | 'building' | 'ready' | 'error' | 'deleted';
    previewUrl?: string;
    githubRepo?: string;
    createdAt: Date;
    error?: string;
}

// ============================================================================
// Deploy Manager Class
// ============================================================================

class DeployManager {
    private supabase;
    private github: GitHubClient | null = null;
    private githubOwner: string = '';

    constructor() {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Initialize GitHub client
     */
    private async initGitHub(): Promise<boolean> {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            console.error('❌ GITHUB_TOKEN not configured');
            return false;
        }

        this.github = new GitHubClient(token);

        try {
            const user = await this.github.getAuthenticatedUser();
            this.githubOwner = user.login;
            return true;
        } catch (error) {
            console.error('❌ GitHub authentication failed:', error);
            return false;
        }
    }

    /**
     * Check if deploy system is configured
     */
    isConfigured(): boolean {
        return !!process.env.GITHUB_TOKEN && vercelClient.isConfigured();
    }

    /**
     * Deploy a project
     */
    async deploy(request: DeployRequest): Promise<DeployResult> {
        const projectId = uuidv4();
        const repoName = `KilatOS-${request.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${projectId.slice(0, 8)}`;

        console.log(`🚀 DeployManager: Starting deployment for ${request.projectName}`);
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Files: ${Object.keys(request.files).length}`);

        // Initialize GitHub
        if (!await this.initGitHub()) {
            return {
                success: false,
                projectId,
                error: 'GitHub not configured',
                status: 'error'
            };
        }

        // Check Vercel
        if (!vercelClient.isConfigured()) {
            return {
                success: false,
                projectId,
                error: 'Vercel not configured',
                status: 'error'
            };
        }

        try {
            // 1. Create database record with tier-based retention
            const totalSize = Object.values(request.files).reduce((sum, content) => sum + content.length, 0);

            // Determine auto-delete hours based on tier (if not specified)
            let autoDeleteHours = request.autoDeleteHours;
            if (!autoDeleteHours || autoDeleteHours === 0) {
                // Default retention by tier
                const tier = request.userId ? 'free' : 'free';  // TODO: Get actual tier from user
                if (tier === 'free') autoDeleteHours = 24;      // 24 hours for free/anonymous
                else if (tier === 'pro') autoDeleteHours = 168; // 7 days for paid
                else if (tier === 'enterprise') autoDeleteHours = 720; // 30 days for enterprise
            }

            const autoDeleteAt = autoDeleteHours && autoDeleteHours > 0
                ? new Date(Date.now() + autoDeleteHours * 60 * 60 * 1000)
                : null;

            await this.supabase.from('deployments').insert({
                id: projectId,
                user_id: request.userId || null,
                session_id: request.sessionId || null,
                project_id: projectId,
                project_name: request.projectName,
                status: 'pending',
                files_count: Object.keys(request.files).length,
                total_size_bytes: totalSize,
                auto_delete_at: autoDeleteAt?.toISOString() || null,
                tier: request.userId ? 'free' : 'free'  // TODO: Get actual tier from subscriptions table
            });

            console.log(`   📝 Database record created`);

            // 2. Create GitHub repo
            console.log(`   📦 Creating GitHub repo: ${repoName}`);
            const repo = await this.github!.createRepository(repoName, {
                description: `${request.projectName} - Generated by KilatOS`,
                private: false,
                autoInit: true
            });

            // Update DB with repo info
            await this.supabase.from('deployments').update({
                github_repo: repo.fullName,
                status: 'building'
            }).eq('id', projectId);

            // 3. Push files to GitHub
            console.log(`   📤 Pushing ${Object.keys(request.files).length} files...`);
            const filesArray = Object.entries(request.files).map(([path, content]) => ({
                path: path.startsWith('/') ? path.slice(1) : path,
                content
            }));

            await this.github!.initializeWithFiles(
                this.githubOwner,
                repo.repo,
                filesArray,
                'Initial commit from KilatOS'
            );

            console.log(`   ✅ Files pushed to GitHub`);

            // 4. Deploy to Vercel FROM GITHUB REPO (not direct files)
            console.log(`   🔥 Deploying to Vercel from GitHub: ${repo.fullName}...`);
            const deployResult = await vercelClient.createDeploymentFromGitHub({
                projectName: repoName,
                githubRepo: repo.fullName,  // "owner/repo" format
                repoId: repo.id,            // Required for Vercel API
                branch: 'main',
                framework: request.framework || detectFramework(request.files)  // Auto-detect if not specified
            });

            if (!deployResult.success) {
                throw new Error(deployResult.error || 'Vercel deployment failed');
            }

            // 5. Update database
            await this.supabase.from('deployments').update({
                vercel_deployment_id: deployResult.deploymentId,
                preview_url: deployResult.url,
                status: 'ready',
                deployed_at: new Date().toISOString()
            }).eq('id', projectId);

            console.log(`   ✅ Deployed: ${deployResult.url}`);

            return {
                success: true,
                projectId,
                deploymentId: deployResult.deploymentId,
                previewUrl: deployResult.url,
                githubRepo: repo.fullName,
                status: 'ready'
            };

        } catch (error) {
            console.error('❌ Deployment failed:', error);

            // Update database with error
            await this.supabase.from('deployments').update({
                status: 'error',
                error_message: error instanceof Error ? error.message : 'Unknown error'
            }).eq('id', projectId);

            return {
                success: false,
                projectId,
                error: error instanceof Error ? error.message : 'Deployment failed',
                status: 'error'
            };
        }
    }

    /**
     * Get deployment status
     */
    async getStatus(projectId: string): Promise<DeployStatus | null> {
        const { data, error } = await this.supabase
            .from('deployments')
            .select('*')
            .eq('id', projectId)
            .single();

        if (error || !data) return null;

        // If building, check Vercel status
        if (data.status === 'building' && data.vercel_deployment_id) {
            const vercelStatus = await vercelClient.getDeployment(data.vercel_deployment_id);
            if (vercelStatus?.state === 'READY') {
                await this.supabase.from('deployments').update({
                    status: 'ready',
                    deployed_at: new Date().toISOString()
                }).eq('id', projectId);
                data.status = 'ready';
            } else if (vercelStatus?.state === 'ERROR') {
                await this.supabase.from('deployments').update({
                    status: 'error'
                }).eq('id', projectId);
                data.status = 'error';
            }
        }

        return {
            projectId: data.project_id,
            status: data.status,
            previewUrl: data.preview_url,
            githubRepo: data.github_repo,
            createdAt: new Date(data.created_at),
            error: data.error_message
        };
    }

    /**
     * Delete a deployment (cleanup)
     */
    async cleanup(projectId: string): Promise<boolean> {
        const { data } = await this.supabase
            .from('deployments')
            .select('*')
            .eq('id', projectId)
            .single();

        if (!data) return false;

        try {
            // Delete Vercel deployment
            if (data.vercel_deployment_id) {
                await vercelClient.deleteDeployment(data.vercel_deployment_id);
            }

            // Delete GitHub repo (SAFETY: Only delete KilatOS-* repos)
            if (data.github_repo && this.github) {
                const [owner, repo] = data.github_repo.split('/');

                // 🚨 CRITICAL SAFETY CHECK: Only delete repos with 'KilatOS-' prefix
                if (!repo.startsWith('KilatOS-')) {
                    console.error(`🚨 SAFETY ABORT: Attempted to delete non-KilatOS repo: ${data.github_repo}`);
                    console.error(`   This repo does not have 'KilatOS-' prefix and will NOT be deleted!`);
                    // Update DB to mark as error instead of deleted
                    await this.supabase.from('deployments').update({
                        status: 'error',
                        error_message: 'Safety check failed: Not a KilatOS repo'
                    }).eq('id', projectId);
                    return false;
                }

                console.log(`🗑️ Deleting GitHub repo: ${data.github_repo} (SAFE: has KilatOS- prefix)`);
                await this.github.deleteRepository(owner, repo);
            }

            // Update database
            await this.supabase.from('deployments').update({
                status: 'deleted',
                deleted_at: new Date().toISOString()
            }).eq('id', projectId);

            console.log(`🗑️ Cleaned up deployment: ${projectId}`);
            return true;

        } catch (error) {
            console.error('Cleanup failed:', error);
            return false;
        }
    }

    /**
     * Run cleanup for expired deployments
     */
    async runScheduledCleanup(): Promise<number> {
        const now = new Date().toISOString();

        const { data: expired } = await this.supabase
            .from('deployments')
            .select('id')
            .lt('auto_delete_at', now)
            .is('deleted_at', null)
            .neq('status', 'deleted');

        if (!expired || expired.length === 0) return 0;

        let cleaned = 0;
        for (const deployment of expired) {
            if (await this.cleanup(deployment.id)) {
                cleaned++;
            }
        }

        console.log(`🧹 Scheduled cleanup: ${cleaned}/${expired.length} deployments`);
        return cleaned;
    }

    /**
     * Get download URL for project
     */
    async getDownloadUrl(projectId: string): Promise<{ url: string } | null> {
        const { data } = await this.supabase
            .from('deployments')
            .select('github_repo')
            .eq('id', projectId)
            .single();

        if (!data?.github_repo) return null;

        const [owner, repo] = data.github_repo.split('/');
        return {
            url: `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`
        };
    }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const deployManager = new DeployManager();
export default DeployManager;
