import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '7d'; // Token expires in 7 days

// Get JWT_SECRET with validation
function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
    }
    return secret;
}

const JWT_SECRET = getJwtSecret();

interface JWTPayload {
    userId: string;
    email: string;
    username: string;
}

/**
 * Sign a JWT token for a user
 */
export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 * Returns null if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

/**
 * Extract token from Authorization header
 * Expects format: "Bearer <token>"
 */
export function extractToken(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}

/**
 * Middleware helper to validate JWT from request headers
 * Returns user info if valid, null otherwise
 */
export function validateJWT(authHeader: string | null): JWTPayload | null {
    const token = extractToken(authHeader);
    if (!token) return null;
    return verifyToken(token);
}
