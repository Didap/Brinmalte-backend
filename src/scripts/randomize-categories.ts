
import { createStrapi } from '@strapi/strapi';

async function main() {
    console.log('Starting Strapi instance...');
    // We point to dist because Strapi v5 expects compiled files for schema loading
    const strapi = createStrapi({ distDir: './dist' });
    await strapi.load();
    console.log('Strapi loaded successfully.');

    try {
        // 1. Fetch all Categories
        // Use the new Draft & Publish 'documents' API if available in v5
        // or fallback to entityService if using standard service
        const categories = await strapi.documents('api::category.category').findMany({
            status: 'published'
        });

        console.log(`Found ${categories.length} categories.`);

        if (categories.length === 0) {
            console.log('No categories found. Cannot assign.');
            return;
        }

        // 2. Fetch all Products
        const products = await strapi.documents('api::product.product').findMany({
            status: 'published', // or 'draft' if we want to update drafts too. Usually we want published.
            limit: 5000
        });

        console.log(`Found ${products.length} products.`);

        // 3. Update each product
        for (const product of products) {
            const randomCat = categories[Math.floor(Math.random() * categories.length)];

            process.stdout.write(`Updating ${product.name}... `);

            await strapi.documents('api::product.product').update({
                documentId: product.documentId,
                data: {
                    category: randomCat.documentId
                }
            });

            console.log(`Done (${randomCat.name})`);
        }

        console.log('All products updated successfully.');

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        process.exit(0);
    }
}

main();
