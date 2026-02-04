import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit, securityHeaders, sanitizeInput } from '@/lib/security';

export async function DELETE(request: NextRequest) {
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
                { error: 'Email and password are required to delete account' },
                { status: 400, headers: securityHeaders }
            );
        }

        await dbConnect();

        // Find user by email
        const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
        const user = await User.findOne({ email: sanitizedEmail });

        if (!user) {
            return NextResponse.json(
                { error: 'Account not found' },
                { status: 404, headers: securityHeaders }
            );
        }

        // Verify password before deletion
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid password. Account deletion requires correct password.' },
                { status: 401, headers: securityHeaders }
            );
        }

        // Delete the user account
        await User.deleteOne({ _id: user._id });

        return NextResponse.json(
            {
                success: true,
                message: 'Account deleted successfully',
            },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
