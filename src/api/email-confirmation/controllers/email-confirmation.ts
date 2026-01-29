/**
 * Email confirmation controller
 */
export default {
    async confirm(ctx) {
        const { token } = ctx.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        if (!token) {
            return ctx.redirect(`${frontendUrl}/email-confirmation?error=Link non valido`);
        }

        // Find user by confirmation token
        const user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { confirmationToken: token },
        });

        if (!user) {
            // Check if user is already confirmed (link clicked twice)
            // We can't easily find the user without the token if it's null, 
            // but for generic security we just say 'Invalid or Used'.
            // Actually, if they click twice, the token is null.
            return ctx.redirect(`${frontendUrl}/email-confirmation?error=Link scaduto o già utilizzato`);
        }

        // Confirm user
        await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: {
                confirmed: true,
                confirmationToken: null,
            },
        });

        strapi.log.info(`✅ User ${user.email} confirmed their email`);

        // Redirect to frontend success page
        ctx.redirect(`${frontendUrl}/email-confirmation?success=true`);
    },
};
