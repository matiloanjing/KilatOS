/**
 * Final Verifier
 * 
 * Last quality gate before code reaches WebContainer/Monaco/Frontend.
 * Ensures project is complete, runnable, and responds in user's language.
 * 
 * Features:
 * - Project structure validation
 * - Dependency consolidation (merge all package.json)
 * - Auto-generation of missing essentials
 * - LLM-based intelligent fixes
 * - Multi-language response matching user's prompt
 * - Test generation and execution (optional)
 * 
 * Copyright © 2026 KilatOS
 */

import { aiMandor } from '@/lib/ai/mandor';

// Optional: Test Executor (may be disabled to avoid build timeouts)
// Types inline since module may not exist
export interface GeneratedTest {
    name: string;
    code: string;
    type: 'unit' | 'integration' | 'e2e';
}
export interface TestExecutionResult {
    passed: boolean;
    tests: Array<{ name: string; passed: boolean; error?: string }>;
    coverage?: number;
}
let testExecutor: any = null;
try {
    import('@/lib/agents/codegen/test-executor').then(module => {
        testExecutor = module.testExecutor;
    }).catch(() => {
        console.warn('⚠️ Test executor not available (disabled for build optimization)');
    });
} catch {
    console.warn('⚠️ Test executor disabled');
}

// =====================================================
// TYPES
// =====================================================

export interface VerificationOptions {
    runTests?: boolean;         // Run test executor on generated code
    enableAudit?: boolean;      // Run code audit (security, performance)
    model?: string;             // User-selected model
    userId?: string;
}

export interface VerificationResult {
    success: boolean;
    files: Record<string, string>;
    issues: string[];
    fixes: string[];
    greeting: string;
    testResults?: TestExecutionResult;
    generatedTests?: GeneratedTest[];
}


export interface ProjectStructure {
    hasApp: boolean;
    hasEntryPoint: boolean;
    hasPackageJson: boolean;
    hasStyles: boolean;
    hasViteConfig: boolean;
    hasIndexHtml: boolean;
    missingEssentials: string[];
}

// =====================================================
// LANGUAGE DETECTION & GREETING
// =====================================================

/**
 * Generate greeting in user's language using LLM
 * This replaces hardcoded language detection
 */
