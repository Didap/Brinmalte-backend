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
    },
    async afterUpdate(event) {
        const { result, params } = event;
        const { data } = params;

        if (data && result) {
            try {
                let action = "UPDATE";
                let details = "Order updated.";

                // Basic heuristic for status change
                // We cannot easily compare old/new without a beforeUpdate fetch, but we can log that 'status' was in the payload.
                if (data.status) {
                    action = "STATUS_CHANGE";
                    details = `Status updated to ${data.status}`;
                }

                await strapi.documents('api::order-log.order-log').create({
                    data: {
                        action: action,
                        details: JSON.stringify(data),
                        order: result.documentId || result.id,
                        publishedAt: new Date(),
                    }
                });
            } catch (err) {
                console.error("Error creating order log:", err);
            }
        }
    }
};
