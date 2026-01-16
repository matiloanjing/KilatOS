/**
 * Query Sanitizer - Security Layer for RAG
 * Prevents prompt injection and sensitive data leaks
 * Copyright © 2026 KilatOS
 */

// ============================================================================
// Blacklisted Terms - Sensitive Keywords
// ============================================================================

const SENSITIVE_KEYWORDS = [
    // Credentials
    'password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'apikey',
    'credentials', 'private_key', 'ssh_key', 'bearer', 'auth_token',
    'access_token', 'refresh_token', 'jwt', 'session_token',
    'service_role_key', 'supabase_service', 'service_key',

    // Environment/Config
    '.env', 'env_file', 'config.json', 'secrets.json', '.credentials',
    'supabase_key', 'openai_key', 'database_url', 'connection_string',
    'NEXT_PUBLIC_', 'SUPABASE_URL', 'SUPABASE_ANON', 'SUPABASE_SERVICE',

    // System paths
    '/etc/passwd', '/etc/shadow', 'id_rsa', '.ssh/', 'authorized_keys',

    // User data access
    'other users', "users' emails", 'all users', 'user emails', 'user passwords', 'user data',
    'reveal secret', 'show credentials', 'database credentials',
];

const SQL_INJECTION_PATTERNS = [
    'DROP TABLE', 'DROP DATABASE', 'DELETE FROM', 'TRUNCATE TABLE',
    'INSERT INTO', 'UPDATE SET', 'ALTER TABLE', 'CREATE TABLE',
    'UNION SELECT', 'UNION ALL', 'SELECT *', 'SELECT FROM',
    '1=1', '1 = 1', "' OR '", '" OR "',
    '--', ';--', '/*', '*/', 'xp_', 'exec(',
];

const PROMPT_INJECTION_PATTERNS = [
    'ignore previous instructions',
    'ignore all instructions',
    'disregard the above',
    'forget everything',
    'new instructions:',
    'system prompt:',
    'you are now',
    'act as if',
    'pretend you are',
    'jailbreak',
    'DAN mode',
];

// ============================================================================
// Sanitization Functions
// ============================================================================

export interface SanitizationResult {
    originalQuery: string;
    sanitizedQuery: string;
    isSafe: boolean;
    blockedTerms: string[];
    riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'blocked';
}

/**
 * Sanitize user query before sending to RAG
 */
export function sanitizeRAGQuery(query: string): SanitizationResult {
    const blockedTerms: string[] = [];
    let sanitizedQuery = query;
    let riskScore = 0;

    // Check sensitive keywords
    for (const term of SENSITIVE_KEYWORDS) {
        if (query.toLowerCase().includes(term.toLowerCase())) {
            blockedTerms.push(term);
            sanitizedQuery = sanitizedQuery.replace(new RegExp(term, 'gi'), '[REDACTED]');
            riskScore += 3;
        }
    }

    // Check SQL injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
        if (query.toLowerCase().includes(pattern.toLowerCase())) {
            blockedTerms.push(pattern);
            sanitizedQuery = sanitizedQuery.replace(new RegExp(escapeRegex(pattern), 'gi'), '[BLOCKED]');
            riskScore += 5;
        }
    }

    // Check prompt injection patterns
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
        if (query.toLowerCase().includes(pattern.toLowerCase())) {
            blockedTerms.push(pattern);
            sanitizedQuery = sanitizedQuery.replace(new RegExp(escapeRegex(pattern), 'gi'), '[FILTERED]');
            riskScore += 4;
        }
    }

    // Determine risk level - STRICT blocking for any detected threats
    let riskLevel: SanitizationResult['riskLevel'];
    if (riskScore === 0) {
        riskLevel = 'safe';
    } else if (riskScore <= 2) {
        riskLevel = 'low';
    } else {
        // Any riskScore > 2 is BLOCKED (stricter threshold)
        riskLevel = 'blocked';
    }

    return {
        originalQuery: query,
        sanitizedQuery,
        isSafe: blockedTerms.length === 0,
        blockedTerms,
        riskLevel,
    };
}

/**
 * Sanitize RAG output before sending to user
 * Removes any accidentally leaked sensitive data
 */
export function sanitizeRAGOutput(output: string): string {
    let sanitized = output;

    // Remove any API keys that might be in output (min 8 chars after sk-)
    sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{8,}/g, '[API_KEY_REDACTED]');
    sanitized = sanitized.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[JWT_REDACTED]');

    // Remove potential database URLs (both postgres:// and postgresql://)
    sanitized = sanitized.replace(/postgres(ql)?:\/\/[^\s]+/g, '[DB_URL_REDACTED]');
    sanitized = sanitized.replace(/mongodb(\+srv)?:\/\/[^\s]+/g, '[DB_URL_REDACTED]');
    sanitized = sanitized.replace(/mysql:\/\/[^\s]+/g, '[DB_URL_REDACTED]');

    // Remove potential .env values and API key patterns
    sanitized = sanitized.replace(/[A-Z_]{2,}=[^\s]{8,}/g, (match) => {
        if (match.includes('KEY') || match.includes('SECRET') || match.includes('TOKEN') ||
            match.includes('PASSWORD') || match.includes('URL') || match.includes('CREDENTIAL')) {
            return '[ENV_VAR_REDACTED]';
        }
        return match;
    });

    // Remove any string that looks like an API key (alphanumeric 20+ chars)
    sanitized = sanitized.replace(/\b[a-zA-Z0-9]{32,}\b/g, '[LONG_KEY_REDACTED]');

    return sanitized;
}

/**
 * Check if query is asking for sensitive information
 */
export function isSensitiveQuery(query: string): boolean {
    const sensitiveQuestions = [
        'what is the password',
        'show me the api key',
        'give me the secret',
        'what are the credentials',
        'database password',
        'admin password',
        'root password',
        'show env variables',
        'list all secrets',
    ];

    const lowerQuery = query.toLowerCase();
    return sensitiveQuestions.some(q => lowerQuery.includes(q));
}

/**
 * Generate safe response for blocked queries
 */
export function getSafeResponse(blockedTerms: string[]): string {
    return `Maaf, saya tidak dapat membantu dengan pertanyaan yang berkaitan dengan: ${blockedTerms.slice(0, 3).join(', ')}. 

Untuk keamanan, saya tidak dapat memberikan informasi tentang:
- Password atau credentials
- API keys atau tokens
- Konfigurasi database
- File sensitif sistem

Silakan tanya hal lain yang bisa saya bantu! 🔒`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Export
// ============================================================================

export default {
    sanitizeRAGQuery,
    sanitizeRAGOutput,
    isSensitiveQuery,
    getSafeResponse,
};
