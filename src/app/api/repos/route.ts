import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getRepoInfo, getRepositoryCommits } from '@/lib/github';
import { decrypt, checkRateLimit, isValidRepoFormat, securityHeaders, sanitizeInput } from '@/lib/security';
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

// GET - Fetch user's repositories
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

        return NextResponse.json(
            { success: true, repositories: user.repositories },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Get repos error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}

// POST - Add a new repository to monitor
export async function POST(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        const { owner, repo } = await request.json();

        // Sanitize inputs
        const sanitizedOwner = sanitizeInput(owner || '');
        const sanitizedRepo = sanitizeInput(repo || '');

        if (!sanitizedOwner || !sanitizedRepo) {
            return NextResponse.json(
                { error: 'Owner and repo are required' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate repo format
        if (!isValidRepoFormat(sanitizedOwner, sanitizedRepo)) {
            return NextResponse.json(
                { error: 'Invalid repository format' },
                { status: 400, headers: securityHeaders }
            );
        }

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

        // Check if repo already exists
        const existingRepo = user.repositories.find(
            (r) => r.owner === sanitizedOwner && r.name === sanitizedRepo
        );

        if (existingRepo) {
            return NextResponse.json(
                { error: 'Repository already being monitored' },
                { status: 409, headers: securityHeaders }
            );
        }

        // Decrypt token for API call
        const decryptedToken = decrypt(user.githubToken);

        // Validate repo exists on GitHub
        const repoInfo = await getRepoInfo(decryptedToken, sanitizedOwner, sanitizedRepo);

        if (!repoInfo) {
            return NextResponse.json(
                { error: 'Repository not found or no access' },
                { status: 404, headers: securityHeaders }
            );
        }

        // Get initial commit SHA
        const commits = await getRepositoryCommits(decryptedToken, sanitizedOwner, sanitizedRepo, 1);
        const initialSha = commits.length > 0 ? commits[0].sha : null;
        const initialAuthor = commits.length > 0 ? commits[0].author : null;

        // Add repository
        user.repositories.push({
            owner: sanitizedOwner,
            name: sanitizedRepo,
            fullName: repoInfo.fullName,
            isActive: true,
            lastCommitSha: initialSha,
            lastCommitAuthor: initialAuthor,
            lastChecked: new Date(),
            autoCommitCount: 0,
        });

        await user.save();

        return NextResponse.json(
            { success: true, repository: user.repositories[user.repositories.length - 1] },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Add repo error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}

// DELETE - Remove a repository from monitoring
export async function DELETE(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        const { owner, repo } = await request.json();

        const sanitizedOwner = sanitizeInput(owner || '');
        const sanitizedRepo = sanitizeInput(repo || '');

        if (!sanitizedOwner || !sanitizedRepo) {
            return NextResponse.json(
                { error: 'Owner and repo are required' },
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

        const repoIndex = user.repositories.findIndex(
            (r) => r.owner === sanitizedOwner && r.name === sanitizedRepo
        );

        if (repoIndex === -1) {
            return NextResponse.json(
                { error: 'Repository not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        user.repositories.splice(repoIndex, 1);
        await user.save();

        return NextResponse.json(
            { success: true, message: 'Repository removed' },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Delete repo error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
