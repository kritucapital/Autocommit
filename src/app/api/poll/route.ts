import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkForNewCommits, performAutoCommit } from '@/lib/github';
import { decrypt, checkRateLimit, securityHeaders } from '@/lib/security';
import { validateJWT } from '@/lib/jwt';

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
        // Validate JWT token
        const authHeader = request.headers.get('authorization');
        const payload = validateJWT(authHeader);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized. Please log in again.' },
                { status: 401, headers: securityHeaders }
            );
        }

        const username = payload.username;

        // Rate limiting - stricter for polling
        const rateLimit = checkRateLimit(`poll_${username}`);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Slow down polling.' },
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

            // Save activity log to database if something happened
            if (result.autoCommitTriggered || result.newCommit) {
                const logEntry = {
                    repo: repo.fullName,
                    action: result.autoCommitTriggered
                        ? (result.autoCommitSuccess ? 'Auto-Commit Success' : 'Auto-Commit Failed')
                        : 'Commit Detected',
                    message: result.message,
                    success: result.autoCommitTriggered ? result.autoCommitSuccess : true,
                    timestamp: new Date(),
                };

                // Add to beginning and keep only last 50 logs
                user.activityLogs.unshift(logEntry);
                if (user.activityLogs.length > 50) {
                    user.activityLogs = user.activityLogs.slice(0, 50);
                }
            }
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
