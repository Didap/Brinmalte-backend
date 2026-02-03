/**
 * Email Service using Resend
 */
import { Resend } from 'resend';
import { getEmailConfirmationTemplate } from './email-templates';

let resend: Resend | null = null;

const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  const { data, error } = await getResend().emails.send({
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
  const baseUrl = process.env.EMAIL_CONFIRMATION_URL || 'http://localhost:1337/api/email-confirmation/confirm';
  const confirmationUrl = `${baseUrl}?token=${token}`;

  const html = getEmailConfirmationTemplate(confirmationUrl);

  return sendEmail({
    to: email,
    subject: 'Conferma il tuo account BrinMalte',
    html,
  });
};
