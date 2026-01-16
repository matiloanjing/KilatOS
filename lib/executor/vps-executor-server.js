/**
 * VPS Executor Server
 * 
 * Express API endpoint for code execution fallback
 * Deploy this on your VPS alongside Playwright/KilatCrawl
 * 
 * Usage: 
 *   npm install express
 *   node vps-executor-server.js
 * 
 * Endpoints:
 *   GET  /health       - Health check
 *   POST /execute      - Execute code
 *   GET  /languages    - List supported languages
 * 
 * Environment:
 *   PORT=3001  (default)
 * 
 * Copyright © 2026 KilatTutor
 */

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
    PORT: process.env.PORT || 3001,
    MAX_TIMEOUT: 60000,     // 60 seconds max
    MAX_CODE_SIZE: 100000,  // 100KB max
    TEMP_DIR: path.join(os.tmpdir(), 'kilat-executor'),

    // Language configurations
    LANGUAGES: {
        javascript: {
            extension: '.js',
            command: 'node',
            args: []
        },
        typescript: {
            extension: '.ts',
            command: 'npx',
            args: ['tsx']
        },
        python: {
            extension: '.py',
            command: 'python3',
            args: []
        },
        rust: {
            extension: '.rs',
            command: 'rustc',
            compile: true,
            runCommand: (outPath) => [outPath]
        },
        go: {
            extension: '.go',
            command: 'go',
            args: ['run']
        },
        php: {
            extension: '.php',
            command: 'php',
            args: []
        }
    }
};

// Ensure temp directory exists
fs.mkdir(CONFIG.TEMP_DIR, { recursive: true }).catch(() => { });

// ============================================================================
// Middleware
// ============================================================================

// CORS for KilatTutor
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// Routes
// ============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'KilatExecutor VPS',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        languages: Object.keys(CONFIG.LANGUAGES)
    });
});

/**
 * List supported languages
 */
app.get('/languages', (req, res) => {
    res.json({
        languages: Object.keys(CONFIG.LANGUAGES),
        details: Object.fromEntries(
            Object.entries(CONFIG.LANGUAGES).map(([name, config]) => [
                name,
                { extension: config.extension, command: config.command }
            ])
        )
    });
});

/**
 * Execute code
 */
app.post('/execute', async (req, res) => {
    const { code, language, stdin = '', timeout = 30000 } = req.body;
    const startTime = Date.now();

    // Validation
    if (!code || !language) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields: code, language'
        });
    }

    if (code.length > CONFIG.MAX_CODE_SIZE) {
        return res.status(400).json({
            success: false,
            error: `Code size exceeds limit (${CONFIG.MAX_CODE_SIZE} bytes)`
        });
    }

    const langConfig = CONFIG.LANGUAGES[language];
    if (!langConfig) {
        return res.status(400).json({
            success: false,
            error: `Unsupported language: ${language}`,
            supported: Object.keys(CONFIG.LANGUAGES)
        });
    }

    const effectiveTimeout = Math.min(timeout, CONFIG.MAX_TIMEOUT);

    try {
        // Create temp file
        const jobId = crypto.randomUUID();
        const tempDir = path.join(CONFIG.TEMP_DIR, jobId);
        await fs.mkdir(tempDir, { recursive: true });

        const filename = `main${langConfig.extension}`;
        const filepath = path.join(tempDir, filename);
        await fs.writeFile(filepath, code);

        // Execute
        const result = await executeCommand(
            langConfig.command,
            [...langConfig.args, filepath],
            stdin,
            effectiveTimeout,
            tempDir
        );

        // Cleanup
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });

        res.json({
            success: result.exitCode === 0,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            executionTime: Date.now() - startTime,
            memoryUsed: result.memoryUsed
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            executionTime: Date.now() - startTime
        });
    }
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Execute a command with timeout
 */
function executeCommand(command, args, stdin, timeout, cwd) {
    return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let killed = false;

        const proc = spawn(command, args, {
            cwd,
            timeout,
            maxBuffer: 1024 * 1024, // 1MB
            env: { ...process.env, PATH: process.env.PATH }
        });

        // Timeout handler
        const timer = setTimeout(() => {
            killed = true;
            proc.kill('SIGKILL');
        }, timeout);

        // Collect output
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        // Send stdin if provided
        if (stdin) {
            proc.stdin.write(stdin);
            proc.stdin.end();
        }

        proc.on('close', (code, signal) => {
            clearTimeout(timer);

            resolve({
                stdout: stdout.substring(0, 100000), // Limit output
                stderr: stderr.substring(0, 100000),
                exitCode: killed ? 137 : (code ?? 1),
                signal: signal || (killed ? 'SIGKILL' : null),
                memoryUsed: process.memoryUsage().heapUsed
            });
        });

        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

// ============================================================================
// Start Server
// ============================================================================

app.listen(CONFIG.PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║        KilatExecutor VPS Server                ║
╠════════════════════════════════════════════════╣
║  Status:    RUNNING                            ║
║  Port:      ${CONFIG.PORT}                              ║
║  Languages: ${Object.keys(CONFIG.LANGUAGES).join(', ')}   ║
╚════════════════════════════════════════════════╝

Endpoints:
  GET  /health     - Health check
  POST /execute    - Execute code  
  GET  /languages  - List languages

Example:
  curl -X POST http://localhost:${CONFIG.PORT}/execute \\
    -H "Content-Type: application/json" \\
    -d '{"language":"javascript","code":"console.log(\"Hello!\")"}'
    `);
});

module.exports = app; // For testing
