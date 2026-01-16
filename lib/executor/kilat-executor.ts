/**
 * KilatExecutor - Hybrid Code Execution System
 * 
 * "Apple Philosophy": Simple interface, powerful backend
 * 
 * Architecture:
 * 1. WebContainer (Browser) - User's resources, instant, JS/TS only
 * 2. Piston API (FREE) - 50+ languages, server-side, fallback
 * 3. VPS Sandbox - Last resort, custom languages
 * 
 * Copyright © 2026 KilatOS
 */

export type ExecutionLanguage =
    | 'javascript' | 'typescript' | 'python' | 'rust'
    | 'go' | 'java' | 'cpp' | 'c' | 'ruby' | 'php';

export type ExecutionMode = 'browser' | 'piston' | 'vps' | 'auto';

export interface ExecutionRequest {
    code: string;
    language: ExecutionLanguage;
    mode?: ExecutionMode;           // Default: 'auto'
    stdin?: string;                 // Input for program
    timeout?: number;               // Max execution time (ms)
    testCode?: string;              // Test code to run
}

export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;          // ms
    executorUsed: 'webcontainer' | 'piston' | 'vps';
    memoryUsed?: number;            // bytes
    error?: string;
}

export interface TestResult extends ExecutionResult {
    testsPassed: number;
    testsFailed: number;
    coverage?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    PISTON_API: 'https://emkc.org/api/v2/piston',
    VPS_API: process.env.VPS_EXECUTOR_URL || 'http://8.215.50.218:3002', // Port 3002 (3001 = Playwright)

    // Timeouts
    WEBCONTAINER_TIMEOUT: 30000,    // 30s
    PISTON_TIMEOUT: 10000,          // 10s
    VPS_TIMEOUT: 60000,             // 60s

    // Languages supported by WebContainer
    WEBCONTAINER_LANGUAGES: ['javascript', 'typescript'] as const,

    // Piston supported languages (subset)
    PISTON_LANGUAGES: [
        'javascript', 'typescript', 'python', 'rust', 'go',
        'java', 'cpp', 'c', 'ruby', 'php'
    ] as const
};

// ============================================================================
// WebContainer Executor (Browser-side)
// ============================================================================

class WebContainerExecutor {
    private container: any = null;
    private isBooting = false;

    /**
     * Check if WebContainer is supported in this environment
     */
    isSupported(): boolean {
        return typeof window !== 'undefined' && 'WebContainer' in window;
    }

    /**
     * Check if language is supported
     */
    supportsLanguage(language: ExecutionLanguage): boolean {
        return CONFIG.WEBCONTAINER_LANGUAGES.includes(language as any);
    }

    /**
     * Boot WebContainer (lazy initialization)
     */
    private async boot(): Promise<any> {
        if (this.container) return this.container;
        if (this.isBooting) {
            // Wait for existing boot
            return new Promise((resolve) => {
                const check = setInterval(() => {
                    if (this.container) {
                        clearInterval(check);
                        resolve(this.container);
                    }
                }, 100);
            });
        }

        this.isBooting = true;

        try {
            // Dynamically import WebContainer (webpack bypass for optional browser-only package)
            // @ts-ignore - Dynamic import with webpack bypass
            const importFn = new Function('specifier', 'return import(specifier)');
            const { WebContainer } = await importFn('@webcontainer/api');
            this.container = await WebContainer.boot();
            console.log('✅ WebContainer booted');
            return this.container;
        } catch (error) {
            console.warn('⚠️ WebContainer boot failed:', error);
            throw error;
        } finally {
            this.isBooting = false;
        }
    }

    /**
     * Execute code in WebContainer
     */
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            const container = await this.boot();

            // Mount code file
            const filename = request.language === 'typescript' ? 'index.ts' : 'index.js';
            await container.mount({
                [filename]: {
                    file: { contents: request.code }
                },
                'package.json': {
                    file: {
                        contents: JSON.stringify({
                            name: 'kilat-sandbox',
                            type: 'module',
                            scripts: {
                                start: request.language === 'typescript'
                                    ? 'npx tsx index.ts'
                                    : 'node index.js'
                            }
                        })
                    }
                }
            });

