import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { validateToken } from '@/lib/github';
import { encrypt, checkRateLimit, isValidTokenFormat, securityHeaders } from '@/lib/security';
import { validateJWT } from '@/lib/jwt';

/**
 * POST /api/auth/update-github-token
 * Allows a logged-in user to replace their GitHub token with a new one.
 * Security: Requires JWT auth. New token must belong to the SAME GitHub user (githubId).
 */
export async function POST(request: NextRequest) {
    try {
        // Require JWT authentication
        const authHeader = request.headers.get('authorization');
        const payload = validateJWT(authHeader);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in again.' },
                { status: 401, headers: securityHeaders }
            );
        }

        const { username } = payload;

        // Rate limiting
        const rateLimit = checkRateLimit(username);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { ...securityHeaders, 'Retry-After': '60' } }
            );
        }

        const body = await request.json();
        const { newToken } = body;

        if (!newToken || typeof newToken !== 'string') {
            return NextResponse.json(
                { error: 'New GitHub token is required' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate token format
        if (!isValidTokenFormat(newToken.trim())) {
            return NextResponse.json(
                { error: 'Invalid token format. Please use a valid GitHub Personal Access Token (ghp_, gho_, etc.).' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate new token with GitHub
        const githubUser = await validateToken(newToken.trim());

        if (!githubUser) {
            return NextResponse.json(
                { error: 'Invalid or expired GitHub token. Please create a new Personal Access Token on GitHub.' },
                { status: 401, headers: securityHeaders }
            );
        }

        await dbConnect();

        const user = await User.findOne({ githubUsername: username });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        // CRITICAL: New token must belong to the SAME GitHub account
        if (githubUser.id !== user.githubId) {
            return NextResponse.json(
                { error: 'This token belongs to a different GitHub account. Use a token for @' + user.githubUsername + '.' },
                { status: 403, headers: securityHeaders }
            );
        }

        // Update token and avatar
        const encryptedToken = encrypt(newToken.trim());
        user.githubToken = encryptedToken;
        user.avatarUrl = githubUser.avatar_url;
        await user.save();

        return NextResponse.json(
            {
                success: true,
                message: 'GitHub token updated successfully',
                user: {
                    username: user.githubUsername,
                    avatarUrl: user.avatarUrl,
                },
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Update GitHub token error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
