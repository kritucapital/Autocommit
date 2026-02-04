import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkForNewCommits, performAutoCommit } from '@/lib/github';
import { decrypt, securityHeaders } from '@/lib/security';

export interface CronPollResult {
    user: string;
    reposChecked: number;
    autoCommitsTriggered: number;
    autoCommitsSuccessful: number;
    errors: string[];
}

// Background cron endpoint - polls all users with monitoring enabled
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const cronSecret = request.headers.get('x-cron-secret');
        const expectedSecret = process.env.CRON_SECRET_KEY;

        if (!expectedSecret) {
            console.error('CRON_SECRET_KEY not configured');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500, headers: securityHeaders }
            );
        }

        if (cronSecret !== expectedSecret) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401, headers: securityHeaders }
            );
        }

        await dbConnect();

        // Find all users with monitoring enabled
        const users = await User.find({ isMonitoringEnabled: true });

        if (users.length === 0) {
            return NextResponse.json(
                {
                    success: true,
                    message: 'No users with monitoring enabled',
                    results: [],
                },
                { headers: securityHeaders }
            );
        }

        const results: CronPollResult[] = [];

        for (const user of users) {
            const result: CronPollResult = {
                user: user.githubUsername,
                reposChecked: 0,
                autoCommitsTriggered: 0,
                autoCommitsSuccessful: 0,
                errors: [],
            };

            try {
                // Decrypt token
                let decryptedToken: string;
                try {
                    decryptedToken = decrypt(user.githubToken);
                } catch {
                    result.errors.push('Token decryption failed');
                    results.push(result);
                    continue;
                }

                const activeRepos = user.repositories.filter((r) => r.isActive);
                result.reposChecked = activeRepos.length;

                for (const repo of activeRepos) {
                    try {
                        const commitCheck = await checkForNewCommits(
                            decryptedToken,
                            repo.owner,
                            repo.name,
                            repo.lastCommitSha,
                            user.githubUsername
                        );

                        if (commitCheck.hasNew && commitCheck.latestCommit) {
                            if (commitCheck.isFromOther) {
                                // Trigger auto-commit
                                result.autoCommitsTriggered++;
                                const autoCommitResult = await performAutoCommit(
                                    decryptedToken,
                                    repo.owner,
                                    repo.name
                                );

                                if (autoCommitResult.success) {
                                    result.autoCommitsSuccessful++;
                                    repo.autoCommitCount += 1;
                                }
                            }

                            // Update last commit info
                            repo.lastCommitSha = commitCheck.latestCommit.sha;
                            repo.lastCommitAuthor = commitCheck.latestCommit.author;
                        }

                        repo.lastChecked = new Date();
                    } catch (error) {
                        result.errors.push(
                            `${repo.fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        );
                    }
                }

                await user.save();
            } catch (error) {
                result.errors.push(
                    `User error: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
            }

            results.push(result);
        }

        const totalAutoCommits = results.reduce((sum, r) => sum + r.autoCommitsSuccessful, 0);

        return NextResponse.json(
            {
                success: true,
                timestamp: new Date().toISOString(),
                usersProcessed: users.length,
                totalAutoCommits,
                results,
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Cron poll error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}

// Allow GET for Vercel Cron (optional - if you want to use Vercel cron as backup)
export async function GET(request: NextRequest) {
    // For Vercel Cron, the auth header is different
    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${process.env.CRON_SECRET_KEY}`) {
        // Create a mock request with the right headers
        const headers = new Headers(request.headers);
        headers.set('x-cron-secret', process.env.CRON_SECRET_KEY || '');
        const modifiedRequest = new NextRequest(request.url, {
            headers,
            method: 'POST',
        });
        return POST(modifiedRequest);
    }

    return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: securityHeaders }
    );
}