            // Run code
            const process = await container.spawn('npm', ['run', 'start']);

            let stdout = '';
            let stderr = '';

            process.output.pipeTo(new WritableStream({
                write(chunk) { stdout += chunk; }
            }));

            // Wait for completion or timeout
            const exitCode = await Promise.race([
                process.exit,
                new Promise<number>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')),
                        request.timeout || CONFIG.WEBCONTAINER_TIMEOUT)
                )
            ]);

            return {
                success: exitCode === 0,
                stdout,
                stderr,
                exitCode,
                executionTime: Date.now() - startTime,
                executorUsed: 'webcontainer'
            };

        } catch (error) {
            return {
                success: false,
                stdout: '',
                stderr: error instanceof Error ? error.message : 'Unknown error',
                exitCode: 1,
                executionTime: Date.now() - startTime,
                executorUsed: 'webcontainer',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// ============================================================================
// Piston API Executor (FREE Server-side)
// ============================================================================

class PistonExecutor {
    private versionsCache: Map<string, string> = new Map();

    /**
     * Check if Piston API is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${CONFIG.PISTON_API}/runtimes`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get language runtime info from Piston
     * Prefers Node.js over Deno for JavaScript
     */
    private async getRuntimeInfo(language: string): Promise<{ language: string; version: string }> {
        // Cache key
        const cacheKey = language;
        if (this.versionsCache.has(cacheKey)) {
            return JSON.parse(this.versionsCache.get(cacheKey)!);
        }

        try {
            const response = await fetch(`${CONFIG.PISTON_API}/runtimes`);
            const runtimes = await response.json();

            // For JavaScript, prefer Node.js over Deno
            if (language === 'javascript') {
                const nodeRuntime = runtimes.find((r: any) =>
                    r.language === 'javascript' && r.runtime === 'node'
                );
                if (nodeRuntime) {
                    const info = { language: 'javascript', version: nodeRuntime.version };
                    this.versionsCache.set(cacheKey, JSON.stringify(info));
                    return info;
                }
            }

            // For TypeScript, prefer tsc (Node) over deno-ts
            if (language === 'typescript') {
                const tsRuntime = runtimes.find((r: any) =>
                    r.language === 'typescript' && r.runtime !== 'deno'
                );
                if (tsRuntime) {
                    const info = { language: 'typescript', version: tsRuntime.version };
                    this.versionsCache.set(cacheKey, JSON.stringify(info));
                    return info;
                }
            }

            // Find matching runtime
            const runtime = runtimes.find((r: any) =>
                r.language === language || r.aliases?.includes(language)
            );

            if (runtime) {
                const info = { language: runtime.language, version: runtime.version };
                this.versionsCache.set(cacheKey, JSON.stringify(info));
                return info;
            }
        } catch (error) {
            console.warn('Failed to fetch runtimes:', error);
        }

        // Fallback defaults
        return { language, version: '*' };
    }

    /**
     * Execute code via Piston API
     */
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            const runtimeInfo = await this.getRuntimeInfo(request.language);
            const timeout = request.timeout || CONFIG.PISTON_TIMEOUT;

            const requestBody = {
                language: runtimeInfo.language,
                version: runtimeInfo.version,
                files: [{
                    name: this.getFilename(request.language),
                    content: request.code
                }],
                stdin: request.stdin || '',
                args: [],
                compile_timeout: timeout,  // in milliseconds
                run_timeout: timeout,      // in milliseconds (NOT divided by 1000!)
                compile_memory_limit: -1,
                run_memory_limit: -1
            };

            const response = await fetch(`${CONFIG.PISTON_API}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(request.timeout || CONFIG.PISTON_TIMEOUT)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Piston API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();

            // Debug logging
            console.log('   Piston response:', JSON.stringify(result, null, 2).substring(0, 500));

            // Handle both compile and run phases
            const compile = result.compile || {};
            const run = result.run || {};

            // Check for compile errors first
            if (compile.stderr && compile.stderr.length > 0) {
                return {
                    success: false,
                    stdout: compile.stdout || '',
                    stderr: compile.stderr,
                    exitCode: compile.code || 1,
                    executionTime: Date.now() - startTime,
                    executorUsed: 'piston',
                    error: 'Compilation failed'
                };
            }

            // Get run results
            const stdout = run.stdout || '';
            const stderr = run.stderr || '';
            const exitCode = typeof run.code === 'number' ? run.code : (run.signal ? 1 : 0);

            // Success if exit code is 0 OR if there's stdout and no error signals
            const success = exitCode === 0 && !run.signal;

            return {
                success,
                stdout,
                stderr,
                exitCode,
                executionTime: Date.now() - startTime,
                executorUsed: 'piston'
            };

        } catch (error) {
            console.error('   Piston error:', error);
            return {
                success: false,
                stdout: '',
                stderr: error instanceof Error ? error.message : 'Piston execution failed',
                exitCode: 1,
                executionTime: Date.now() - startTime,
                executorUsed: 'piston',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private getFilename(language: ExecutionLanguage): string {
        const extensions: Record<ExecutionLanguage, string> = {
            javascript: 'index.js',
            typescript: 'index.ts',
            python: 'main.py',
            rust: 'main.rs',
            go: 'main.go',
            java: 'Main.java',
            cpp: 'main.cpp',
            c: 'main.c',
            ruby: 'main.rb',
            php: 'main.php'
        };
        return extensions[language] || 'code.txt';
    }
}

// ============================================================================
// VPS Executor (Fallback)
// ============================================================================

class VPSExecutor {
    /**
     * Check if VPS executor is available
     */
    async isAvailable(): Promise<boolean> {
        if (!CONFIG.VPS_API || CONFIG.VPS_API.includes('your-vps.com')) {
            return false;
        }

        try {
            const response = await fetch(`${CONFIG.VPS_API}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Execute code on VPS
     */
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            const response = await fetch(`${CONFIG.VPS_API}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: request.code,
                    language: request.language,
                    stdin: request.stdin,
                    timeout: request.timeout || CONFIG.VPS_TIMEOUT
                }),
                signal: AbortSignal.timeout(request.timeout || CONFIG.VPS_TIMEOUT)
            });

            if (!response.ok) {
                throw new Error(`VPS API error: ${response.status}`);
            }

            const result = await response.json();

            return {
                success: result.exitCode === 0,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                exitCode: result.exitCode || 0,
                executionTime: Date.now() - startTime,
                executorUsed: 'vps',
                memoryUsed: result.memoryUsed
            };

        } catch (error) {
            return {
                success: false,
                stdout: '',
                stderr: error instanceof Error ? error.message : 'VPS execution failed',
                exitCode: 1,
                executionTime: Date.now() - startTime,
                executorUsed: 'vps',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// ============================================================================
// Main KilatExecutor Class
// ============================================================================

export class KilatExecutor {
    private webContainer = new WebContainerExecutor();
    private piston = new PistonExecutor();
    private vps = new VPSExecutor();

    /**
     * Execute code with automatic routing
     * "Apple Philosophy": Just works™
     */
    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        const mode = request.mode || 'auto';

        console.log(`🚀 KilatExecutor: ${request.language} code (mode: ${mode})`);

        switch (mode) {
            case 'browser':
                return this.executeInBrowser(request);
            case 'piston':
                return this.executeWithPiston(request);
            case 'vps':
                return this.executeOnVPS(request);
            case 'auto':
            default:
                return this.executeAuto(request);
        }
    }

    /**
     * Auto mode: Smart routing based on availability
     */
    private async executeAuto(request: ExecutionRequest): Promise<ExecutionResult> {
        // 1. Try WebContainer first (client-side, FREE)
        if (this.webContainer.isSupported() &&
            this.webContainer.supportsLanguage(request.language)) {
            console.log('   → Trying WebContainer (browser)...');
            const result = await this.webContainer.execute(request);
            if (result.success || !result.error?.includes('boot failed')) {
                return result;
            }
        }

        // 2. Fallback to Piston API (FREE, multi-language)
        if (await this.piston.isAvailable()) {
            console.log('   → Using Piston API (FREE)...');
            return this.piston.execute(request);
        }

        // 3. Last resort: VPS
        if (await this.vps.isAvailable()) {
            console.log('   → Using VPS fallback...');
            return this.vps.execute(request);
        }

        // 4. All executors unavailable
        return {
            success: false,
            stdout: '',
            stderr: 'No executor available. Please try again later.',
            exitCode: 1,
            executionTime: 0,
            executorUsed: 'piston',
            error: 'All executors unavailable'
        };
    }

    private async executeInBrowser(request: ExecutionRequest): Promise<ExecutionResult> {
        if (!this.webContainer.supportsLanguage(request.language)) {
            return {
                success: false,
                stdout: '',
                stderr: `WebContainer does not support ${request.language}`,
                exitCode: 1,
                executionTime: 0,
                executorUsed: 'webcontainer',
                error: 'Language not supported'
            };
        }
        return this.webContainer.execute(request);
    }

    private async executeWithPiston(request: ExecutionRequest): Promise<ExecutionResult> {
        return this.piston.execute(request);
    }

    private async executeOnVPS(request: ExecutionRequest): Promise<ExecutionResult> {
        return this.vps.execute(request);
    }

    /**
     * Execute code with tests
     */
    async executeWithTests(
        code: string,
        testCode: string,
        language: ExecutionLanguage
    ): Promise<TestResult> {
        // Combine code and tests
        const fullCode = `${code}\n\n// === TESTS ===\n${testCode}`;

        const result = await this.execute({
            code: fullCode,
            language,
            mode: 'auto'
        });

        // Parse test results from stdout
        const { testsPassed, testsFailed } = this.parseTestResults(result.stdout);

        return {
            ...result,
            testsPassed,
            testsFailed
        };
    }

    private parseTestResults(stdout: string): { testsPassed: number; testsFailed: number } {
        // Simple regex for common test formats
        const passMatch = stdout.match(/(\d+)\s*(passed|pass|✓)/i);
        const failMatch = stdout.match(/(\d+)\s*(failed|fail|✗)/i);

        return {
            testsPassed: passMatch ? parseInt(passMatch[1]) : 0,
            testsFailed: failMatch ? parseInt(failMatch[1]) : 0
        };
    }

    /**
     * Lint/audit code statically
     */
    async lintCode(code: string, language: ExecutionLanguage): Promise<{
        issues: Array<{ line: number; message: string; severity: 'error' | 'warning' }>;
        suggestions: string[];
    }> {
        // Basic pattern-based linting
        const issues: Array<{ line: number; message: string; severity: 'error' | 'warning' }> = [];
        const lines = code.split('\n');

        lines.forEach((line, index) => {
            // Check for common issues
            if (line.includes('console.log') && language === 'typescript') {
                issues.push({
                    line: index + 1,
                    message: 'console.log found - consider removing for production',
                    severity: 'warning'
                });
            }
            if (line.includes('any') && language === 'typescript') {
                issues.push({
                    line: index + 1,
                    message: 'Avoid using "any" type',
                    severity: 'warning'
                });
            }
            if (line.includes('eval(')) {
                issues.push({
                    line: index + 1,
                    message: 'eval() is dangerous - avoid using',
                    severity: 'error'
                });
            }
        });

        return {
            issues,
            suggestions: issues.length > 0
                ? ['Fix the issues above for better code quality']
                : ['Code looks clean!']
        };
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const kilatExecutor = new KilatExecutor();

// Default export for convenience
export default kilatExecutor;