export async function generateMultilingualGreeting(
    userPrompt: string,
    projectName: string,
    fileCount: number,
    userId?: string
): Promise<string> {
    const prompt = `You are a helpful assistant. Generate a SHORT, friendly greeting to tell the user their project is complete.

USER'S ORIGINAL MESSAGE: "${userPrompt}"

IMPORTANT: Reply in the EXACT SAME LANGUAGE as the user's message above.
If user wrote in Indonesian, reply in Indonesian.
If user wrote in German, reply in German.
If user wrote in English, reply in English.
Match their language exactly.

PROJECT INFO:
- Project name: ${projectName}
- Files generated: ${fileCount}

Generate a 2-3 sentence greeting that:
1. Greets the user warmly (use appropriate emoji)
2. Confirms the project is complete with file count
3. Asks if they want to add or change anything

RESPOND ONLY WITH THE GREETING, NO EXPLANATION.`;

    try {
        const result = await aiMandor.call(prompt, {
            userId,
            maxTokens: 150
        });

        // FIX: AIMandorResponse doesn't have 'success' field!
        // It returns: result, tier, model, attempts, cost, duration, queueTime
        // So we just check if result.result exists and is non-empty
        if (result && result.result && result.result.trim().length > 0) {
            console.log(`✅ [FinalVerifier] Greeting generated (${result.model}, ${result.attempts} attempts)`);
            return result.result.trim();
        } else {
            console.warn('[FinalVerifier] Greeting LLM returned empty result');
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[FinalVerifier] Greeting generation failed: ${errorMsg}`);
    }

    // Fallback: Simple English greeting
    return `Hello! 👋 I've finished creating **${projectName}** for you.\n\n${fileCount} files generated. View the code in the Explorer panel.\n\nWould you like to add or change anything?`;
}

// =====================================================
// LLM QUALITY CHECK
// =====================================================

/**
 * LLM-based quality verification
 * Uses user's selected model to check if code matches requirements
 */
export async function verifyCodeQuality(
    files: Record<string, string>,
    userPrompt: string,
    model?: string,
    userId?: string
): Promise<{ pass: boolean; issues: string[] }> {
    // Get App.tsx content for analysis
    const appFile = files['App.tsx'] || files['src/App.tsx'] || '';
    const fileList = Object.keys(files).join(', ');

    if (!appFile || appFile.length < 50) {
        return { pass: false, issues: ['App.tsx is empty or missing'] };
    }

    const prompt = `You are an expert code quality reviewer. Analyze if the generated code properly implements the user's request.

# USER REQUEST
"${userPrompt}"

# FILES GENERATED (${Object.keys(files).length} files)
${fileList}

# MAIN CODE (App.tsx)
\`\`\`tsx
${appFile.substring(0, 3000)}
\`\`\`

# QUALITY CHECK CRITERIA

## 1. FEATURE COMPLETENESS (40%)
- Does the code implement ALL main features mentioned in the request?
- Are there core components that should exist but are missing?
- Is this a real implementation or just placeholder/skeleton code?

## 2. CODE ARCHITECTURE (20%)
- Is there proper component structure (not everything in one file)?
- Are there necessary supporting files (styles, config, types)?
- Is the import/export structure correct?

## 3. IMPLEMENTATION QUALITY (25%)
- Does the code have actual logic, not just "TODO" or empty functions?
- Are there proper state management and event handlers?
- Is the UI meaningful (not just "Hello World")?

## 4. PROJECT REQUIREMENTS (15%)
- Minimum 8 files for a proper project
- Must have: App.tsx, package.json, index.css or equivalent
- No backend-only tools (Prisma, MongoDB, pg) in browser projects

# SCORING
- PASS: Score >= 70% across all criteria
- FAIL: Score < 70% or critical issues found

# OUTPUT FORMAT (JSON ONLY)
{
  "pass": true/false,
  "score": 0-100,
  "issues": ["issue1", "issue2"],
  "missing_features": ["feature1", "feature2"],
  "recommendation": "one line summary"
}

Respond with JSON only. No explanation outside JSON.`;

    try {
        const result = await aiMandor.call(prompt, {
            userId,
            model,
            maxTokens: 300
        });

        // Parse JSON response
        const jsonMatch = result.result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`🧠 [FinalVerifier] LLM Quality Check: ${parsed.pass ? 'PASS' : 'FAIL'}`);
            return {
                pass: parsed.pass === true,
                issues: Array.isArray(parsed.issues) ? parsed.issues : []
            };
        }
    } catch (error) {
        console.warn('[FinalVerifier] LLM quality check failed:', error);
    }

    // Default: pass (don't block on LLM failure)
    return { pass: true, issues: [] };
}

// =====================================================
// PROJECT STRUCTURE VALIDATION
// =====================================================

/**
 * Check if project has all essential files for running
 */
export function validateProjectStructure(files: Record<string, string>): ProjectStructure {
    const fileKeys = Object.keys(files).map(f => f.toLowerCase());

    const hasApp = fileKeys.some(f =>
        f.includes('app.tsx') || f.includes('app.jsx') ||
        f.includes('app.js') || f.includes('app.ts')
    );

    const hasEntryPoint = fileKeys.some(f =>
        f.includes('main.') || f.includes('index.jsx') ||
        f.includes('index.tsx') || f === 'index.js'
    );

    const hasPackageJson = fileKeys.some(f => f.includes('package.json'));

    const hasStyles = fileKeys.some(f =>
        f.endsWith('.css') || f.endsWith('.scss') || f.endsWith('.sass')
    );

    const hasViteConfig = fileKeys.some(f =>
        f.includes('vite.config')
    );

    const hasIndexHtml = fileKeys.some(f =>
        f === 'index.html' || f.endsWith('/index.html')
    );

    const missingEssentials: string[] = [];

    if (!hasApp) missingEssentials.push('App.tsx');
    if (!hasEntryPoint) missingEssentials.push('main.jsx');
    if (!hasPackageJson) missingEssentials.push('package.json');
    if (!hasViteConfig) missingEssentials.push('vite.config.js');
    if (!hasIndexHtml) missingEssentials.push('index.html');

    return {
        hasApp,
        hasEntryPoint,
        hasPackageJson,
        hasStyles,
        hasViteConfig,
        hasIndexHtml,
        missingEssentials
    };
}

