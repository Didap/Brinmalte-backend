/**
 * Custom register routes
 */
export default {
    routes: [
        {
            method: 'POST',
            path: '/auth/custom-register',
            handler: 'custom-register.register',
            config: {
                auth: false, // No auth required for registration
                policies: [],
                middlewares: []
            }
        }
    ]
};
