import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User, { IActivityLog } from '@/models/User';
import { securityHeaders, sanitizeInput } from '@/lib/security';
import { validateJWT } from '@/lib/jwt';

const MAX_ACTIVITY_LOGS = 50; // Limit logs per user for scalability

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

// GET - Fetch activity logs for a user
export async function GET(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        await dbConnect();
        const user = await User.findOne(
            { githubUsername: username },
            { activityLogs: 1 }
        );

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        // Return logs with id field for frontend compatibility
        // Handle case where activityLogs may not exist for older users
        const userLogs = user.activityLogs || [];
        const logs = userLogs.map((log: IActivityLog & { _id?: string }) => ({
            id: log._id?.toString() || Math.random().toString(36).substring(7),
            repo: log.repo,
            action: log.action,
            message: log.message,
            success: log.success,
            timestamp: log.timestamp.toISOString(),
        }));

        return NextResponse.json(
            { success: true, logs },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Fetch activity logs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}

// POST - Add new activity log
export async function POST(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        const body = await request.json();
        const { repo, action, message, success } = body;

        if (!repo || !action || !message || typeof success !== 'boolean') {
            return NextResponse.json(
                { error: 'Missing required fields: repo, action, message, success' },
                { status: 400, headers: securityHeaders }
            );
        }

        await dbConnect();

        // Add new log and keep only the latest MAX_ACTIVITY_LOGS entries
        const user = await User.findOneAndUpdate(
            { githubUsername: username },
            {
                $push: {
                    activityLogs: {
                        $each: [{
                            repo: sanitizeInput(repo),
                            action: sanitizeInput(action),
                            message: sanitizeInput(message),
                            success,
                            timestamp: new Date(),
                        }],
                        $position: 0, // Add at the beginning
                        $slice: MAX_ACTIVITY_LOGS, // Keep only the latest N logs
                    },
                },
            },
            { new: true, projection: { activityLogs: { $slice: 1 } } }
        );

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Activity log added' },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Add activity log error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}

// DELETE - Clear all activity logs for user
export async function DELETE(request: NextRequest) {
    try {
        const auth = authenticateRequest(request);
        if (auth instanceof NextResponse) return auth;
        const { username } = auth;

        await dbConnect();

        const user = await User.findOneAndUpdate(
            { githubUsername: username },
            { $set: { activityLogs: [] } },
            { new: true }
        );

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Activity logs cleared' },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Clear activity logs error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