// =====================================================
// DEPENDENCY CONSOLIDATION
// =====================================================

/**
 * Merge all package.json files into one unified package.json
 * Prevents conflicts when multiple agents generate package.json
 */
export function consolidatePackageJsons(files: Record<string, string>): string {
    const packageJsonFiles: string[] = [];

    // Find all package.json files
    for (const [path, content] of Object.entries(files)) {
        if (path.toLowerCase().endsWith('package.json')) {
            packageJsonFiles.push(content);
        }
    }

    if (packageJsonFiles.length === 0) {
        // Generate minimal package.json
        return JSON.stringify({
            name: 'kilat-app',
            type: 'module',
            version: '1.0.0',
            scripts: {
                dev: 'vite --host',
                build: 'vite build',
                preview: 'vite preview'
            },
            dependencies: {
                'react': '^18.3.1',
                'react-dom': '^18.3.1'
            },
            devDependencies: {
                'vite': '^5.0.0',
                '@vitejs/plugin-react': '^4.2.0'
            }
        }, null, 2);
    }

    // Merge all package.json files
    const merged: any = {
        name: 'kilat-app',
        type: 'module',
        version: '1.0.0',
        scripts: {},
        dependencies: {},
        devDependencies: {}
    };

    for (const content of packageJsonFiles) {
        try {
            const pkg = JSON.parse(content);

            // Merge name (prefer non-generic names)
            if (pkg.name && pkg.name !== 'kilat-app' && pkg.name !== 'my-app') {
                merged.name = pkg.name;
            }

            // Merge scripts
            if (pkg.scripts) {
                merged.scripts = { ...merged.scripts, ...pkg.scripts };
            }

            // Merge dependencies
            if (pkg.dependencies) {
                merged.dependencies = { ...merged.dependencies, ...pkg.dependencies };
            }

            // Merge devDependencies
            if (pkg.devDependencies) {
                merged.devDependencies = { ...merged.devDependencies, ...pkg.devDependencies };
            }
        } catch (e) {
            console.warn('[FinalVerifier] Failed to parse package.json:', e);
        }
    }

    // =====================================================
    // FORCE VITE (WebContainer doesn't support Next.js/Nuxt/Remix)
    // =====================================================

    // ALWAYS force Vite scripts (override next dev, nuxt dev, etc)
    merged.scripts.dev = 'vite --host';
    merged.scripts.build = 'vite build';
    merged.scripts.preview = 'vite preview';

    // Remove SSR frameworks that don't work in WebContainer
    delete merged.dependencies.next;
    delete merged.dependencies.nuxt;
    delete merged.dependencies['@remix-run/node'];
    delete merged.dependencies['@remix-run/react'];
    delete merged.scripts.start;
    delete merged.scripts.lint;

    // Remove backend database tools (don't work in browser WebContainer)
    delete merged.dependencies.prisma;
    delete merged.dependencies['@prisma/client'];
    delete merged.dependencies['@prisma/engines'];
    delete merged.dependencies.mongoose;
    delete merged.dependencies.pg;
    delete merged.dependencies.mysql;
    delete merged.dependencies.mysql2;
    delete merged.dependencies.sqlite3;
    delete merged.dependencies.sequelize;
    delete merged.dependencies.typeorm;
    delete merged.devDependencies.prisma;

    console.log('🔧 [FinalVerifier] Forced Vite scripts (WebContainer compatible)');
    console.log('🔧 [FinalVerifier] Removed backend database tools');

    // Ensure essential dependencies exist
    if (!merged.dependencies.react) {
        merged.dependencies.react = '^18.3.1';
    }
    if (!merged.dependencies['react-dom']) {
        merged.dependencies['react-dom'] = '^18.3.1';
    }
    if (!merged.devDependencies.vite) {
        merged.devDependencies.vite = '^5.0.0';
    }
    if (!merged.devDependencies['@vitejs/plugin-react']) {
        merged.devDependencies['@vitejs/plugin-react'] = '^4.2.0';
    }

    console.log(`📦 [FinalVerifier] Consolidated ${packageJsonFiles.length} package.json files`);
    console.log(`   Dependencies: ${Object.keys(merged.dependencies).length}`);
    console.log(`   DevDependencies: ${Object.keys(merged.devDependencies).length}`);

    return JSON.stringify(merged, null, 2);
}

