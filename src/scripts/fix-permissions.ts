import { createStrapi } from '@strapi/strapi';

async function fixPermissions() {
    // Initialize Strapi without starting the server
    // @ts-ignore
    const strapi = createStrapi({ distDir: './dist' });
    await strapi.load();

    try {
        console.log('🔄 Checking permissions...');

        // 1. Find the Authenticated Role
        const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' },
            populate: ['permissions']
        });

        if (!authenticatedRole) {
            console.error('❌ Role "Authenticated" not found!');
            return;
        }

        console.log(`✅ Found Role: ${authenticatedRole.name} (ID: ${authenticatedRole.id})`);

        // 2. Define permissions to add
        // Format: "plugin::plugin-name.controller.action" or "api::api-name.controller.action"
        const permissionsToAdd = [
            // Upload permissions
            { action: 'plugin::upload.content-api.upload' },
            // Product permissions
            { action: 'api::product.product.create' },
            { action: 'api::product.product.update' },
            // Category permissions (read-only usually)
            { action: 'api::category.category.find' },
            { action: 'api::category.category.findOne' },
        ];

        let addedCount = 0;

        for (const perm of permissionsToAdd) {
            // Check if permission already exists
            const exists = authenticatedRole.permissions.find((p: any) => p.action === perm.action);

            if (!exists) {
                console.log(`➕ Adding permission: ${perm.action}`);
                await strapi.db.query('plugin::users-permissions.permission').create({
                    data: {
                        action: perm.action,
                        role: authenticatedRole.id
                    }
                });
                addedCount++;
            } else {
                console.log(`✓ Permission already exists: ${perm.action}`);
            }
        }

        console.log(`\n✨ DONE! Added ${addedCount} missing permissions.`);
        console.log('👉 Please RESTART your Strapi server now.');

    } catch (error) {
        console.error('❌ Error fixing permissions:', error);
    } finally {
        process.exit(0);
    }
}

fixPermissions();
