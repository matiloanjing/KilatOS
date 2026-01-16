/**
 * Vercel API Client
 * 
 * Handles all Vercel deployments via REST API
 * 
 * Features:
 * - Create deployments from file map
 * - Check deployment status
 * - Delete deployments (cleanup)
 * - List deployments
 * 
 * Copyright © 2026 KilatOS
 */

// ============================================================================
// Types
// ============================================================================

export interface VercelFile {
    file: string;      // Path relative to project root
    data: string;      // File content (will be base64 encoded)
    encoding?: 'base64' | 'utf-8';
}

export interface VercelDeployment {
    id: string;
    url: string;
    state: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED' | 'QUEUED';
    createdAt: number;
    readyState?: string;
}

export interface DeployOptions {
    projectName: string;
    files: Record<string, string>;  // path -> content
    framework?: 'nextjs' | 'vite' | 'express' | 'static';
    buildCommand?: string;
    outputDirectory?: string;
}

export interface DeployResult {
    success: boolean;
    deploymentId?: string;
    url?: string;
    error?: string;
}

export interface GitHubDeployOptions {
    projectName: string;
    githubRepo: string;  // format: "owner/repo"
    repoId: number;      // GitHub Repository ID (Required for Vercel)
    branch?: string;
    framework?: 'nextjs' | 'vite' | 'express' | 'static';
}

// ============================================================================
// Vercel Client Class
// ============================================================================

class VercelClient {
    private token: string;
    private teamId?: string;
    private baseUrl = 'https://api.vercel.com';

    constructor() {
        this.token = process.env.VERCEL_TOKEN || '';
        this.teamId = process.env.VERCEL_TEAM_ID;
    }

    /**
     * Check if client is configured
     */
    isConfigured(): boolean {
        return !!this.token;
    }

    /**
     * Create a new deployment
     */
    async createDeployment(options: DeployOptions): Promise<DeployResult> {
        if (!this.isConfigured()) {
            return { success: false, error: 'VERCEL_TOKEN not configured' };
        }

        try {
            console.log(`🚀 Vercel: Creating deployment for ${options.projectName}...`);

            // Convert files to Vercel format
            const vercelFiles: VercelFile[] = Object.entries(options.files).map(([path, content]) => ({
                file: path.startsWith('/') ? path.slice(1) : path,
                data: Buffer.from(content).toString('base64'),
                encoding: 'base64' as const
            }));

            // Create deployment payload
            const payload = {
                name: options.projectName,
                files: vercelFiles,
                projectSettings: {
                    framework: options.framework === 'static' ? null : (options.framework || 'nextjs'),
                    buildCommand: options.buildCommand,
                    outputDirectory: options.outputDirectory
                },
                target: 'preview'  // Always deploy as preview (not production)
            };

            const url = this.teamId
                ? `${this.baseUrl}/v13/deployments?teamId=${this.teamId}`
                : `${this.baseUrl}/v13/deployments`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ Vercel deploy error:', error);
                return { success: false, error: `Vercel API error: ${response.status}` };
            }

            const result = await response.json();
            console.log(`✅ Vercel: Deployment created: ${result.url}`);

            return {
                success: true,
                deploymentId: result.id,
                url: `https://${result.url}`
            };

        } catch (error) {
            console.error('❌ Vercel deploy failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Create deployment from GitHub repository
     * This connects Vercel to the GitHub repo instead of uploading files directly
     */
    async createDeploymentFromGitHub(options: GitHubDeployOptions): Promise<DeployResult> {
        if (!this.isConfigured()) {
            return { success: false, error: 'VERCEL_TOKEN not configured' };
        }

        try {
            console.log(`🚀 Vercel: Creating deployment from GitHub: ${options.githubRepo}...`);

            // Create deployment payload with Git source
            const payload: any = {
                name: options.projectName,
                gitSource: {
                    type: 'github',
                    repoId: options.repoId, // Required by Vercel API
                    ref: options.branch || 'main'
                },
                target: 'preview'  // Always deploy as preview (not production)
            };

            // Only add framework if not static (Vercel auto-detects static)
            if (options.framework && options.framework !== 'static') {
                payload.projectSettings = { framework: options.framework };
            }

            const url = this.teamId
                ? `${this.baseUrl}/v13/deployments?teamId=${this.teamId}`
                : `${this.baseUrl}/v13/deployments`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ Vercel GitHub deploy error:', error);
                return {
                    success: false,
                    error: `Vercel API error: ${response.status} - ${error.substring(0, 200)}`
                };
            }

            const result = await response.json();
            console.log(`✅ Vercel: GitHub deployment created: ${result.url}`);

            return {
                success: true,
                deploymentId: result.id,
                url: `https://${result.url}`
            };

        } catch (error) {
            console.error('❌ Vercel GitHub deploy failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get deployment status
     */
    async getDeployment(deploymentId: string): Promise<VercelDeployment | null> {
        if (!this.isConfigured()) return null;

        try {
            const url = this.teamId
                ? `${this.baseUrl}/v13/deployments/${deploymentId}?teamId=${this.teamId}`
                : `${this.baseUrl}/v13/deployments/${deploymentId}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) return null;

            const data = await response.json();
            return {
                id: data.id,
                url: data.url,
                state: data.readyState || data.state,
                createdAt: data.createdAt
            };

        } catch (error) {
            console.error('❌ Vercel get deployment error:', error);
            return null;
        }
    }

    /**
     * Delete a deployment
     */
    async deleteDeployment(deploymentId: string): Promise<boolean> {
        if (!this.isConfigured()) return false;

        try {
            console.log(`🗑️ Vercel: Deleting deployment ${deploymentId}...`);

            const url = this.teamId
                ? `${this.baseUrl}/v13/deployments/${deploymentId}?teamId=${this.teamId}`
                : `${this.baseUrl}/v13/deployments/${deploymentId}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok || response.status === 204) {
                console.log(`✅ Vercel: Deployment deleted`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('❌ Vercel delete error:', error);
            return false;
        }
    }

    /**
     * List all deployments (for cleanup purposes)
     */
    async listDeployments(limit = 20): Promise<VercelDeployment[]> {
        if (!this.isConfigured()) return [];

        try {
            const url = this.teamId
                ? `${this.baseUrl}/v6/deployments?teamId=${this.teamId}&limit=${limit}`
                : `${this.baseUrl}/v6/deployments?limit=${limit}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) return [];

            const data = await response.json();
            return data.deployments.map((d: any) => ({
                id: d.uid,
                url: d.url,
                state: d.readyState || d.state,
                createdAt: d.createdAt
            }));

        } catch (error) {
            console.error('❌ Vercel list error:', error);
            return [];
        }
    }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const vercelClient = new VercelClient();
export default VercelClient;
