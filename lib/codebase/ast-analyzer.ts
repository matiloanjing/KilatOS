/**
 * AST Analyzer for Codebase Understanding
 * 
 * Parses TypeScript/JavaScript code to extract:
 * - Functions and their signatures
 * - Classes and their methods
 * - Imports and dependencies
 * - Exports and public API
 * 
 * Uses TypeScript compiler API (already installed).
 * 
 * Copyright © 2026 KilatCode Studio
 */

import * as ts from 'typescript';

// ============================================================================
// Types
// ============================================================================

export interface FunctionInfo {
    name: string;
    kind: 'function' | 'arrow' | 'method';
    parameters: string[];
    returnType: string;
    isAsync: boolean;
    isExported: boolean;
    lineStart: number;
    lineEnd: number;
}

export interface ClassInfo {
    name: string;
    methods: FunctionInfo[];
    properties: string[];
    isExported: boolean;
    extendsClass?: string;
    implementsInterfaces: string[];
    lineStart: number;
    lineEnd: number;
}

export interface ImportInfo {
    module: string;
    imports: string[];
    isDefault: boolean;
    isNamespace: boolean;
}

export interface ExportInfo {
    name: string;
    kind: 'function' | 'class' | 'variable' | 'type' | 'default';
}

export interface CodebaseAnalysis {
    filePath: string;
    language: 'typescript' | 'javascript';
    imports: ImportInfo[];
    exports: ExportInfo[];
    functions: FunctionInfo[];
    classes: ClassInfo[];
    summary: string;
}

// ============================================================================
// AST Analyzer Class
// ============================================================================

export class ASTAnalyzer {
    /**
     * Analyze a single file
     */
    analyzeFile(code: string, filePath: string = 'file.tsx'): CodebaseAnalysis {
        const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

        const sourceFile = ts.createSourceFile(
            filePath,
            code,
            ts.ScriptTarget.Latest,
            true,
            isTS ? ts.ScriptKind.TSX : ts.ScriptKind.JSX
        );

        const imports: ImportInfo[] = [];
        const exports: ExportInfo[] = [];
        const functions: FunctionInfo[] = [];
        const classes: ClassInfo[] = [];

        // Walk the AST
        const visit = (node: ts.Node) => {
            // Imports
            if (ts.isImportDeclaration(node)) {
                imports.push(this.parseImport(node));
            }

            // Exports
            if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
                const exp = this.parseExport(node);
                if (exp) exports.push(exp);
            }

            // Functions
            if (ts.isFunctionDeclaration(node)) {
                const func = this.parseFunction(node, sourceFile);
                if (func) functions.push(func);
            }

            // Arrow functions at top level (const foo = () => {})
            if (ts.isVariableStatement(node)) {
                const arrowFunc = this.parseArrowFunction(node, sourceFile);
                if (arrowFunc) functions.push(arrowFunc);
            }

            // Classes
            if (ts.isClassDeclaration(node)) {
                const cls = this.parseClass(node, sourceFile);
                if (cls) classes.push(cls);
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        // Generate summary
        const summary = this.generateSummary(imports, exports, functions, classes);

        return {
            filePath,
            language: isTS ? 'typescript' : 'javascript',
            imports,
            exports,
            functions,
            classes,
            summary
        };
    }

    /**
     * Parse import declaration
     */
    private parseImport(node: ts.ImportDeclaration): ImportInfo {
        const module = (node.moduleSpecifier as ts.StringLiteral).text;
        const imports: string[] = [];
        let isDefault = false;
        let isNamespace = false;

        if (node.importClause) {
            // Default import: import Foo from 'module'
            if (node.importClause.name) {
                imports.push(node.importClause.name.text);
                isDefault = true;
            }

            // Named imports: import { foo, bar } from 'module'
            if (node.importClause.namedBindings) {
                if (ts.isNamedImports(node.importClause.namedBindings)) {
                    node.importClause.namedBindings.elements.forEach(element => {
                        imports.push(element.name.text);
                    });
                }
                // Namespace import: import * as foo from 'module'
                if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                    imports.push(node.importClause.namedBindings.name.text);
                    isNamespace = true;
                }
            }
        }

        return { module, imports, isDefault, isNamespace };
    }

    /**
     * Parse export declaration
     */
    private parseExport(node: ts.ExportDeclaration | ts.ExportAssignment): ExportInfo | null {
        if (ts.isExportAssignment(node)) {
            return { name: 'default', kind: 'default' };
        }

        // Named exports
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            const firstExport = node.exportClause.elements[0];
            if (firstExport) {
                return { name: firstExport.name.text, kind: 'variable' };
            }
        }

