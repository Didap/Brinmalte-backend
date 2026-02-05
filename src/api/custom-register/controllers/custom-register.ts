/**
 * Custom registration controller
 * Bypasses Strapi's built-in validation to allow custom fields
 */
import { sendConfirmationEmail } from '../../../services/email';

// Custom imports for file handling
const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseMultipartData } = require('@strapi/utils');

export default {
    async register(ctx) {
        try {
            let body;
            let files;

            strapi.log.info('📝 Custom Register: Received Request');
            strapi.log.info(`📝 Content-Type: ${ctx.request.header['content-type']}`);

            // Parse Request (Multipart vs JSON)
            if (ctx.is('multipart')) {
                try {
                    // Log raw request data for debugging
                    strapi.log.info('RAW Body:', ctx.request.body);
                    strapi.log.info('RAW Files:', ctx.request.files);

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

            // ========== PROFESSIONAL REGISTRATION ==========
            const isProf = isProfessional === 'true' || isProfessional === true;

            if (isProf) {
                strapi.log.info('🔍 ENTERING PROFESSIONAL REGISTRATION BLOCK');
                strapi.log.info(`🔍 isProfessional value: ${isProfessional} (Type: ${typeof isProfessional})`);

                try {
                    // --- 1. HANDLE UPLOADS FIRST ---
                    const uploadService = strapi.plugin('upload').service('upload');
                    let profilePhotoId = null;
                    let galleryIds = [];

                    // Robust helper to find file by partial key match (e.g. "files.profilePhoto", "profilePhoto", "data[profilePhoto]")
                    const findFile = (searchKey: string) => {
                        if (!files) return null;
                        const exact = files[searchKey] || files[`files.${searchKey}`];
                        if (exact) return exact;
                        // Fuzzy search
                        const foundKey = Object.keys(files).find(k => k.toLowerCase().includes(searchKey.toLowerCase()));
                        return foundKey ? files[foundKey] : null;
                    };

                    const profilePhotoFile = findFile('profilePhoto');

                    if (profilePhotoFile) {
                        // Normalize: Ensure it's a single file object
                        let rawFile = Array.isArray(profilePhotoFile) ? profilePhotoFile[0] : profilePhotoFile;
                        try {
                            strapi.log.info(`🚀 [DEBUG] Raw File Keys: ${Object.keys(rawFile)}`);

                            // Determine correct path
                            const validPath = rawFile.filepath || rawFile.path || rawFile.tempFilePath;

                            if (!validPath) {
                                strapi.log.error(`❌ File has no path/filepath/tempFilePath. Cannot upload.`);
                                throw new Error('File object missing path');
                            }

                            // Construct a CLEAN, PLAIN OBJECT for Strapi Upload Service
                            // heavily fortified against "undefined path" errors
                            const fileBuffer = fs.readFileSync(validPath);
                            const fileStream = fs.createReadStream(validPath);

                            const cleanFile = {
                                name: rawFile.originalFilename || rawFile.name || 'profile_photo.jpg',
                                type: rawFile.mimetype || rawFile.type || 'application/octet-stream',
                                size: rawFile.size || 0,
                                path: validPath,
                                filepath: validPath,
                                tmpPath: validPath,
                                originalFilename: rawFile.originalFilename || rawFile.name || 'profile_photo.jpg',
                                buffer: fileBuffer,
                                stream: fileStream
                            };

                            strapi.log.info(`🚀 Uploading CLEAN File Object (with Buffer/Stream): ${JSON.stringify({ ...cleanFile, buffer: '[Buffer]', stream: '[Stream]' })}`);

                            // FIX: uploadService.upload expects 'files' to be the FILE itself (or array), NOT a map { key: file }
                            const [uploaded] = await uploadService.upload({
                                data: {},
                                files: cleanFile
                            });

                            if (uploaded) {
                                profilePhotoId = uploaded.id;
                                strapi.log.info(`📸 Profile photo uploaded to Cloudinary. ID: ${profilePhotoId}`);
                            }
                        } catch (upErr: any) {
                            strapi.log.error('❌ Failed to upload profile photo', upErr);

                            // RECOVERY FOR WINDOWS EBUSY ERROR
                            // The file is likely uploaded/saved but temp cleanup failed, crashing the return
                            if (upErr.code === 'EBUSY' || upErr.message?.includes('EBUSY') || upErr.message?.includes('resource busy')) {
                                strapi.log.warn('⚠️ EBUSY detected. Attempting to recover uploaded file ID from DB...');
                                try {
                                    const recoveredFile = await strapi.db.query('plugin::upload.file').findOne({
                                        where: {
                                            name: { $contains: rawFile.originalFilename || rawFile.name }, // Fuzzy match name
                                            createdAt: { $gt: new Date(Date.now() - 15000) } // Created in last 15s
                                        },
                                        orderBy: { createdAt: 'desc' }
                                    });

                                    if (recoveredFile) {
                                        profilePhotoId = recoveredFile.id;
                                        strapi.log.info(`✅ RECOVERED Profile Photo ID: ${profilePhotoId}`);
                                    } else {
                                        strapi.log.warn('⚠️ Could not recover file ID from DB.');
                                    }
                                } catch (recErr) {
                                    strapi.log.error('❌ Recovery failed:', recErr);
                                }
                            } else {
                                if (upErr instanceof Error) {
                                    strapi.log.error('Stack Trace:', upErr.stack);
                                }
                            }
                        }
                    } else {
                        strapi.log.warn('⚠️ No profilePhoto file identified to upload.');
                    }
                    // Upload Gallery
                    const galleryFilesIncomingRaw = findFile('gallery');

                    if (galleryFilesIncomingRaw) {
                        try {
                            const galleryFilesIncoming = Array.isArray(galleryFilesIncomingRaw) ? galleryFilesIncomingRaw : [galleryFilesIncomingRaw];
                            for (const file of galleryFilesIncoming) {

                                // Clean Object Logic
                                const validPath = file.filepath || file.path || file.tempFilePath;
                                if (!validPath) continue;

                                const fileBuffer = fs.readFileSync(validPath);
                                const fileStream = fs.createReadStream(validPath);

                                const cleanFile = {
                                    name: file.originalFilename || file.name || 'gallery_photo.jpg',
                                    type: file.mimetype || file.type || 'application/octet-stream',
                                    size: file.size || 0,
                                    path: validPath,
                                    filepath: validPath,
                                    tmpPath: validPath,
                                    originalFilename: file.originalFilename || file.name,
                                    buffer: fileBuffer,
                                    stream: fileStream
                                };

                                const [uploaded] = await uploadService.upload({
                                    data: {},
                                    files: cleanFile
                                });
                                if (uploaded) {
                                    galleryIds.push(uploaded.id);
                                }
                            }
                            strapi.log.info(`📸 Gallery uploaded. IDs: ${galleryIds}`);
                        } catch (upErr: any) {
                            strapi.log.error('❌ Failed to upload gallery', upErr);

                            // RECOVERY FOR GALLERY EBUSY
                            if (upErr.code === 'EBUSY' || upErr.message?.includes('EBUSY') || upErr.message?.includes('resource busy')) {
                                strapi.log.warn('⚠️ EBUSY detected during Gallery upload. Attempting recovery...');
                                try {
                                    // Try to find recent files that might belong to this gallery batch
                                    // This is harder as we don't know exactly which one failed loop, so we fetch recent matches
                                    const recentFiles = await strapi.db.query('plugin::upload.file').findMany({
                                        where: {
                                            createdAt: { $gt: new Date(Date.now() - 20000) },
                                            mime: { $contains: 'image' }
                                        },
                                        orderBy: { createdAt: 'desc' },
                                        limit: 5
                                    });

                                    // Heuristic: Add recent files that aren't the profile photo
                                    // This is imperfect but saves the registration flow
                                    for (const f of recentFiles) {
                                        if (f.id !== profilePhotoId && !galleryIds.includes(f.id)) {
                                            galleryIds.push(f.id);
                                            strapi.log.info(`✅ RECOVERED Gallery File ID: ${f.id}`);
                                        }
                                    }
                                } catch (recErr) {
                                    strapi.log.error('❌ Gallery recovery failed:', recErr);
                                }
                            }

                            if (upErr instanceof Error) {
                                strapi.log.error('Stack Trace:', upErr.stack);
                            }
                        }
                    }

                    // --- 2. PREPARE RELATIONS ---

                    // User Relation: Ensure we have the Document ID
                    let userDocId = newUser.documentId;
                    if (!userDocId) {
                        strapi.log.info('⚠️ newUser.documentId missing. Fetching manually...');
                        try {
                            const userEntity = await strapi.db.query('plugin::users-permissions.user').findOne({
                                where: { id: newUser.id }
                            });
                            if (userEntity) {
                                userDocId = userEntity.documentId;
                                strapi.log.info(`✅ Fetched User Document ID: ${userDocId}`);
                            }
                        } catch (uErr) {
                            strapi.log.error('Failed to fetch user Document ID', uErr);
                        }
                    }

                    // Skills Relation
                    let parsedSkills = skills;
                    if (typeof skills === 'string') {
                        try {
                            parsedSkills = JSON.parse(skills);
                        } catch (e) {
                            parsedSkills = [skills];
                        }
                    }
                    const skillsList = Array.isArray(parsedSkills) ? parsedSkills : [parsedSkills];
                    const validSkills = skillsList.filter(s => s && typeof s === 'string');

                    strapi.log.info('🔍 Final Skills List:', validSkills);

                    // --- 3. PREPARE NUMERIC IDs FOR DB BYPASS ---
                    let skillNumericIds = [];
                    if (validSkills.length > 0) {
                        try {
                            const skillEntities = await strapi.db.query('api::category.category').findMany({
                                where: { documentId: { $in: validSkills } },
                                select: ['id']
                            });
                            skillNumericIds = skillEntities.map(s => s.id);
                            strapi.log.info(`✅ Resolved Skills to Numeric IDs: ${skillNumericIds}`);
                        } catch (sErr) {
                            strapi.log.error('Failed to resolve skills numeric IDs', sErr);
                        }
                    }

                    // --- 4. CREATE PROFESSIONAL ---
                    const professionalData: any = {
                        user: userDocId,
                        skills: validSkills,
                        confirmed: false,
                        ...(profilePhotoId && { profilePhoto: profilePhotoId }),
                        ...(galleryIds.length > 0 && { gallery: galleryIds })
                    };

                    const newProfessionalDoc = await strapi.documents('api::professional.professional').create({
                        data: professionalData,
                        status: 'published'
                    });

                    strapi.log.info(`✅ Professional profile created: ${newProfessionalDoc.documentId}`);

                    // --- 5. FORCE UPDATE (THE "FIX IT" STEP) ---
                    if (newProfessionalDoc) {
                        try {
                            const profEntity = await strapi.db.query('api::professional.professional').findOne({
                                where: { documentId: newProfessionalDoc.documentId }
                            });

                            if (profEntity) {
                                const updateData: any = {
                                    user: newUser.id,
                                };
                                if (skillNumericIds.length > 0) {
                                    updateData.skills = skillNumericIds;
                                }
                                if (profilePhotoId) updateData.profilePhoto = profilePhotoId;
                                if (galleryIds.length > 0) updateData.gallery = galleryIds;

                                await strapi.db.query('api::professional.professional').update({
                                    where: { id: profEntity.id },
                                    data: updateData
                                });
                                strapi.log.info('🔒 Forced Relations Update via DB Query (Numeric IDs applied)');
                            }
                        } catch (fallbackErr) {
                            strapi.log.error('❌ Fallback DB update failed', fallbackErr);
                        }
                    }

                } catch (profErr) {
                    strapi.log.error(`❌ Professional creation failed:`, profErr);
                }
            }

            // ========== CUSTOMER REGISTRATION ==========
            if (name || surname || phone) {
                try {
                    await strapi.documents('api::customer.customer').create({
                        data: {
                            name: name || '',
                            surname: surname || '',
                            phone: phone || '',
                            user: newUser.documentId || newUser.id
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

            // 4. Send confirmation email
            if (!isProf) {
                try {
                    await sendConfirmationEmail(email, confirmationToken);
                    strapi.log.info(`📧 Confirmation email sent to: ${email}`);
                } catch (emailErr) {
                    strapi.log.error(`❌ Email send failed:`, emailErr);
                }
            } else {
                strapi.log.info(`ℹ️ Professional registered: ${email}. Email deferred until manual approval.`);
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
