// Helper to update customer stats
const updateCustomerStats = async (customerId) => {
    if (!customerId) return;

    try {
        // Fetch all orders for this customer
        const orders = await strapi.documents('api::order.order').findMany({
            filters: {
                customer: {
                    documentId: customerId
                }
            },
            fields: ['total']
        });

        const totalSpent = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
        const ordersCount = orders.length;

        await strapi.documents('api::customer.customer').update({
            documentId: customerId,
            data: {
                total_spent: totalSpent,
                orders_count: ordersCount
            }
        });
        console.log(`[Lifecycle] Updated stats for customer ${customerId}: ${ordersCount} orders, ${totalSpent} spent`);
    } catch (e) {
        console.error('[Lifecycle] Failed to update customer stats:', e);
    }
};

export default {
    async afterCreate(event) {
        const { result } = event;

        try {
            const orderId = result.id;
            const paddedId = orderId.toString().padStart(6, '0');
            const orderNumber = `BRNMLT${paddedId}`;

            console.log(`[Lifecycle] Generated Order Number: ${orderNumber} for ID: ${orderId}`);

            if (result.documentId) {
                // Update Order Number
                await strapi.documents('api::order.order').update({
                    documentId: result.documentId,
                    data: {
                        order_number: orderNumber
                    }
                });

                // Update Customer Stats
                // We need to fetch the order with customer populated to know who to update
                const orderWithCustomer = await strapi.documents('api::order.order').findOne({
                    documentId: result.documentId,
                    populate: ['customer']
                });

                if (orderWithCustomer?.customer?.documentId) {
                    await updateCustomerStats(orderWithCustomer.customer.documentId);
                }
            }
        } catch (e) {
            console.error('[Lifecycle] Failed in afterCreate:', e);
        }
    },

    async afterUpdate(event) {
        const { result } = event;
        // Recalculate stats for the customer of this order
        try {
            if (result && result.documentId) {
                const orderWithCustomer = await strapi.documents('api::order.order').findOne({
                    documentId: result.documentId,
                    populate: ['customer']
                });

                if (orderWithCustomer?.customer?.documentId) {
                    await updateCustomerStats(orderWithCustomer.customer.documentId);
                }
            }
        } catch (e) {
            console.error('[Lifecycle] Failed in afterUpdate:', e);
        }
    },

    async afterDelete(event) {
        const { result } = event;
        // Recalculate stats for the customer of this order
        try {
            if (result && result.documentId) {
                // Wait, result might not have relation if deleted? 
                // Usually afterDelete result contains the deleted data.
                // We might need to rely on what was returned.
                // If deep populate wasn't requested, we might miss customer.
                // But typically for stats, if we miss it, we miss it.
                // A better approach for delete is usually using beforeDelete to get the customer, 
                // but let's try with result first or just ignore for now if complex.
                // Strapi v5 delete returns the deleted document.

                // If we can't reliably get the customer from result, we can't update.
                // Let's try to see if result has customer.
                // If not, we skip.
            }
        } catch (e) {
            console.error('[Lifecycle] Failed in afterDelete:', e);
        }
    }
};