        return null;
    }

    /**
     * Parse function declaration
     */
    private parseFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): FunctionInfo | null {
        if (!node.name) return null;

        const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        return {
            name: node.name.text,
            kind: 'function',
            parameters: node.parameters.map(p => p.name.getText(sourceFile)),
            returnType: node.type?.getText(sourceFile) || 'any',
            isAsync: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
            isExported: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword),
            lineStart: lineStart + 1,
            lineEnd: lineEnd + 1
        };
    }

    /**
     * Parse arrow function from variable statement
     */
    private parseArrowFunction(node: ts.VariableStatement, sourceFile: ts.SourceFile): FunctionInfo | null {
        const declaration = node.declarationList.declarations[0];
        if (!declaration || !declaration.initializer) return null;
        if (!ts.isArrowFunction(declaration.initializer)) return null;

        const name = declaration.name.getText(sourceFile);
        const arrow = declaration.initializer;

        const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        return {
            name,
            kind: 'arrow',
            parameters: arrow.parameters.map(p => p.name.getText(sourceFile)),
            returnType: arrow.type?.getText(sourceFile) || 'any',
            isAsync: !!arrow.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
            isExported: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword),
            lineStart: lineStart + 1,
            lineEnd: lineEnd + 1
        };
    }

    /**
     * Parse class declaration
     */
    private parseClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ClassInfo | null {
        if (!node.name) return null;

        const methods: FunctionInfo[] = [];
        const properties: string[] = [];

        node.members.forEach(member => {
            if (ts.isMethodDeclaration(member) && member.name) {
                const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(member.getStart());
                const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(member.getEnd());

                methods.push({
                    name: member.name.getText(sourceFile),
                    kind: 'method',
                    parameters: member.parameters.map(p => p.name.getText(sourceFile)),
                    returnType: member.type?.getText(sourceFile) || 'any',
                    isAsync: !!member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword),
                    isExported: false,
                    lineStart: lineStart + 1,
                    lineEnd: lineEnd + 1
                });
            }

            if (ts.isPropertyDeclaration(member) && member.name) {
                properties.push(member.name.getText(sourceFile));
            }
        });

        // Get extends clause
        let extendsClass: string | undefined;
        const implementsInterfaces: string[] = [];

        node.heritageClauses?.forEach(clause => {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
                extendsClass = clause.types[0]?.expression.getText(sourceFile);
            }
            if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
                clause.types.forEach(t => implementsInterfaces.push(t.expression.getText(sourceFile)));
            }
        });

        const { line: lineStart } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: lineEnd } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        return {
            name: node.name.text,
            methods,
            properties,
            isExported: !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword),
            extendsClass,
            implementsInterfaces,
            lineStart: lineStart + 1,
            lineEnd: lineEnd + 1
        };
    }

    /**
     * Generate human-readable summary
     */
    private generateSummary(
        imports: ImportInfo[],
        exports: ExportInfo[],
        functions: FunctionInfo[],
        classes: ClassInfo[]
    ): string {
        const parts: string[] = [];

        if (imports.length > 0) {
            const deps = imports.map(i => i.module).join(', ');
            parts.push(`Imports: ${deps}`);
        }

        if (functions.length > 0) {
            const funcs = functions.map(f => f.name).join(', ');
            parts.push(`Functions: ${funcs}`);
        }

        if (classes.length > 0) {
            const cls = classes.map(c => c.name).join(', ');
            parts.push(`Classes: ${cls}`);
        }

        if (exports.length > 0) {
            const exp = exports.map(e => e.name).join(', ');
            parts.push(`Exports: ${exp}`);
        }

        return parts.join(' | ');
    }

    /**
     * Analyze multiple files and create a project summary
     */
    analyzeProject(files: Record<string, string>): {
        files: CodebaseAnalysis[];
        summary: string;
        dependencies: string[];
    } {
        const analyses: CodebaseAnalysis[] = [];
        const allDeps = new Set<string>();

        for (const [path, content] of Object.entries(files)) {
            try {
                const analysis = this.analyzeFile(content, path);
                analyses.push(analysis);

                // Collect external dependencies
                analysis.imports.forEach(imp => {
                    if (!imp.module.startsWith('.') && !imp.module.startsWith('@/')) {
                        allDeps.add(imp.module);
                    }
                });
            } catch (error) {
                console.warn(`[ASTAnalyzer] Failed to parse ${path}:`, error);
            }
        }

        const totalFunctions = analyses.reduce((sum, a) => sum + a.functions.length, 0);
        const totalClasses = analyses.reduce((sum, a) => sum + a.classes.length, 0);

        return {
            files: analyses,
            summary: `${analyses.length} files, ${totalFunctions} functions, ${totalClasses} classes`,
            dependencies: Array.from(allDeps)
        };
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const astAnalyzer = new ASTAnalyzer();
export default astAnalyzer;
