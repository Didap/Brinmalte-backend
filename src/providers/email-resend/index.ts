/**
 * Custom Strapi Email Provider using Resend
 */
import { Resend } from 'resend';

interface EmailOptions {
    from?: string;
    to: string;
    cc?: string;
    bcc?: string;
    replyTo?: string;
    subject: string;
    text?: string;
    html?: string;
}

interface ProviderOptions {
    apiKey: string;
}

interface Settings {
    defaultFrom?: string;
    defaultReplyTo?: string;
}

export const init = (providerOptions: ProviderOptions, settings: Settings) => {
    const resend = new Resend(providerOptions.apiKey);

    return {
        async send(options: EmailOptions) {
            const { from, to, cc, bcc, replyTo, subject, text, html } = options;
            let sender = from || settings.defaultFrom || 'BrinMalte <noreply@brinmalte.it>';

            // Fix: Strapi often defaults to 'no-reply@strapi.io' even if configured otherwise in some contexts.
            // We force it to use our verified domain to avoid Resend 403 errors.
            if (sender.includes('strapi.io')) {
                sender = 'BrinMalte <noreply@brinmalte.it>';
            }

            console.log('--- DEBUG RESEND PROVIDER ---');
            console.log('API Key present:', !!providerOptions.apiKey);
            console.log('Sender:', sender);
            console.log('To:', to);
            // console.log('HTML length:', html?.length); // Optional: checking content

            const response = await resend.emails.send({
                from: sender,
                to,
                cc,
                bcc,
                replyTo: replyTo || settings.defaultReplyTo,
                subject,
                text,
                html,
            });

            if (response.error) {
                console.error('Resend email error:', response.error);
                throw new Error(response.error.message);
            }

            console.log('Email sent successfully via Resend:', response.data?.id);
            return response.data;
        },
    };
};
