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

        // Force link the customer to the authenticated user
        ctx.request.body.data.user = user.id;

        const response = await super.create(ctx);
        return response;
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
