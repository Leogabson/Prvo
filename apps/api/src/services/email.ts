import { logger } from '../logger.js';
import { env } from '../config/env.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  sendEmail(options: SendEmailOptions): Promise<void>;
  sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
}

export class ConsoleEmailProvider implements EmailService {
  async sendEmail(options: SendEmailOptions): Promise<void> {
    logger.info(
      { to: options.to, subject: options.subject, text: options.text },
      '[ConsoleEmailProvider] Email dispatch simulation'
    );
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const text = `You requested a password reset for your Prvo account.\n\nReset link (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`;
    await this.sendEmail({
      to,
      subject: 'Reset your Prvo password',
      text,
    });
  }
}

export class ResendEmailProvider implements EmailService {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorText}`);
      }

      logger.info({ to: options.to, subject: options.subject }, 'Email sent successfully via Resend');
    } catch (err) {
      logger.error({ err, to: options.to }, 'Failed to send email via Resend');
      throw err;
    }
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const text = `You requested a password reset for your Prvo account.\n\nReset link (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`;
    const html = `<p>You requested a password reset for your Prvo account.</p><p><a href="${resetLink}">Click here to reset your password</a></p><p>This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>`;

    await this.sendEmail({
      to,
      subject: 'Reset your Prvo password',
      text,
      html,
    });
  }
}

export function createEmailService(): EmailService {
  if (env.NODE_ENV === 'production' && env.RESEND_API_KEY) {
    return new ResendEmailProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new ConsoleEmailProvider();
}

export const emailService: EmailService = createEmailService();
