
const fs = require('fs');
const path = require('path');
const Strapi = require('@strapi/strapi');

async function run() {
    const app = await Strapi.createStrapi({ distDir: './dist' }).load();

    try {
        const backupPath = path.join(process.cwd(), 'config', 'roles-backup.json');

        if (!fs.existsSync(backupPath)) {
            console.error(`Backup file not found at ${backupPath}`);
            process.exit(1);
        }

        const rolesData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log(`Found ${rolesData.length} roles to seed in ${backupPath}`);

        for (const roleData of rolesData) {
            console.log(`Processing role: ${roleData.name} (${roleData.type})`);

            // 1. Find existing role by type
            let role = await app.documents('plugin::users-permissions.role').findFirst({
                filters: { type: roleData.type }
            });

            if (!role) {
                console.log(`Role ${roleData.type} not found, creating...`);
                // Create logic if needed (usually public/authenticated exist by default)
                role = await app.documents('plugin::users-permissions.role').create({
                    data: {
                        name: roleData.name,
                        description: roleData.description,
                        type: roleData.type
                    }
                });
            }

            // 2. Clear existing permissions for this role to ensure exact match?
            // Or we can just update/add. Usually safer to clear and re-add to avoid ghosts.
            // Fetch existing permissions IDs
            const existingRoleWithPerms: any = await app.documents('plugin::users-permissions.role').findOne({
                documentId: role.documentId,
                populate: ['permissions']
            });

            const permissionIdsToDelete = existingRoleWithPerms.permissions.map((p: any) => p.documentId);
            if (permissionIdsToDelete.length > 0) {
                // Bulk delete permissions won't work easily via document service directly on relation?
                // Actually permissions are their own collection: plugin::users-permissions.permission
                // We iterate and delete.
                // Optimization: Promise.all
                // console.log(`Clearing ${permissionIdsToDelete.length} existing permissions...`);
                // await Promise.all(permissionIdsToDelete.map(id => 
                //    app.documents('plugin::users-permissions.permission').delete({ documentId: id })
                // ));

                // BETTER: Use users-permissions service if available, but staying generic with document service
                // Since we are setting strict state, we can just wipe permissions linked to this role
                // BUT deleting one by one is slow.
                // Let's try to just update the role by overwriting permissions?
                // No, permissions are separate entities.

                // Let's loop and delete.
                for (const pID of permissionIdsToDelete) {
                    await app.documents('plugin::users-permissions.permission').delete({ documentId: pID });
                }
            }

            // 3. Create new permissions
            console.log(`Adding ${roleData.permissions.length} permissions...`);
            for (const permData of roleData.permissions) {
                await app.documents('plugin::users-permissions.permission').create({
                    data: {
                        action: permData.action,
                        subject: permData.subject,
                        properties: permData.properties,
                        conditions: permData.conditions,
                        role: role.documentId // Link to role
                    }
                });
            }

            console.log(`Role ${roleData.name} updated successfully.`);
        }

        console.log('All roles seeded successfully.');

    } catch (error) {
        console.error('Error seeding roles:', error);
    } finally {
        app.stop();
        process.exit(0);
    }
}

run();

export { };
