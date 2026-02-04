import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit, securityHeaders, sanitizeInput } from '@/lib/security';

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
        const { email, password } = body;

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400, headers: securityHeaders }
            );
        }

        await dbConnect();

        // Find user by email
        const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
        const user = await User.findOne({ email: sanitizedEmail });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401, headers: securityHeaders }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401, headers: securityHeaders }
            );
        }

        return NextResponse.json(
            {
                success: true,
                user: {
                    email: user.email,
                    username: user.githubUsername,
                    avatarUrl: user.avatarUrl,
                    repoCount: user.repositories.length,
                },
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
