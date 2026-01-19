/**
 * product controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
    async randomizeCategories(ctx) {
        try {
            // 1. Fetch Categories
            const categories = await strapi.documents('api::category.category').findMany({
                status: 'published'
            });

            if (!categories || categories.length === 0) {
                return ctx.badRequest('No categories found');
            }

            // 2. Fetch Products
            const products = await strapi.documents('api::product.product').findMany({
                status: 'published',
                limit: 5000 // Get all
            });

            let updatedCount = 0;

            // 3. Update Loop
            for (const product of products) {
                const randomCat = categories[Math.floor(Math.random() * categories.length)];

                await strapi.documents('api::product.product').update({
                    documentId: product.documentId,
                    status: 'published',
                    data: {
                        category: randomCat.documentId
                    }
                });
                updatedCount++;
            }

            ctx.send({
                message: 'Success',
                updated: updatedCount,
                totalProducts: products.length
            });

        } catch (err) {
            console.error(err);
            ctx.internalServerError('Failed to randomize categories');
        }
    }
}));
