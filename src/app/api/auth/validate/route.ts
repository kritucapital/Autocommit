import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { validateToken } from '@/lib/github';
import { encrypt, checkRateLimit, isValidTokenFormat, securityHeaders } from '@/lib/security';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientIP = request.headers.get('x-forwarded-for') || 'anonymous';
        const rateLimit = checkRateLimit(clientIP);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        ...securityHeaders,
                        'Retry-After': '60'
                    }
                }
            );
        }

        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'GitHub token is required' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate token format
        if (!isValidTokenFormat(token)) {
            return NextResponse.json(
                { error: 'Invalid token format. Please use a valid GitHub Personal Access Token.' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate token with GitHub
        const githubUser = await validateToken(token);

        if (!githubUser) {
            return NextResponse.json(
                { error: 'Invalid GitHub token' },
                { status: 401, headers: securityHeaders }
            );
        }

        // Connect to database
        await dbConnect();

        // Encrypt token before storing
        const encryptedToken = encrypt(token);

        // Find or create user
        let user = await User.findOne({ githubUsername: githubUser.login });

        if (user) {
            // Update token if user exists
            user.githubToken = encryptedToken;
            user.avatarUrl = githubUser.avatar_url;
            await user.save();
        } else {
            // Create new user
            user = await User.create({
                githubToken: encryptedToken,
                githubUsername: githubUser.login,
                githubId: githubUser.id,
                avatarUrl: githubUser.avatar_url,
                repositories: [],
            });
        }

        return NextResponse.json(
            {
                success: true,
                user: {
                    username: user.githubUsername,
                    avatarUrl: user.avatarUrl,
                    repoCount: user.repositories.length,
                },
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Auth validation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
