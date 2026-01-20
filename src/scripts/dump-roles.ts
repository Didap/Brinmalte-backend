
const fs = require('fs');
const path = require('path');

const Strapi = require('@strapi/strapi');

async function run() {
    const app = await Strapi.createStrapi({ distDir: './dist' }).load();

    try {
        console.log('Fetching roles and permissions...');

        // Fetch all roles with their permissions
        // We use the users-permissions plugin service if possible, or key queries
        // In Strapi 5, we can use the document service or entity service

        // Fetch Roles
        const roles = await app.documents('plugin::users-permissions.role').findMany({
            populate: ['permissions']
        });

        if (!roles || roles.length === 0) {
            console.log('No roles found.');
            process.exit(0);
        }

        // Clean data (remove IDs to make it portable, or keep them if we assume same DB uniqueness, 
        // but usually for seeding we match by type/name)
        const exportData = roles.map(role => ({
            name: role.name,
            description: role.description,
            type: role.type,
            permissions: role.permissions.map(p => ({
                action: p.action,
                subject: p.subject, // content-type usually
                properties: p.properties,
                conditions: p.conditions
            }))
        }));

        const outputPath = path.join(process.cwd(), 'config', 'roles-backup.json');
        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

        console.log(`Successfully exported ${roles.length} roles to ${outputPath}`);

    } catch (error) {
        console.error('Error dumping roles:', error);
    } finally {
        app.stop();
        process.exit(0);
    }
}

run();

export { };
