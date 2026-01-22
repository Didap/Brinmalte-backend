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
            return ctx.unauthorized('You must be logged in to view customer profiles.');
        }

        // Check if user is Admin using Strapi Query Engine (more reliable)
        const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
            documentId: user.documentId, // Use documentId in Strapi v5 preferably, or id if v4
            populate: ['role']
        });

        // Use 'role' from fullUser if available, otherwise fallback/error
        const isAdmin = fullUser?.role?.name === 'Admin' || fullUser?.role?.type === 'admin';

        // Only filter by user if NOT admin
        if (!isAdmin) {
            if (!ctx.query.filters) ctx.query.filters = {};
            (ctx.query.filters as any).user = { id: { $eq: user.id } };
        }

        const { data, meta } = await super.find(ctx);
        return { data, meta };
    }
}));
