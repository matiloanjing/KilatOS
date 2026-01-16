/**
 * KilatOS Code Sanitizer
 * 
 * Implements a safety layer similar to Lovable/Bolt to prevent common AI syntax errors 
 * before they reach the execution environment (WebContainer).
 */

export function sanitizeCode(rawCode: string): string {
    let code = rawCode;

    // 1. Strip Markdown Code Blocks ( ```tsx ... ``` )
    // AI often wraps code in backticks even when asked not to.
    const markdownRegex = /^```(?:tsx|jsx|javascript|typescript|js|ts)?\s*([\s\S]*?)\s*``` $/;
    const match = code.trim().match(markdownRegex);
    if (match && match[1]) {
        code = match[1];
    }

    // 2. Remove "Here is the code" preambles
    // If code starts with text before imports, try to slice it.
    // Heuristic: Look for first "import" or "export" or "function"
    const firstCodeIndex = code.search(/^(import|export|function|const|class|var|let)\s/m);
    if (firstCodeIndex > 0) {
        // Warning: This is aggressive, might delete comments. 
        // Better to rely on the Markdown strip first.
        // code = code.substring(firstCodeIndex); 
    }

    // 3. Ensure 'export default' exists
    // WebContainer React template requires a default export for the Entry file.
    if (!code.includes('export default')) {
        // Try to find the main function and add export default
        const functionMatch = code.match(/function\s+([A-Z]\w+)/);
        if (functionMatch && functionMatch[1]) {
            code += `\n\nexport default ${functionMatch[1]};`;
        } else {
            // Last resort: Wrap everything in a default component if it looks like JSX 
            if (code.includes('return') && code.includes('<')) {
                code = `export default function App() {\n${code}\n}`;
            }
        }
    }

    // 4. React Import Safety
    // Older React versions (and WebContainer) require React to be in scope
    if (!code.includes("import React") && !code.includes("import * as React")) {
        code = `import React from 'react';\n${code}`;
    }

    return code.trim();
}

/**
 * Validates dependencies to prevent "Module not found" errors
 */
export function scanDependencies(code: string): Record<string, string> {
    const deps: Record<string, string> = {
        'lucide-react': 'latest',
        'framer-motion': 'latest',
        'clsx': 'latest',
        'tailwind-merge': 'latest',
        'date-fns': 'latest'
    };

    // Scan for other imports
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
        const pkg = match[1];
        if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
            // It's a package
            // Basic mapping (naive) - a real system would query npm
            if (!deps[pkg]) {
                deps[pkg] = 'latest';
            }
        }
    }

    return deps;
}
