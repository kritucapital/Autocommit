import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit, securityHeaders, sanitizeInput } from '@/lib/security';
import { validateJWT } from '@/lib/jwt';

// Helper to validate JWT and return username
function authenticateRequest(request: NextRequest): { username: string } | NextResponse {
    const authHeader = request.headers.get('authorization');
    const payload = validateJWT(authHeader);

    if (!payload) {
        return NextResponse.json(
            { error: 'Unauthorized. Please log in again.' },
            { status: 401, headers: securityHeaders }
        );
    }

    return { username: payload.username };
}

// Toggle monitoring status for a repository
export async function POST(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        const { owner, repo, isActive } = await request.json();

        // Rate limiting
        const rateLimit = checkRateLimit(username);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: { ...securityHeaders, 'Retry-After': '60' } }
            );
        }

        const sanitizedOwner = sanitizeInput(owner || '');
        const sanitizedRepo = sanitizeInput(repo || '');

        if (!sanitizedOwner || !sanitizedRepo || typeof isActive !== 'boolean') {
            return NextResponse.json(
                { error: 'Owner, repo, and isActive are required' },
                { status: 400, headers: securityHeaders }
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

        const repoItem = user.repositories.find(
            (r) => r.owner === sanitizedOwner && r.name === sanitizedRepo
        );

        if (!repoItem) {
            return NextResponse.json(
                { error: 'Repository not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        repoItem.isActive = isActive;
        await user.save();

        return NextResponse.json(
            { success: true, repository: repoItem },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Monitor toggle error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}

// GET - Get monitoring status for all repos
export async function GET(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        // Rate limiting
        const rateLimit = checkRateLimit(username);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: { ...securityHeaders, 'Retry-After': '60' } }
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

        const activeRepos = user.repositories.filter((r) => r.isActive);
        const totalAutoCommits = user.repositories.reduce(
            (sum, r) => sum + r.autoCommitCount,
            0
        );

        return NextResponse.json(
            {
                success: true,
                activeCount: activeRepos.length,
                totalRepos: user.repositories.length,
                totalAutoCommits,
                repositories: user.repositories.map((r) => ({
                    fullName: r.fullName,
                    isActive: r.isActive,
                    lastChecked: r.lastChecked,
                    autoCommitCount: r.autoCommitCount,
                })),
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Get monitor status error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
