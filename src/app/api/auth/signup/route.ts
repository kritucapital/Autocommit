import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { validateToken } from '@/lib/github';
import { encrypt, checkRateLimit, isValidTokenFormat, securityHeaders, sanitizeInput } from '@/lib/security';

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

        const body = await request.json();
        const { email, password, token } = body;

        // Validate required fields
        if (!email || !password || !token) {
            return NextResponse.json(
                { error: 'Email, password, and GitHub token are required' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate password strength
        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Validate token format
        if (!isValidTokenFormat(token)) {
            return NextResponse.json(
                { error: 'Invalid GitHub token format' },
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

        await dbConnect();

        // Check if email already exists
        const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
        const existingUser = await User.findOne({ email: sanitizedEmail });

        if (existingUser) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409, headers: securityHeaders }
            );
        }

        // Check if GitHub account is already linked
        const existingGithubUser = await User.findOne({ githubUsername: githubUser.login });

        if (existingGithubUser) {
            return NextResponse.json(
                { error: 'This GitHub account is already linked to another user' },
                { status: 409, headers: securityHeaders }
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Encrypt GitHub token
        const encryptedToken = encrypt(token);

        // Create new user
        const user = await User.create({
            email: sanitizedEmail,
            password: hashedPassword,
            githubToken: encryptedToken,
            githubUsername: githubUser.login,
            githubId: githubUser.id,
            avatarUrl: githubUser.avatar_url,
            repositories: [],
            isMonitoringEnabled: false,
            pollInterval: 30000,
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Account created successfully',
                user: {
                    email: user.email,
                    username: user.githubUsername,
                    avatarUrl: user.avatarUrl,
                },
            },
            { status: 201, headers: securityHeaders }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
