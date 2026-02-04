import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { securityHeaders, sanitizeInput } from '@/lib/security';

// Toggle monitoring for a user (enable/disable background service)
export async function POST(request: NextRequest) {
    try {
        const username = request.headers.get('x-github-username');

        if (!username) {
            return NextResponse.json(
                { error: 'Username header required' },
                { status: 400, headers: securityHeaders }
            );
        }

        const body = await request.json();
        const { enabled, pollInterval } = body;

        if (typeof enabled !== 'boolean') {
            return NextResponse.json(
                { error: 'enabled field (boolean) is required' },
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

        // Update monitoring settings
        user.isMonitoringEnabled = enabled;

        // Update poll interval if provided
        if (typeof pollInterval === 'number' && pollInterval >= 10000 && pollInterval <= 300000) {
            user.pollInterval = pollInterval;
        }

        await user.save();

        return NextResponse.json(
            {
                success: true,
                isMonitoringEnabled: user.isMonitoringEnabled,
                pollInterval: user.pollInterval,
                message: enabled
                    ? 'Background monitoring enabled. It will continue even when you log out.'
                    : 'Background monitoring disabled.',
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Monitoring toggle error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}

// Get current monitoring status
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

        return NextResponse.json(
            {
                success: true,
                // Explicitly convert to boolean to handle undefined
                isMonitoringEnabled: user.isMonitoringEnabled === true,
                pollInterval: user.pollInterval || 30000,
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Get monitoring status error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
