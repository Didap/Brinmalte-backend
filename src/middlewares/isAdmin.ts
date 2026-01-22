/**
 * Admin middleware - Checks if the authenticated user has Admin role
 * Use this middleware on routes that should only be accessible by admins
 */
export default (config, { strapi }) => {
    return async (ctx, next) => {
        // Check if user is authenticated
        if (!ctx.state.user) {
            return ctx.unauthorized('You must be logged in');
        }

        // Get user with role populated
        const user = await strapi.documents('plugin::users-permissions.user').findOne({
            documentId: ctx.state.user.documentId,
            populate: ['role']
        });

        if (!user) {
            return ctx.unauthorized('User not found');
        }

        // Check if user has Admin role
        const isAdmin = user.role?.name === 'Admin' || user.role?.type === 'admin';

        if (!isAdmin) {
            return ctx.forbidden('Access denied. Admin privileges required.');
        }

        // User is admin, proceed
        await next();
    };
};