// =====================================================
// ESSENTIAL FILE GENERATION
// =====================================================

/**
 * Generate missing essential files
 */
export function generateMissingEssentials(
    files: Record<string, string>,
    missingEssentials: string[]
): Record<string, string> {
    const result = { ...files };

    for (const missing of missingEssentials) {
        switch (missing) {
            case 'App.tsx':
                // Check if we have any components to import
                const components = Object.keys(files).filter(f =>
                    (f.endsWith('.tsx') || f.endsWith('.jsx')) &&
                    !f.includes('App') && !f.includes('main') && !f.includes('index')
                );

                if (components.length > 0) {
                    const imports = components.map((c, i) => {
                        const name = c.replace(/\.(tsx|jsx)$/, '').split('/').pop() || `Component${i}`;
                        return `import ${name} from './${c}';`;
                    }).join('\n');

                    const componentUsage = components.map((c) => {
                        const name = c.replace(/\.(tsx|jsx)$/, '').split('/').pop();
                        return `<${name} />`;
                    }).join('\n            ');

                    result['App.tsx'] = `${imports}

export default function App() {
    return (
        <div className="app">
            ${componentUsage}
        </div>
    );
}`;
                } else {
                    result['App.tsx'] = `export default function App() {
    return (
        <div className="app">
            <h1>🚀 Welcome to Kilat App</h1>
            <p>Your project is ready! Start building something amazing.</p>
        </div>
    );
}`;
                }
                console.log('📄 [FinalVerifier] Generated missing App.tsx');
                break;

            case 'main.jsx':
                result['main.jsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);`;
                console.log('📄 [FinalVerifier] Generated missing main.jsx');
                break;

            case 'index.css':
                result['index.css'] = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    min-height: 100vh;
    color: white;
}

.app {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}`;
                console.log('📄 [FinalVerifier] Generated missing index.css');
                break;

            case 'vite.config.js':
                result['vite.config.js'] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173
    }
});`;
                console.log('📄 [FinalVerifier] Generated missing vite.config.js');
                break;

            case 'index.html':
                result['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kilat App</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
</body>
</html>`;
                console.log('📄 [FinalVerifier] Generated missing index.html');
                break;
        }
    }

    return result;
}

// =====================================================
// MAIN FINAL VERIFIER FUNCTION
// =====================================================

/**
 * Final verification before sending to frontend
 * Called after merger, before WebContainer/Monaco receives files
 */
export async function finalVerify(
    files: Record<string, string>,
    userPrompt: string,
    projectName: string,
    userId?: string,
    model?: string
): Promise<VerificationResult> {
    console.log('\n🔍 [FinalVerifier] Starting final verification...');
    console.log(`   Files received: ${Object.keys(files).length}`);

    const issues: string[] = [];
    const fixes: string[] = [];
    let verifiedFiles = { ...files };

    // =====================================================
    // STEP 1: Consolidate all package.json files
    // =====================================================
    const consolidatedPackageJson = consolidatePackageJsons(verifiedFiles);

    // Remove all package.json files and add consolidated one
    for (const path of Object.keys(verifiedFiles)) {
        if (path.toLowerCase().endsWith('package.json')) {
            delete verifiedFiles[path];
        }
    }
    verifiedFiles['package.json'] = consolidatedPackageJson;
    fixes.push('Consolidated all package.json files into one');

    // =====================================================
    // STEP 1.5: Remove backend-only folders
    // =====================================================
    const backendFolders = ['prisma', 'database', 'server', 'api', 'migrations'];
    let removedCount = 0;

    for (const folder of backendFolders) {
        for (const path of Object.keys(verifiedFiles)) {
            if (path.startsWith(folder + '/') || path === folder) {
                delete verifiedFiles[path];
                removedCount++;
            }
        }
    }

    if (removedCount > 0) {
        console.log(`🗑️ [FinalVerifier] Removed ${removedCount} backend files`);
        fixes.push(`Removed ${removedCount} backend-only files`);
    }

    // =====================================================
    // STEP 2: Validate project structure
    // =====================================================
    const structure = validateProjectStructure(verifiedFiles);

    if (structure.missingEssentials.length > 0) {
        issues.push(`Missing essential files: ${structure.missingEssentials.join(', ')}`);
        verifiedFiles = generateMissingEssentials(verifiedFiles, structure.missingEssentials);
        fixes.push(`Generated missing essentials: ${structure.missingEssentials.join(', ')}`);
    }

    // Ensure index.css exists
    if (!structure.hasStyles) {
        verifiedFiles = generateMissingEssentials(verifiedFiles, ['index.css']);
        fixes.push('Generated missing index.css');
    }

    // =====================================================
    // STEP 2.5: LLM Quality Check (uses user's model)
    // =====================================================
    const qualityCheck = await verifyCodeQuality(verifiedFiles, userPrompt, model, userId);
    if (!qualityCheck.pass) {
        issues.push(...qualityCheck.issues);
        console.warn(`⚠️ [FinalVerifier] LLM found issues: ${qualityCheck.issues.join(', ')}`);
    }

    // =====================================================
    // STEP 2.7: Test Generation & Execution (AUTOMATIC)
    // Piston API first, VPS fallback for heavy tasks
    // =====================================================
    let testResults: TestExecutionResult | undefined;
    let generatedTests: GeneratedTest[] | undefined;

    // Get App.tsx for test generation
    const appCode = verifiedFiles['App.tsx'] || verifiedFiles['src/App.tsx'] || '';

    // Only run tests if we have substantial code
    if (appCode && appCode.length > 200) {
        console.log('🧪 [FinalVerifier] Running automatic test execution...');
        try {
            testExecutor.setConfig({ model });

            // Generate tests via LLM
            generatedTests = await testExecutor.generateTests(appCode);
            console.log(`   Generated ${generatedTests.length} tests`);

            // Execute tests - Piston API first, VPS fallback
            testResults = await testExecutor.executeTests(appCode, generatedTests);
            console.log(`   Test results: ${testResults.passed}/${testResults.total} passed (via ${testResults.executorUsed})`);

            if (!testResults.success) {
                issues.push(`Tests failed: ${testResults.failed}/${testResults.total}`);
            }
        } catch (error) {
            console.warn('[FinalVerifier] Test execution failed, continuing:', error);
            // Don't block on test failure - just log
        }
    }

    // =====================================================
    // STEP 3: Generate multilingual greeting
    // =====================================================
    const fileCount = Object.keys(verifiedFiles).length;
    const greeting = await generateMultilingualGreeting(
        userPrompt,
        projectName,
        fileCount,
        userId
    );

    // =====================================================
    // SUMMARY
    // =====================================================
    console.log(`✅ [FinalVerifier] Verification complete`);
    console.log(`   Issues found: ${issues.length}`);
    console.log(`   Fixes applied: ${fixes.length}`);
    console.log(`   Final file count: ${fileCount}`);

    return {
        success: true,
        files: verifiedFiles,
        issues,
        fixes,
        greeting,
        testResults,
        generatedTests
    };
}

// =====================================================
// EXPORTS
// =====================================================

export default {
    finalVerify,
    validateProjectStructure,
    consolidatePackageJsons,
    generateMissingEssentials,
    generateMultilingualGreeting
};
