/**
 * Custom registration controller
 * Bypasses Strapi's built-in validation to allow custom fields
 */
import { sendConfirmationEmail } from '../../../services/email';

const { parseMultipartData } = require('@strapi/utils');

export default {
    async register(ctx) {
        try {
            let body;
            let files;

            strapi.log.info('📝 Custom Register: Received Request');
            strapi.log.info(`📝 Content-Type: ${ctx.request.header['content-type']}`);

            // Parse Request (Multipart vs JSON)
            // Parse Request (Multipart vs JSON)
            if (ctx.is('multipart')) {
                try {
                    // Log raw request data for debugging
                    strapi.log.info('RAW Body:', ctx.request.body);
                    strapi.log.info('RAW Files:', ctx.request.files);

                    // Manual Parsing (more robust than utils)
                    // Strapi/Koa Body Parser usually puts fields in body and files in files

                    let rawBody = ctx.request.body;
                    files = ctx.request.files || {};

                    // Case 1: Standard Strapi format (data string + files)
                    if (rawBody && rawBody.data) {
                        try {
                            body = JSON.parse(rawBody.data);
                        } catch (jsonErr) {
                            strapi.log.warn('Could not parse body.data JSON:', jsonErr);
                            body = rawBody; // Fallback
                        }
                    }
                    // Case 2: Flat fields in FormData (Legacy/Custom)
                    else {
                        body = rawBody;
                    }

                } catch (parseErr) {
                    strapi.log.error('❌ Manual Parsing Failed:', parseErr);
                    return ctx.badRequest('Errore nel parsing dei dati (Manual).');
                }
            } else {
                body = ctx.request.body;
                files = {};
            }

            strapi.log.info('📝 Body:', body);
            strapi.log.info('📝 Files:', files);

            if (!body) {
                return ctx.badRequest('Nessun dato ricevuto (body vuoto).');
            }

            const { email, password, name, surname, phone, isProfessional, skills } = body;

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

            // Generate confirmation token manually
            const confirmationToken = require('crypto').randomUUID();

            // Get the default "Authenticated" role
            const defaultRole = await strapi.db.query('plugin::users-permissions.role').findOne({
                where: { type: 'authenticated' }
            });

            if (!defaultRole) {
                strapi.log.error('❌ Could not find Authenticated role!');
                return ctx.badRequest('Errore di configurazione server (Ruolo non trovato)');
            }

            // Create User via Strapi service (only standard fields)
            const newUser = await strapi.plugins['users-permissions'].services.user.add({
                email: email.toLowerCase(),
                username: email.toLowerCase(),
                password,
                provider: 'local',
                confirmed: false,
                confirmationToken,
                role: defaultRole.id
            });

            strapi.log.info(`✅ User created: ${email} with role: ${defaultRole.name}`);

            if (isProfessional === 'true' || isProfessional === true) {
                // ========== PROFESSIONAL REGISTRATION ==========
                try {
                    // Extract profile photo if present
                    const profilePhoto = files && files.profilePhoto ? files.profilePhoto : null;

                    // Safely handle skills parsing
                    let parsedSkills = skills;
                    if (typeof skills === 'string') {
                        try {
                            parsedSkills = JSON.parse(skills);
                        } catch (e) {
                            parsedSkills = [skills];
                        }
                    }

                    const professionalData: any = {
                        user: newUser.id,
                        skills: parsedSkills
                    };

                    const filesToUpload: any = {};
                    if (profilePhoto) {
                        filesToUpload['profilePhoto'] = profilePhoto;
                    }
                    // Handle Gallery - Strapi multipart parser might return file or array of files
                    if (files && files.gallery) {
                        filesToUpload['gallery'] = files.gallery;
                    }

                    await strapi.service('api::professional.professional').create({
                        data: professionalData,
                        files: filesToUpload
                    });

                    strapi.log.info(`✅ Professional profile created for: ${email}`);
                } catch (profErr) {
                    strapi.log.error(`❌ Professional creation failed:`, profErr);
                    // Do NOT fail the whole request, as user is created. maybe warn?
                }

            } else {
                // ========== CUSTOMER REGISTRATION (Legacy) ==========
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
            }

            // 3. Generate JWT
            const jwt = strapi.plugins['users-permissions'].services.jwt.issue({
                id: newUser.id
            });

            // 4. Send confirmation email
            try {
                await sendConfirmationEmail(email, confirmationToken);
                strapi.log.info(`📧 Confirmation email sent to: ${email}`);
            } catch (emailErr) {
                strapi.log.error(`❌ Email send failed:`, emailErr);
            }

            // 5. Return response
            ctx.body = { jwt, user: newUser };

        } catch (err: any) {
            strapi.log.error('❌ TOP LEVEL Registration error:', err);

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
