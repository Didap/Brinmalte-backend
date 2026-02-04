/**
 * Email Service using Resend
 */
import { Resend } from 'resend';
import { getEmailConfirmationTemplate } from './email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }

  const { data, error } = await resend.emails.send({
    from: 'BrinMalte <noreply@brinmalte.it>',
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const sendConfirmationEmail = async (email: string, token: string) => {
  const backendUrl = process.env.HOST === '0.0.0.0' ? 'http://localhost:1337' : `http://${process.env.HOST}:${process.env.PORT}`;
  const confirmationUrl = `${backendUrl}/api/email-confirmation/confirm?token=${token}`;

  const html = getEmailConfirmationTemplate(confirmationUrl);

  return sendEmail({
    to: email,
    subject: 'Conferma il tuo account BrinMalte',
    html,
  });
};
