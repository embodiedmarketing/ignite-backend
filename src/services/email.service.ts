import nodemailer from 'nodemailer';
import type { IssueReport } from "@backend/shared";

const createGmailTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.warn('Gmail credentials not configured.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
};

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.GMAIL_USER || 'noreply@launch-platform.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = createGmailTransporter();
  
  if (!transporter) {
    console.error('Cannot send email: Gmail credentials not configured');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER || FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = FRONTEND_URL.endsWith('/') ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;
  const resetUrl = `${baseUrl}/reset-password/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password - Ignite</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .logo { display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
        .content { background: #f7f3ef; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #ec7357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #f5a623; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔥 Ignite</div>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hi there!</p>
          <p>We received a request to reset your password for your Ignite account. If you made this request, click the button below to set a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <p>This link will expire in 1 hour for security reasons.</p>
          
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <p>Best regards,<br>The Ignite Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Reset Your Password - Ignite
    
    Hi there!
    
    We received a request to reset your password for your Ignite account. If you made this request, visit the link below to set a new password:
    
    ${resetUrl}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    
    Best regards,
    The Ignite Team
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Ignite Password',
    html,
    text,
  });
}

export async function sendPasswordChangeConfirmation(email: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Changed - Launch Platform</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4593ed; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f7f3ef; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Launch Platform</h1>
        </div>
        <div class="content">
          <h2>Password Changed Successfully</h2>
          <p>Hi there!</p>
          <p>This email confirms that your Launch Platform password was successfully changed.</p>
          
          <p><strong>When:</strong> ${new Date().toLocaleString()}</p>
          
          <p>If you didn't make this change, please contact our support team immediately.</p>
          
          <p>Best regards,<br>The Launch Platform Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Password Changed Successfully - Launch Platform
    
    Hi there!
    
    This email confirms that your Launch Platform password was successfully changed.
    
    When: ${new Date().toLocaleString()}
    
    If you didn't make this change, please contact our support team immediately.
    
    Best regards,
    The Launch Platform Team
  `;

  return sendEmail({
    to: email,
    subject: 'Your Launch Platform Password Has Been Changed',
    html,
    text,
  });
}

export async function sendForumNotification(params: {
  categoryName: string;
  categorySlug: string;
  threadTitle: string;
  threadId: number;
  authorName: string;
  contentPreview: string;
  isNewThread: boolean;
}): Promise<boolean> {
  const baseUrl = FRONTEND_URL.endsWith('/') ? FRONTEND_URL.slice(0, -1) : FRONTEND_URL;
  const threadUrl = `${baseUrl}/forum/thread/${params.threadId}`;
  const activityType = params.isNewThread ? 'New Thread' : 'New Comment';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${activityType} in ${params.categoryName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f7f3ef; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #ec7357; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .button:hover { background: #f5a623; }
        .preview { background: white; padding: 15px; border-left: 4px solid #ec7357; margin: 15px 0; font-style: italic; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 Community Forum Activity</h1>
        </div>
        <div class="content">
          <h2>${activityType} in ${params.categoryName}</h2>
          <p><strong>Posted by:</strong> ${params.authorName}</p>
          <p><strong>Thread:</strong> ${params.threadTitle}</p>
          
          <div class="preview">
            ${params.contentPreview.substring(0, 200)}${params.contentPreview.length > 200 ? '...' : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${threadUrl}" class="button">View Thread</a>
          </div>
          
          <p>This is an automated notification for activity in the ${params.categoryName} category.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the Ignite Community Forum.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    ${activityType} in ${params.categoryName}
    
    Posted by: ${params.authorName}
    Thread: ${params.threadTitle}
    
    ${params.contentPreview.substring(0, 200)}${params.contentPreview.length > 200 ? '...' : ''}
    
    View the full thread at: ${threadUrl}
    
    This is an automated notification for activity in the ${params.categoryName} category.
  `;

  return sendEmail({
    to: 'team@embodiedmarketing.com',
    subject: `[Forum] ${activityType} in ${params.categoryName}: ${params.threadTitle}`,
    html,
    text,
  });
}

/**
 * Send an email about an issue report update to a specific user email.
 * The caller is responsible for resolving the correct recipient email
 * (typically the user who created the bug/issue).
 */
export async function sendIssueReportUpdateEmail(
  to: string,
  report: IssueReport
): Promise<boolean> {
  if (!to) {
    console.warn(
      `[ISSUE-REPORT] No recipient email provided for issue report ${report.id}, skipping email notification.`
    );
    return false;
  }

  const issueUrl = report.pageUrl;


  const statusLabel = report.status ?? "updated";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Issue Has Been Updated</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f7f3ef; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #ec7357; color: #fff; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
        .footer { text-align: center; color: #666; font-size: 14px; margin-top: 20px; }
        .meta { font-size: 14px; color: #555; }
        .label { font-weight: bold; }
        .box { background: #fff; border-left: 4px solid #ec7357; padding: 12px 16px; margin: 12px 0; }
        a.button { display: inline-block; background: #ec7357; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ignite By Embodied</h1>
        </div>
        <div class="content">
          <p>Hi there ${report?.userName ? ` ${report.userName},` : ""}</p>
          <p>Your issue report has been <span class="status-pill">${statusLabel}</span>.</p>
          ${
            report.adminNotes
              ? `<div class="box">
                  <div class="label">Comment from Admin:</div>
                  <div>${report.adminNotes}</div>
                </div>`
              : ""
          }

          <div class="meta">
            <p><span class="label">Issue ID:</span> #${report.id}</p>
            <p><span class="label">Title:</span> ${report.title}</p>
            <p><span class="label">Type:</span> ${report.issueType}</p>
            <p><span class="label">Priority:</span> ${report.priority}</p>
            <p><span class="label">Status:</span> ${report.status}</p>
          </div>


          ${
            issueUrl
              ? `<p>Please review the resolved issue at this link once you have a moment.</p>
                 <p><a href="${issueUrl}" class="button">Try again</a></p>`
              : ""
          }

          <p>If you have any questions or if something still isn't working as expected, feel free to reply to this email or open a new issue from within Ignite.</p>

          <p>Best regards,<br />The Ignite Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message from Ignite support.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Your issue report has been ${statusLabel}.

    Issue ID: #${report.id}
    Title: ${report.title}
    Type: ${report.issueType}
    Priority: ${report.priority}
    Status: ${report.status}

    ${
      report.adminNotes
        ? `Update from our team:\n${report.adminNotes}\n\n`
        : ""
    }${
    issueUrl
      ? `You can review the details of this issue here: ${issueUrl}\n\n`
      : ""
  }If you have any questions, feel free to reply to this email or open a new issue from within Ignite.

    Best regards,
    The Ignite Team
  `;

  return sendEmail({
    to,
    subject: `Your Ignite issue "${report.title}" has been updated`,
    html,
    text,
  });
}

export { sendEmail };

