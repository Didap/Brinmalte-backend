
export default {
    routes: [
        {
            method: 'POST',
            path: '/products/randomize',
            handler: 'product.randomizeCategories',
            config: {
                auth: false,
            },
        },
    ],
};
