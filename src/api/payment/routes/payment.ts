
export default {
    routes: [
        {
            method: 'POST',
            path: '/payment/checkout-session',
            handler: 'payment.createCheckoutSession',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'POST',
            path: '/payment/webhook',
            handler: 'payment.webhook',
            config: {
                auth: false, // Webhooks are public (verified by signature)
                policies: [],
                middlewares: [], // might need 'plugin::users-permissions.rateLimit'? No.
            },
        },
    ],
};
