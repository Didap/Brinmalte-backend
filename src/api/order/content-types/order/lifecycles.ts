export default {
    async afterCreate(event) {
        const { result } = event;
        // console.log('DEBUG: Order afterCreate triggered', result);

        try {
            const orderId = result.id;
            const paddedId = orderId.toString().padStart(6, '0');
            const orderNumber = `BRNMLT${paddedId}`;

            console.log(`[Lifecycle] Generated Order Number: ${orderNumber} for ID: ${orderId}`);

            if (result.documentId) {
                await strapi.documents('api::order.order').update({
                    documentId: result.documentId,
                    data: {
                        order_number: orderNumber
                    }
                });
                console.log('[Lifecycle] Order updated successfully');
            } else {
                console.error('[Lifecycle] No documentId found in result');
            }
        } catch (e) {
            console.error('[Lifecycle] Failed to generate order number:', e);
        }
    }
};
