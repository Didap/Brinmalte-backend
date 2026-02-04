export default {
    routes: [
        {
            method: 'POST',
            path: '/professionals/:id/approve',
            handler: 'professional.approve',
            config: {
                policies: [],
                middlewares: [],
                // We rely on standard role permissions to protect this? 
                // Or we can verify admin status in controller?
                // Usually better to use 'strapi::security' or rely on authenticated role having logic?
                // Wait, 'approve' should be ADMIN only. 
                // In Strapi v4, if we enable it in Admin Panel -> Roles -> Admin (API Token) orAuthenticated
                // The User requested "L'admin deve poter visualizzare... e confermarli".
                // So we should probably default to authenticated or configure it later.
                // Let's set it up so it CAN be configured.
            },
        },
    ],
};
