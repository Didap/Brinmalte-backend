
// Scripts usually need to be run with strapi context or inside the app.
// We can use a bootstrap function or just a standalone script that loads strapi.
// Simpler: Create a controller endpoint that mimics a debug script? 
// Or just a temporary file we can run with `npm run strapi console` -> actually complex in Windows automation.
// Best approach: Add a temporary route to 'custom-register' that dumps the last professional.

export default async ({ strapi }) => {
    try {
        const pros = await strapi.documents('api::professional.professional').findMany({
            sort: 'createdAt:desc',
            limit: 1,
            populate: ['user', 'skills', 'profilePhoto', 'gallery'],
            status: 'published', // Check published
        });

        if (pros.length === 0) {
            strapi.log.info('❌ No professionals found.');
            return;
        }

        const latest = pros[0];
        strapi.log.info('🔍 LATEST PROFESSIONAL (Document API):');
        strapi.log.info(JSON.stringify(latest, null, 2));

        // Check via DB Query (raw) to see if connections exist at lower level
        const raw = await strapi.db.query('api::professional.professional').findOne({
            where: { id: latest.id },
            populate: ['user', 'skills', 'profilePhoto']
        });
        strapi.log.info('🔍 LATEST PROFESSIONAL (DB Query Raw):');
        strapi.log.info(JSON.stringify(raw, null, 2));

    } catch (err) {
        strapi.log.error(err);
    }
};
