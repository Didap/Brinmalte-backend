export default {
  routes: [
    {
      method: 'POST',
      path: '/products/import-excel',
      handler: 'product.importExcel',
      config: {
        middlewares: ['global::isAdmin'],
      },
    },
  ],
};
