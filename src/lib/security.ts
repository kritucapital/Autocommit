import crypto from 'crypto';

const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Get encryption key with validation
function getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required. Please set it in your .env file.');
    }
    return key;
}

const ENCRYPTION_KEY = getEncryptionKey();

// Ensure key is exactly 32 bytes
function getKey(): Buffer {
    const keyBuffer = Buffer.from(ENCRYPTION_KEY);
    if (keyBuffer.length < 32) {
        return Buffer.concat([keyBuffer, Buffer.alloc(32 - keyBuffer.length)]);
    }
    return keyBuffer.subarray(0, 32);
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Rate limiting removed - in-memory rate limiting doesn't scale across serverless instances
// For production at scale, implement with Redis (e.g., @upstash/ratelimit)
// This is a no-op that always allows requests
export function checkRateLimit(_identifier: string): { allowed: boolean; remaining: number } {
    return { allowed: true, remaining: 999 };
}

// Input sanitization
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>\"'&]/g, '') // Remove potential XSS characters
        .substring(0, 1000); // Limit length
}

// Validate GitHub token format
export function isValidTokenFormat(token: string): boolean {
    // GitHub tokens start with ghp_, gho_, ghu_, ghs_, or ghr_
    const tokenRegex = /^(ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36,}$/;
    return tokenRegex.test(token);
}

// Validate repository format
export function isValidRepoFormat(owner: string, repo: string): boolean {
    const repoRegex = /^[a-zA-Z0-9_.-]+$/;
    return (
        owner.length > 0 &&
        owner.length <= 39 &&
        repo.length > 0 &&
        repo.length <= 100 &&
        repoRegex.test(owner) &&
        repoRegex.test(repo)
    );
}

// Security headers
export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:;",
};
