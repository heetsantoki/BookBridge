import nodemailer from 'nodemailer';

// Helper to create a transport using SMTP settings
const createTransport = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Sends a premium-designed HTML verification email with the OTP.
 * Falls back to logging to console if SMTP is not configured.
 */
export const sendOtpEmail = async (email: string, otp: string, userName: string): Promise<boolean> => {
  const from = process.env.SMTP_FROM || '"BookBridge Team" <noreply@bookbridge.com>';
  const subject = 'BookBridge - Verify Your Email Address';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #0b0f19;
          color: #f3f4f6;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #111827;
          border: 1px solid #1f2937;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .content h2 {
          color: #ffffff;
          font-size: 20px;
          margin-top: 0;
        }
        .content p {
          color: #9ca3af;
          font-size: 15px;
        }
        .otp-box {
          background-color: #030712;
          border: 1.5px dashed #4f46e5;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 8px;
          color: #06b6d4;
          margin: 0;
        }
        .footer {
          background-color: #0b0f19;
          padding: 20px;
          text-align: center;
          border-top: 1px solid #1f2937;
        }
        .footer p {
          color: #4b5563;
          font-size: 12px;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BookBridge</h1>
        </div>
        <div class="content">
          <h2>Email Verification</h2>
          <p>Hi ${userName},</p>
          <p>Thank you for registering an account on BookBridge! Please use the following 6-digit One-Time Password (OTP) to verify your email address. This code is valid for 15 minutes.</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>If you did not initiate this request, you can safely ignore this email.</p>
          <p>Happy exchanging,<br>The BookBridge Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BookBridge. Academic Resource Exchange.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hi ${userName},\n\nThank you for registering on BookBridge! Please use the following 6-digit OTP code to verify your email address: ${otp}\n\nThis code will expire in 15 minutes.\n\nHappy exchanging,\nThe BookBridge Team`;

  const transport = createTransport();

  if (!transport) {
    // Fallback console log for local development
    console.log('\n' + '='.repeat(60));
    console.log('📬  [DEVELOPMENT MODE - SMTP NOT CONFIGURED]');
    console.log(`✉️   Sent to:      ${email}`);
    console.log(`👤  User Name:    ${userName}`);
    console.log(`🔑  OTP Code:     ${otp}`);
    console.log(`⏳  Expiry:        15 minutes`);
    console.log('='.repeat(60) + '\n');
    return true;
  }

  try {
    const info = await transport.sendMail({
      from,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`Message successfully sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Nodemailer Error: Failed to send email:', error);
    return false;
  }
};
