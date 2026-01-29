/**
 *  payment controller
 */

import Stripe from 'stripe';

export default {
    async createCheckoutSession(ctx) {
        const { orderId } = ctx.request.body;
        const userId = ctx.state.user?.id;

        if (!orderId) {
            return ctx.badRequest('Order ID is required');
        }

        // 1. Fetch Order
        // @ts-ignore
        const order = await strapi.documents('api::order.order').findOne({
            documentId: orderId,
            populate: ['customer', 'customer.user', 'items', 'items.product']
        }) as any;

        if (!order) {
            return ctx.notFound('Order not found');
        }

        // Security verify: User must own the order
        const customerUser = order.customer?.user;
        if (customerUser?.documentId !== userId && customerUser?.id !== userId) {
            return ctx.forbidden('You are not the owner of this order');
        }

        // 2. Init Stripe
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2025-12-15.clover',
            typescript: true,
        });

        // 3. Create Session
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product_data: {
                                name: `Ordine BrinMalte #${order.order_number || order.documentId}`,
                                description: `Ordine di ${order.items?.length || 0} prodotti`,
                            },
                            unit_amount: Math.round(order.total * 100), // Stripe expects cents
                        },
                        quantity: 1,
                    },
                ],
                customer_email: order.customer_email || ctx.state.user.email,
                success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.FRONTEND_URL}/checkout?canceled=true`,
                metadata: {
                    orderId: order.documentId // Critical for webhook
                }
            });

            // SAVE SESSION ID TO ORDER IMMEDIATELY
            await strapi.documents('api::order.order').update({
                documentId: orderId,
                data: {
                    stripe_session_id: session.id
                }
            });

            return { url: session.url };

        } catch (err: any) {
            strapi.log.error(err);
            return ctx.internalServerError('Failed to create payment session');
        }
    },

    async webhook(ctx) {
        console.log('--- STRIPE WEBHOOK RECEIVED ---');
        console.log('Headers:', ctx.request.headers);

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
            apiVersion: '2025-12-15.clover',
            typescript: true,
        });

        const signature = ctx.request.headers['stripe-signature'];
        let event;

        try {
            // Verify webhook signature
            event = stripe.webhooks.constructEvent(
                ctx.request.body[Symbol.for('unparsedBody')] || JSON.stringify(ctx.request.body),
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (err: any) {
            if (process.env.NODE_ENV === 'development' && ctx.request.body?.type) {
                event = ctx.request.body;
            } else {
                strapi.log.error(`⚠️  Webhook signature verification failed.`, err.message);
                return ctx.badRequest(`Webhook Error: ${err.message}`);
            }
        }

        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const orderId = session.metadata?.orderId;

            if (orderId) {
                strapi.log.info(`💰 Payment for Order ${orderId} succeeded!`);

                // Update Order Status
                await strapi.documents('api::order.order').update({
                    documentId: orderId,
                    data: {
                        order_status: 'paid' as any,
                        stripe_session_id: session.id
                    }
                });
            }
        }

        return { received: true };
    }
};
