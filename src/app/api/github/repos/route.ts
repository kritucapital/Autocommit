import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserRepositories } from '@/lib/github';
import { decrypt, securityHeaders } from '@/lib/security';
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

// Get all repositories the user has access to from GitHub
export async function GET(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        await dbConnect();
        const user = await User.findOne({ githubUsername: username });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        // Decrypt token
        let decryptedToken: string;
        try {
            decryptedToken = decrypt(user.githubToken);
        } catch {
            return NextResponse.json(
                { error: 'Token decryption failed. Please re-authenticate.' },
                { status: 401, headers: securityHeaders }
            );
        }

        // Fetch all repos from GitHub
        const allRepos = await getUserRepositories(decryptedToken);

        // Get list of already monitored repos
        const monitoredRepoNames = user.repositories.map((r: { fullName: string }) => r.fullName);

        // Mark which repos are already being monitored
        const reposWithStatus = allRepos.map((repo) => ({
            ...repo,
            isMonitored: monitoredRepoNames.includes(repo.fullName),
        }));

        return NextResponse.json(
            {
                success: true,
                repositories: reposWithStatus,
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Fetch GitHub repos error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
