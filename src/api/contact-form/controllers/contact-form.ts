import { sendEmail } from '../../../services/email';
import { getContactFormTemplate } from '../../../services/email-templates';

const CONTACT_EMAIL = 'brinmalte@gmail.com';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUBJECTS = {
    contatto: 'Nuovo messaggio di contatto',
    preventivo: 'Nuova richiesta di preventivo',
    albo: 'Nuova iscrizione Albo Applicatori',
};

export default {
    async send(ctx) {
        try {
            const { type, data } = ctx.request.body;

            if (!type || !data) {
                return ctx.badRequest('Campi mancanti');
            }

            if (!['contatto', 'preventivo', 'albo'].includes(type)) {
                return ctx.badRequest('Tipo di form non valido');
            }

            // Validate required fields per type
            if (type === 'contatto') {
                if (!data.nome || !data.email || !data.messaggio) {
                    return ctx.badRequest('Nome, email e messaggio sono obbligatori');
                }
            } else if (type === 'preventivo') {
                if (!data.nome || !data.email) {
                    return ctx.badRequest('Nome e email sono obbligatori');
                }
            } else if (type === 'albo') {
                if (!data.nome || !data.cognome || !data.email) {
                    return ctx.badRequest('Nome, cognome e email sono obbligatori');
                }
            }

            // Validate email format
            if (!emailRegex.test(data.email)) {
                return ctx.badRequest('Indirizzo email non valido');
            }

            const subject = SUBJECTS[type] || 'Nuovo messaggio';
            const html = getContactFormTemplate(type, data);

            await sendEmail({
                to: CONTACT_EMAIL,
                subject,
                html,
            });

            ctx.body = { success: true, message: 'Messaggio inviato con successo' };
        } catch (err: any) {
            strapi.log.error('Contact form error:', err);
            return ctx.internalServerError('Errore nell\'invio del messaggio');
        }
    },
};
