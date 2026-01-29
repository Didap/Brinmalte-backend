/**
 * Email confirmation routes
 */
export default {
    routes: [
        {
            method: 'GET',
            path: '/email-confirmation/confirm',
            handler: 'email-confirmation.confirm',
            config: {
                auth: false,
            },
        },
    ],
};
