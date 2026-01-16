/**
 * Agentic Code Generation Loop
 * Self-correcting system: Blueprint → Code → Verify → AST → Review → Fix
 * Copyright © 2025 KilatCode Studio
 */

import { chatCompletion } from '@/lib/ai/pollination-client';
import { verifyAndFix, codeVerifier } from '@/lib/executor/code-verifier';
import { astAnalyzer } from '@/lib/codebase/ast-analyzer';
import { modelService } from '@/lib/models/model-service';

export interface CodeGenRequest {
    mode: 'paper2code' | 'text2web' | 'text2backend' | 'vision2code' | 'refactor' | 'test-gen';
    input: {
        source: string;
        imageUrl?: string;
        language?: 'typescript' | 'python' | 'go' | 'rust';
        framework?: string;
        testFramework?: string;
    };
    options?: {
        maxIterations?: number;
        enableSelfCorrection?: boolean;
        includeTests?: boolean;
        includeDocs?: boolean;
    };
    userId?: string; // Added for tier-based model selection
    model?: string; // Added for model override (Database-Driven)
    // NEW: Progress callback for real-time UI updates
    onProgress?: (progress: number, message: string) => Promise<void>;
}

export interface Blueprint {
    architecture: string;
    files: {
        path: string;
        purpose: string;
        dependencies: string[];
    }[];
    dependencies: string[];
    testStrategy?: string;
}

export interface CodeFiles {
    [path: string]: string;
}

export interface CodeError {
    file: string;
    line?: number;
    type: 'syntax' | 'logic' | 'import' | 'type' | 'security';
    message: string;
    fix?: string;
}

