/**
 * customer controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::customer.customer', ({ strapi }) => ({
    async create(ctx) {
        const user = ctx.state.user;

        if (!user) {
            return ctx.unauthorized('You must be logged in to create a customer profile.');
        }

        // Extract data from request body, remove user if present
        const { user: _ignoredUser, ...customerData } = ctx.request.body.data || {};

        // Create customer directly with strapi.documents, linking to authenticated user
        const customer = await strapi.documents('api::customer.customer').create({
            data: {
                ...customerData,
                user: user.id,
            },
        });

        return { data: customer };
    },

    async find(ctx) {
        const user = ctx.state.user;

        if (!user) {
            // If no user, maybe allow if public permissions are open? Or block?
            // Default behavior checks permissions.
            // But if we want to RESTRICT to own data for Authenticated users:
            return ctx.unauthorized('You must be logged in to view customer profiles.');
        }

        // Force filter by current user
        if (!ctx.query.filters) ctx.query.filters = {};
        (ctx.query.filters as any).user = { id: { $eq: user.id } };

        const { data, meta } = await super.find(ctx);
        return { data, meta };
    }
}));
