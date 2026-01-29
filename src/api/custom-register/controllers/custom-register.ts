/**
 * Custom registration controller
 * Bypasses Strapi's built-in validation to allow custom fields
 */
import { sendConfirmationEmail } from '../../../services/email';

export default {
    async register(ctx) {
        const { email, password, name, surname, phone } = ctx.request.body;

        // ========== VALIDATION ==========

        // 1. Required fields
        if (!email || !password) {
            return ctx.badRequest('Email e password sono obbligatori');
        }

        // 2. Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return ctx.badRequest('Inserisci un indirizzo email valido');
        }

        // 3. Password length (min 6 chars)
        if (password.length < 6) {
            return ctx.badRequest('La password deve avere almeno 6 caratteri');
        }

        // 4. Check if email already exists
        const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return ctx.badRequest('Questa email è già registrata. Prova ad accedere.');
        }

        try {
            // Generate confirmation token manually (crypto.randomUUID is built-in)
            const confirmationToken = require('crypto').randomUUID();

            // Get the default "Authenticated" role
            const defaultRole = await strapi.db.query('plugin::users-permissions.role').findOne({
                where: { type: 'authenticated' }
            });

            if (!defaultRole) {
                strapi.log.error('❌ Could not find Authenticated role!');
                return ctx.badRequest('Errore di configurazione server');
            }

            // Create User via Strapi service (only standard fields)
            const newUser = await strapi.plugins['users-permissions'].services.user.add({
                email: email.toLowerCase(),
                username: email.toLowerCase(),
                password,
                provider: 'local',
                confirmed: false,
                confirmationToken,
                role: defaultRole.id // Assign the Authenticated role
            });

            strapi.log.info(`✅ User created: ${email} with role: ${defaultRole.name}`);

            // 2. Create Customer Profile (linked to user)
            if (name || surname || phone) {
                try {
                    await strapi.documents('api::customer.customer').create({
                        data: {
                            name: name || '',
                            surname: surname || '',
                            phone: phone || '',
                            user: newUser.id
                        },
                        status: 'published'
                    });
                    strapi.log.info(`✅ Customer profile created for: ${email}`);
                } catch (custErr) {
                    strapi.log.error(`❌ Customer creation failed:`, custErr);
                }
            }

            // 3. Generate JWT
            const jwt = strapi.plugins['users-permissions'].services.jwt.issue({
                id: newUser.id
            });

            // 4. Send confirmation email (use the token we generated, not newUser.confirmationToken)
            try {
                await sendConfirmationEmail(email, confirmationToken);
                strapi.log.info(`📧 Confirmation email sent to: ${email}`);
            } catch (emailErr) {
                strapi.log.error(`❌ Email send failed:`, emailErr);
            }

            // 5. Return response
            ctx.body = { jwt, user: newUser };

        } catch (err: any) {
            strapi.log.error('Registration error:', err);

            if (err.message?.includes('taken') || err.message?.includes('already exists')) {
                return ctx.badRequest('Email già registrata');
            }
            if (err.message?.includes('password')) {
                return ctx.badRequest('La password deve avere almeno 6 caratteri');
            }
            return ctx.badRequest(err.message || 'Errore durante la registrazione');
        }
    }
};
