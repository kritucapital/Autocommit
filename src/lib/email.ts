/**
 * Brevo Email Service
 * 
 * Email service for sending transactional emails via Brevo API.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const DEFAULT_SENDER = {
    email: process.env.EMAIL_USER || 'noreply@autocommit.com',
    name: 'AutoCommit',
};

interface SendMailOptions {
    to: string;
    subject: string;
    text: string;
}

interface SendMailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send an email using Brevo API
 */
export async function sendMail({ to, subject, text }: SendMailOptions): Promise<SendMailResult> {
    if (!BREVO_API_KEY) {
        console.error('Brevo API key not configured');
        throw new Error('Email service not configured');
    }

    try {
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 24px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                                🔄 AutoCommit
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px; background-color: #1a1a2e; border-left: 1px solid #2a2a4e; border-right: 1px solid #2a2a4e;">
                            <p style="margin: 0; font-size: 16px; color: #e0e0e0; line-height: 1.6; white-space: pre-line;">
${text}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 32px; background-color: #12121a; border: 1px solid #2a2a4e; border-top: none; border-radius: 0 0 12px 12px;">
                            <p style="margin: 0; font-size: 13px; color: #888888; text-align: center;">
                                This email was sent by AutoCommit. If you didn't request this, you can safely ignore it.
                            </p>
                            <p style="margin: 12px 0 0 0; font-size: 12px; color: #666666; text-align: center;">
                                © ${new Date().getFullYear()} AutoCommit. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();

        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: DEFAULT_SENDER,
                to: [{ email: to }],
                subject: subject,
                htmlContent: htmlContent,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Brevo API error:', errorData);
            throw new Error(errorData.message || 'Failed to send email');
        }

        const data = await response.json();
        console.log(`Email sent successfully to ${to}, messageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };
    } catch (error) {
        console.error('Email sending error:', error);
        throw error;
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<SendMailResult> {
    const text = `Hello,

You requested to reset your password for your AutoCommit account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The AutoCommit Team`;

    return sendMail({
        to,
        subject: 'Reset Your AutoCommit Password',
        text,
    });
}
