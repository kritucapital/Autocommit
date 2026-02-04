import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkForNewCommits, performAutoCommit } from '@/lib/github';
import { decrypt, checkRateLimit, securityHeaders, sanitizeInput } from '@/lib/security';

export interface PollResult {
    repo: string;
    checked: boolean;
    newCommit: boolean;
    autoCommitTriggered: boolean;
    autoCommitSuccess: boolean;
    message: string;
}

// Poll all active repositories for new commits
export async function GET(request: NextRequest) {
    try {
        const username = request.headers.get('x-github-username');

        if (!username) {
            return NextResponse.json(
                { error: 'Username header required' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Rate limiting - stricter for polling
        const rateLimit = checkRateLimit(`poll_${username}`);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Slow down polling.' },
                { status: 429, headers: { ...securityHeaders, 'Retry-After': '60' } }
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

        const activeRepos = user.repositories.filter((r) => r.isActive);
        const results: PollResult[] = [];

        for (const repo of activeRepos) {
            const result: PollResult = {
                repo: repo.fullName,
                checked: true,
                newCommit: false,
                autoCommitTriggered: false,
                autoCommitSuccess: false,
                message: '',
            };

            try {
                const commitCheck = await checkForNewCommits(
                    decryptedToken,
                    repo.owner,
                    repo.name,
                    repo.lastCommitSha,
                    user.githubUsername
                );

                if (commitCheck.hasNew && commitCheck.latestCommit) {
                    result.newCommit = true;

                    if (commitCheck.isFromOther) {
                        // Trigger auto-commit
                        result.autoCommitTriggered = true;
                        const autoCommitResult = await performAutoCommit(
                            decryptedToken,
                            repo.owner,
                            repo.name
                        );

                        result.autoCommitSuccess = autoCommitResult.success;
                        result.message = autoCommitResult.message;

                        if (autoCommitResult.success) {
                            repo.autoCommitCount += 1;
                        }
                    } else {
                        result.message = 'New commit is from current user, skipping auto-commit';
                    }

                    // Update last commit info
                    repo.lastCommitSha = commitCheck.latestCommit.sha;
                    repo.lastCommitAuthor = commitCheck.latestCommit.author;
                } else {
                    result.message = 'No new commits';
                }

                repo.lastChecked = new Date();
            } catch (error) {
                result.message = `Error checking repo: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }

            results.push(result);
        }

        await user.save();

        return NextResponse.json(
            {
                success: true,
                timestamp: new Date().toISOString(),
                results,
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Poll error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
