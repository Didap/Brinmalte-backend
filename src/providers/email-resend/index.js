'use strict';

/**
 * Custom Strapi Email Provider using Resend (JavaScript version)
 */
const { Resend } = require('resend');

module.exports = {
  init(providerOptions, settings) {
    const resend = new Resend(providerOptions.apiKey);

    return {
      async send(options) {
        const { from, to, cc, bcc, replyTo, subject, text, html } = options;

        try {
          const response = await resend.emails.send({
            from: from || settings.defaultFrom || 'onboarding@resend.dev',
            to,
            cc,
            bcc,
            reply_to: replyTo || settings.defaultReplyTo,
            subject,
            text,
            html,
          });

          if (response.error) {
            console.error('Resend email error:', response.error);
            // Non blocchiamo l'esecuzione, ma logghiamo l'errore
            // throw new Error(response.error.message); 
            return null;
          }

          console.log('Email sent successfully via Resend:', response.data?.id);
          return response.data;
        } catch (error) {
           console.error('Resend unexpected error:', error);
           return null;
        }
      },
    };
  },
};
