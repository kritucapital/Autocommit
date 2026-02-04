import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getUserRepositories } from '@/lib/github';
import { decrypt, securityHeaders, sanitizeInput } from '@/lib/security';

// Get all repositories the user has access to from GitHub
export async function GET(request: NextRequest) {
    try {
        const username = request.headers.get('x-github-username');

        if (!username) {
            return NextResponse.json(
                { error: 'Username header required' },
                { status: 400, headers: securityHeaders }
            );
        }

        await dbConnect();
        const user = await User.findOne({ githubUsername: sanitizeInput(username) });

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
