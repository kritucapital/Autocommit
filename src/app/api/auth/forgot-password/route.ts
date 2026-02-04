import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, securityHeaders, sanitizeInput } from '@/lib/security';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting - stricter for password reset
        const clientIP = request.headers.get('x-forwarded-for') || 'anonymous';
        const rateLimit = checkRateLimit(`forgot-${clientIP}`);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { ...securityHeaders, 'Retry-After': '60' } }
            );
        }

        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
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

        await dbConnect();

        const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
        const user = await User.findOne({ email: sanitizedEmail });

        // Return error if email not found (user-friendly but allows email enumeration)
        if (!user) {
            return NextResponse.json(
                { error: 'No account found with this email address' },
                { status: 404, headers: securityHeaders }
            );
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Save hashed token and expiry (1 hour)
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        // Build reset URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

        // Send email
        try {
            await sendPasswordResetEmail(user.email, resetUrl);
        } catch (emailError) {
            console.error('Failed to send reset email:', emailError);
            // Don't expose email sending failure to user
        }

        return NextResponse.json(
            { success: true, message: 'If an account exists, a reset email will be sent.' },
            { headers: securityHeaders }
        );
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500, headers: securityHeaders }
        );
    }
}