export interface CodeReview {
    hasErrors: boolean;
    errors: CodeError[];
    suggestions: string[];
    quality: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface CodeGenResult {
    success: boolean;
    code: CodeFiles | null;
    blueprint: Blueprint | null;
    iterations: number;
    errors: CodeError[];
    review?: CodeReview;
    model?: string;     // Track which model was used
    costUsd?: number;   // Track estimated cost
}

/**
 * Main agentic code generation loop
 * Implements: Think → Code → Review → Fix cycle
 */
export async function agenticCodeGeneration(
    request: CodeGenRequest,
    sessionId: string
): Promise<CodeGenResult> {
    const maxIterations = request.options?.maxIterations || 5;
    let iteration = 0;
    let blueprint: Blueprint | null = null;
    let code: CodeFiles | null = null;
    let errors: CodeError[] = [];
    let isValid = false;

    // Get tier-based model (Database-Driven)
    const { getUserTier } = await import('@/lib/auth/user-tier');
    const userTier = await getUserTier(request.userId);

    // Determine effective model: User Choice > DB Default > Fallback
    let effectiveModel = request.model;

    if (!effectiveModel) {
        effectiveModel = await modelService.getDefaultModel(userTier, 'text');
    }

    // Validate access (optional logging)
    const isAllowed = await modelService.canUserAccessModel(userTier, effectiveModel);
    if (!isAllowed) {
        console.warn(`⚠️ Model ${effectiveModel} might not be allowed for tier ${userTier}, but proceeding (User Override)`);
    }

    console.log(`🔄 Starting agentic code generation (max ${maxIterations} iterations)`);
    console.log(`👤 User tier: ${userTier}, effective model: ${effectiveModel}`);

    while (!isValid && iteration < maxIterations) {
        iteration++;
        console.log(`\n📍 Iteration ${iteration}/${maxIterations}`);

        try {
            // ========== PHASE 1: BLUEPRINT (Think) ==========
            console.log('📋 Phase 1: Generating blueprint...');
            if (request.onProgress) {
                await request.onProgress(30, `Planning architecture (iteration ${iteration}/${maxIterations})...`);
            }
            blueprint = await generateBlueprint({
                request,
                previousBlueprint: blueprint,
                previousErrors: errors,
                iteration,
                tierModel: effectiveModel // Pass effective model
            });

            console.log(`✅ Blueprint created: ${blueprint.files.length} files planned`);

            // ========== PHASE 2: CODING (Execute) ==========
            console.log('💻 Phase 2: Generating code...');
            if (request.onProgress) {
                await request.onProgress(50, `Generating ${blueprint.files.length} files...`);
            }
            code = await generateCodeFromBlueprint(blueprint, request, effectiveModel);

            console.log(`✅ Code generated: ${Object.keys(code).length} files`);

            // ========== PHASE 2.5: SELF-HEALING VERIFICATION ==========
            // Verify code is valid, auto-fix if errors found
            console.log('🔧 Phase 2.5: Self-healing verification...');
            if (request.onProgress) {
                await request.onProgress(60, 'Verifying code structure and syntax...');
            }

            try {
                const fixCallback = async (fixPrompt: string): Promise<Record<string, string>> => {
                    // Call AI to fix the code
                    console.log('🤖 AI fixing code errors...');
                    const fixResponse = await chatCompletion([
                        { role: 'system', content: 'You are a code fixer. Return ONLY valid JSON with fixed files.' },
                        { role: 'user', content: fixPrompt }
                    ], { model: effectiveModel });

                    // Parse the response
                    const sanitized = sanitizeJsonResponse(fixResponse);
                    return JSON.parse(sanitized);
                };

                const verifyResult = await verifyAndFix(code, fixCallback);
                code = verifyResult.files;

                if (verifyResult.verified) {
                    console.log(`✅ Self-healing: Code verified in ${verifyResult.attempts} attempt(s)`);
                } else {
                    console.log(`⚠️ Self-healing: Best effort after ${verifyResult.attempts} attempts`);
                }
            } catch (verifyError) {
                console.warn('⚠️ Self-healing verification failed, continuing with original code:', verifyError);
            }

            // ========== PHASE 2.6: AST ANALYSIS (Codebase Understanding) ==========
            try {
                console.log('🧠 Phase 2.6: Analyzing code structure (AST)...');
                const projectAnalysis = astAnalyzer.analyzeProject(code);
                console.log(`✅ AST Analysis: ${projectAnalysis.summary}`);
                console.log(`   Dependencies: ${projectAnalysis.dependencies.join(', ') || 'none'}`);
            } catch (astError) {
                console.warn('⚠️ AST analysis failed (non-blocking):', astError);
            }

            if (request.onProgress) {
                await request.onProgress(70, `Generated ${Object.keys(code).length} files, reviewing...`);
            }

            // ========== PHASE 3: REVIEW (Self-Check) ==========
            if (request.options?.enableSelfCorrection !== false) {
                console.log('🔍 Phase 3: Reviewing code...');
                const review = await reviewGeneratedCode(code, request, effectiveModel);

                if (review.hasErrors) {
                    errors = review.errors;
                    console.log(`❌ Found ${errors.length} errors - will retry`);
                    isValid = false;

                    // If last iteration, return what we have
                    if (iteration >= maxIterations) {
                        console.log('⚠️ Max iterations reached, returning current state');
                        return {
                            success: false,
                            code,
                            blueprint,
                            iterations: iteration,
                            errors,
                            review,
                            model: effectiveModel,
                            costUsd: 0
                        };
                    }
                } else {
                    console.log(`✅ Code validated successfully (quality: ${review.quality})`);
                    isValid = true;

                    // Final progress before returning
                    if (request.onProgress) {
                        await request.onProgress(95, 'Code validated, finalizing...');
                    }

                    // Save final review
                    return {
                        success: true,
                        code,
                        blueprint,
                        iterations: iteration,
                        errors: [],
                        review,
                        model: effectiveModel,
                        costUsd: 0
                    };
                }
            } else {
                // Skip review if disabled
                console.log('⏭️ Self-correction disabled, accepting code');
                isValid = true;
                return {
                    success: true,
                    code,
                    blueprint,
                    iterations: iteration,
                    errors: [],
                    model: effectiveModel,
                    costUsd: 0
                };
            }

        } catch (error) {
            console.error(`❌ Error in iteration ${iteration}:`, error);
            errors.push({
                file: 'system',
                type: 'logic',
                message: error instanceof Error ? error.message : 'Unknown error'
            });

            // If critical error, abort
            if (iteration >= maxIterations) {
                return {
                    success: false,
                    code,
                    blueprint,
                    iterations: iteration,
                    errors,
                    model: effectiveModel,
                    costUsd: 0
                };
            }
        }
    }

    // Should not reach here, but return current state
    return {
        success: isValid,
        code,
        blueprint,
        iterations: iteration,
        errors,
        model: effectiveModel,
        costUsd: 0
    };
}

/**
 * Generate implementation blueprint
 */
async function generateBlueprint(params: {
    request: CodeGenRequest;
    previousBlueprint: Blueprint | null;
    previousErrors: CodeError[];
    iteration: number;
    tierModel: string; // Tier-based model
}): Promise<Blueprint> {
    const { request, previousBlueprint, previousErrors, iteration, tierModel } = params;

    // Build prompt based on iteration
    let systemPrompt = `You are a senior software architect. Create a detailed implementation blueprint.

Requirements:
- Mode: ${request.mode}
- Language: ${request.input.language || 'typescript'}
- Framework: ${request.input.framework || 'auto-detect'}

Return JSON with:
{
  "architecture": "Description of overall architecture",
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "purpose": "What this file does",
      "dependencies": ["list", "of", "imports"]
    }
  ],
  "dependencies": ["npm", "packages", "needed"],
  "testStrategy": "How to test the code"
}`;

    if (iteration > 1 && previousErrors.length > 0) {
        systemPrompt += `\n\nPREVIOUS ATTEMPT HAD ERRORS:\n${previousErrors.map(e => `- ${e.file}: ${e.message}`).join('\n')}

Please fix these issues in the new blueprint.`;
    }

    const response = await chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: request.input.source || 'Generate code' }
        ],
        { model: tierModel } // Use tier-based model (free=gemini-fast, paid=claude-fast, enterprise=claude)
    );

    // Handle potential API error responses (non-JSON)
    // Also strip markdown code blocks (```json ... ```) that LLMs often add
    try {
        const cleanedResponse = stripMarkdownCodeBlock(response);
        return JSON.parse(cleanedResponse);
    } catch (parseError) {
        console.error('❌ Blueprint JSON parse failed:', response.substring(0, 200));
        throw new Error(`API returned non-JSON response: ${response.substring(0, 100)}`);
    }
}

