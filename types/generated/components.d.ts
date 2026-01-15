import type { Schema, Struct } from '@strapi/strapi';

export interface OrdersOrderItem extends Struct.ComponentSchema {
  collectionName: 'components_orders_order_items';
  info: {
    description: '';
    displayName: 'OrderItem';
    icon: 'shopping-cart';
  };
  attributes: {
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'>;
    product_name: Schema.Attribute.String;
    quantity: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    unit_price: Schema.Attribute.Decimal;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'orders.order-item': OrdersOrderItem;
    }
  }
}
