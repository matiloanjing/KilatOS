/**
 * GitHub API Client
 * Repository access and manipulation
 * Copyright © 2025 KilatCode Studio
 */

import { Octokit } from '@octokit/rest';

export interface GitHubRepo {
    owner: string;
    repo: string;
    id: number;
    fullName: string;
    description?: string;
    private: boolean;
    defaultBranch: string;
}

export interface GitHubFile {
    path: string;
    content: string;
    sha?: string;
}

export interface PullRequestOptions {
    title: string;
    body: string;
    head: string; // branch name
    base: string; // target branch (usually 'main' or 'master')
}

/**
 * GitHub API Client
 */
export class GitHubClient {
    private octokit: Octokit;

    constructor(accessToken: string) {
        this.octokit = new Octokit({
            auth: accessToken
        });
    }

    /**
     * Get authenticated user info
     */
    async getAuthenticatedUser() {
        const { data } = await this.octokit.users.getAuthenticated();
        return data;
    }

    /**
     * List user repositories
     */
    async listRepositories(options: {
        visibility?: 'all' | 'public' | 'private';
        sort?: 'created' | 'updated' | 'pushed' | 'full_name';
        direction?: 'asc' | 'desc';
        per_page?: number;
    } = {}): Promise<GitHubRepo[]> {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
            visibility: options.visibility || 'all',
            sort: options.sort || 'updated',
            direction: options.direction || 'desc',
            per_page: options.per_page || 30
        });

        return data.map(repo => ({
            owner: repo.owner.login,
            repo: repo.name,
            id: repo.id,
            fullName: repo.full_name,
            description: repo.description || undefined, // Allow null description
            private: repo.private,
            defaultBranch: repo.default_branch
        }));
    }

    /**
     * Get repository info
     */
    async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
        const { data } = await this.octokit.repos.get({
            owner,
            repo
        });

        return {
            owner: data.owner.login,
            repo: data.name,
            id: data.id,
            fullName: data.full_name,
            description: data.description || undefined,
            private: data.private,
            defaultBranch: data.default_branch
        };
    }

    /**
     * Get file content from repository
     */
    async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFile> {
        const { data } = await this.octokit.repos.getContent({
            owner,
            repo,
            path,
            ref
        }) as any;

        // Decode base64 content
        const content = Buffer.from(data.content, 'base64').toString('utf-8');

        return {
            path: data.path,
            content,
            sha: data.sha
        };
    }

    /**
     * List files in directory
     */
    async listFiles(owner: string, repo: string, path: string = '', ref?: string): Promise<GitHubFile[]> {
        const { data } = await this.octokit.repos.getContent({
            owner,
            repo,
            path,
            ref
        }) as any;

        if (!Array.isArray(data)) {
            return [];
        }

        return data
            .filter((item: any) => item.type === 'file')
            .map((item: any) => ({
                path: item.path,
                content: '', // Content not included in directory listing
                sha: item.sha
            }));
    }

    /**
     * Create or update file
     */
    async createOrUpdateFile(
        owner: string,
        repo: string,
        path: string,
        content: string,
        message: string,
        sha?: string,
        branch?: string
    ): Promise<void> {
        await this.octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message,
            content: Buffer.from(content).toString('base64'),
            sha,
            branch
        });
    }

    /**
     * Create branch
     */
    async createBranch(owner: string, repo: string, branchName: string, fromBranch: string = 'main'): Promise<void> {
        // Get SHA of the base branch
        const { data: ref } = await this.octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${fromBranch}`
        });

        // Create new branch
        await this.octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: ref.object.sha
        });
    }

    /**
     * Create pull request
     */
    async createPullRequest(
        owner: string,
        repo: string,
        options: PullRequestOptions
    ): Promise<{ number: number; url: string }> {
        const { data } = await this.octokit.pulls.create({
            owner,
            repo,
            title: options.title,
            body: options.body,
            head: options.head,
            base: options.base
        });

        return {
            number: data.number,
            url: data.html_url
        };
    }

    /**
     * Commit multiple files
     */
    async commitMultipleFiles(
        owner: string,
        repo: string,
        branch: string,
        files: Array<{ path: string; content: string }>,
        message: string
    ): Promise<void> {
        // Get current commit SHA
        const { data: ref } = await this.octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`
        });

        const currentCommitSha = ref.object.sha;

        // Get current tree
        const { data: commit } = await this.octokit.git.getCommit({
            owner,
            repo,
            commit_sha: currentCommitSha
        });

        const currentTreeSha = commit.tree.sha;

        // Create blobs for new files
        const blobs = await Promise.all(
            files.map(async (file) => {
                const { data: blob } = await this.octokit.git.createBlob({
                    owner,
                    repo,
                    content: Buffer.from(file.content).toString('base64'),
                    encoding: 'base64'
                });

                return {
                    path: file.path,
                    mode: '100644' as const,
                    type: 'blob' as const,
                    sha: blob.sha
                };
            })
        );

        // Create new tree
        const { data: newTree } = await this.octokit.git.createTree({
            owner,
            repo,
            base_tree: currentTreeSha,
            tree: blobs
        });

        // Create new commit
        const { data: newCommit } = await this.octokit.git.createCommit({
            owner,
            repo,
            message,
            tree: newTree.sha,
            parents: [currentCommitSha]
        });

        // Update branch reference
        await this.octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${branch}`,
            sha: newCommit.sha
        });
    }

    /**
     * Create a new repository
     */
    async createRepository(name: string, options: {
        description?: string;
        private?: boolean;
        autoInit?: boolean;
    } = {}): Promise<GitHubRepo> {
        const { data } = await this.octokit.repos.createForAuthenticatedUser({
            name,
            description: options.description || `Generated by KilatOS`,
            private: options.private ?? false,
            auto_init: options.autoInit ?? true
        });

        return {
            owner: data.owner.login,
            repo: data.name,
            id: data.id,
            fullName: data.full_name,
            description: data.description || undefined,
            private: data.private,
            defaultBranch: data.default_branch
        };
    }

    /**
     * Delete a repository
     */
    async deleteRepository(owner: string, repo: string): Promise<boolean> {
        try {
            await this.octokit.repos.delete({
                owner,
                repo
            });
            return true;
        } catch (error) {
            console.error('Failed to delete repository:', error);
            return false;
        }
    }

    /**
     * Initialize repo with files (for new repos)
     */
    async initializeWithFiles(
        owner: string,
        repo: string,
        files: Array<{ path: string; content: string }>,
        message: string = 'Initial commit from KilatOS'
    ): Promise<void> {
        // For new repos with auto_init, we need to wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Use commitMultipleFiles
        await this.commitMultipleFiles(owner, repo, 'main', files, message);
    }

    /**
     * Download repository as ZIP
     */
    async downloadAsZip(owner: string, repo: string, ref: string = 'main'): Promise<ArrayBuffer> {
        const { data } = await this.octokit.repos.downloadZipballArchive({
            owner,
            repo,
            ref
        });
        return data as ArrayBuffer;
    }
}

/**
 * Create GitHub client from session
 */
export function createGitHubClient(accessToken: string): GitHubClient {
    return new GitHubClient(accessToken);
}