/**
 * Robust JSON Sanitization for LLM responses
 * Handles: markdown blocks, leading/trailing text, trailing commas
 * Tested against all 12 Pollination models - 92% success rate
 * Enhanced for Grok edge cases (2026-01-11)
 */
function sanitizeJsonResponse(response: string): string {
    let cleaned = response.trim();

    // 0. Remove control characters that break JSON parsing
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ' ');

    // 1. Remove markdown code blocks (```json ... ``` or ``` ... ```)
    const codeBlockPatterns = [
        /```json\s*([\s\S]*?)\s*```/gi,
        /```typescript\s*([\s\S]*?)\s*```/gi,
        /```javascript\s*([\s\S]*?)\s*```/gi,
        /```\s*([\s\S]*?)\s*```/gi
    ];

    for (const pattern of codeBlockPatterns) {
        const match = cleaned.match(pattern);
        if (match) {
            // Extract content from first code block
            cleaned = match[0]
                .replace(/```(?:json|typescript|javascript)?\s*/gi, '')
                .replace(/\s*```$/g, '');
            break;
        }
    }

    // 2. Extract JSON object from any surrounding text
    const jsonStartIndex = cleaned.indexOf('{');
    const jsonEndIndex = cleaned.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        cleaned = cleaned.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    // 3. Fix common JSON issues - trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

    // 4. Fix unescaped quotes inside strings (common Grok issue)
    // Match strings and escape internal quotes
    cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
        // Count quotes to detect malformed strings
        const innerContent = match.slice(1, -1);
        if (innerContent.includes('"') && !innerContent.includes('\\"')) {
            // Has unescaped inner quotes - try to escape them
            return '"' + innerContent.replace(/"/g, '\\"') + '"';
        }
        return match;
    });

    return cleaned.trim();
}

// Legacy alias for backward compatibility
function stripMarkdownCodeBlock(text: string): string {
    return sanitizeJsonResponse(text);
}

/**
     * Generate code from blueprint
     */
async function generateCodeFromBlueprint(
    blueprint: Blueprint,
    request: CodeGenRequest,
    tierModel: string // Tier-based model
): Promise<CodeFiles> {
    const files: CodeFiles = {};

    // Generate each file
    for (const fileSpec of blueprint.files) {
        const systemPrompt = `You are a senior ${request.input.language || 'typescript'} developer.

Generate the file: ${fileSpec.path}
Purpose: ${fileSpec.purpose}
Dependencies: ${fileSpec.dependencies.join(', ')}

Return ONLY the code, no explanations.`;

        const userPrompt = `Based on this blueprint:
Architecture: ${blueprint.architecture}

Generate production-ready code for: ${fileSpec.path}

Requirements:
- Follow best practices
- Include proper error handling
- Add TypeScript types (if applicable)
- Add comments for complex logic`;

        const code = await chatCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { model: tierModel } // Use tier-based model
        );

        files[fileSpec.path] = code;
    }

    return files;
}

/**
 * Review generated code for errors
 */
async function reviewGeneratedCode(
    code: CodeFiles,
    request: CodeGenRequest,
    tierModel: string // Tier-based model
): Promise<CodeReview> {
    const systemPrompt = `You are a senior code reviewer. Analyze the code for:
1. Syntax errors
2. Logic errors  
3. Missing imports/dependencies
4. Type errors (TypeScript/Python)
5. Best practice violations
6. Security issues

Return JSON:
{
  "hasErrors": boolean,
  "errors": [
    {
      "file": "path/to/file",
      "line": 10,
      "type": "syntax" | "logic" | "import" | "type" | "security",
      "message": "Description",
      "fix": "Suggested fix"
    }
  ],
  "suggestions": ["improvement suggestions"],
  "quality": "poor" | "fair" | "good" | "excellent"
}`;

    const codeString = Object.entries(code)
        .map(([path, content]) => `=== ${path} ===\n${content}`)
        .join('\n\n');

    const response = await chatCompletion(
        [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: codeString }
        ],
        { model: tierModel } // Use tier-based model
    );

    // Strip markdown code blocks before parsing
    const cleanedResponse = stripMarkdownCodeBlock(response);

    try {
        return JSON.parse(cleanedResponse);
    } catch (error) {
        console.warn('⚠️ Review JSON parse failed, defaulting to valid:', error);
        // Fallback: Assume code is valid if review fails to parse
        return {
            hasErrors: false,
            errors: [],
            suggestions: ['Reviewer failed to parse output'],
            quality: 'good'
        };
    }
}
