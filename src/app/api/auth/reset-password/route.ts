import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit, securityHeaders, sanitizeInput } from '@/lib/security';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientIP = request.headers.get('x-forwarded-for') || 'anonymous';
        const rateLimit = checkRateLimit(`reset-${clientIP}`);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { ...securityHeaders, 'Retry-After': '60' } }
            );
        }

        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token and password are required' },
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

        await dbConnect();

        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(sanitizeInput(token)).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400, headers: securityHeaders }
            );
        }

        // Hash new password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password and clear reset token
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return NextResponse.json(
            { success: true, message: 'Password reset successfully' },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
