/**
 * professional controller
 */

import { factories } from '@strapi/strapi'

import { sendConfirmationEmail } from '../../../services/email';

export default factories.createCoreController('api::professional.professional', ({ strapi }) => ({
    async approve(ctx) {
        const { id } = ctx.params;

        // 1. Find professional with User
        const professional = await strapi.entityService.findOne('api::professional.professional', id, {
            populate: ['user']
        }) as any;

        if (!professional) {
            return ctx.notFound('Professionista non trovato');
        }

        if (professional.confirmed) {
            return ctx.badRequest('Professionista già confermato');
        }

        // 2. Update confirmed status
        const updatedProfessional = await strapi.entityService.update('api::professional.professional', id, {
            data: { confirmed: true }
        });

        // 3. Send Email if User exists
        if (professional.user) {
            try {
                // Determine token: if user is not confirmed, they have a token.
                // If they are already confirmed (unlikely in this flow but possible), we might send a different email?
                // Plan says: "Account Approved & Confirm Email".
                // We assume user.confirmed is false as per registration flow.

                const user = professional.user;
                if (!user.confirmed && user.confirmationToken) {
                    await sendConfirmationEmail(user.email, user.confirmationToken);
                    strapi.log.info(`📧 Approval email sent to: ${user.email}`);
                } else {
                    strapi.log.info(`ℹ️ User ${user.email} already confirmed or no token.`);
                }
            } catch (err) {
                strapi.log.error('Failed to send approval email', err);
            }
        }

        return updatedProfessional;
    }
}));
