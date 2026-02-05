import type { Core } from '@strapi/strapi';
import dns from 'node:dns';

// Fix: Force IPv4 to avoid ECONNRESET issues with Resend/Node/Localhost
dns.setDefaultResultOrder('ipv4first');

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // database seeding logic removed for production

    // Recalculate customer stats on startup (Dev convenience)
    try {
      console.log('Bootstrap: Recalculating Customer Stats...');
      // Note: Use document service API
      const customers = await strapi.documents('api::customer.customer').findMany({ populate: ['orders'] });

      for (const customer of customers) {
        const orders = customer.orders;

        let totalSpent = 0;
        let ordersCount = 0;

        if (Array.isArray(orders)) {
          totalSpent = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          ordersCount = orders.length;
        }

        if (customer.documentId) {
          await strapi.documents('api::customer.customer').update({
            documentId: customer.documentId,
            data: {
              total_spent: totalSpent,
              orders_count: ordersCount
            }
          });
        }
      }
      console.log(`Bootstrap: Updated stats for ${customers.length} customers.`);
    } catch (e) {
      console.error('Bootstrap: Failed to recalculate customer stats', e);
    }

    // Import products from Excel (skip duplicates by name)
    try {
      console.log('Bootstrap: Checking products from export.xlsx...');
      const XLSX = require('xlsx');
      const path = require('path');
      const excelPath = path.join(strapi.dirs.app.root, 'export.xlsx');

      if (require('fs').existsSync(excelPath)) {
        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Load all existing products for duplicate check
        const allProducts = await strapi.documents('api::product.product').findMany({ limit: 10000 });
        const existingByName = new Map(allProducts.map((p) => [p.name, p.documentId]));

        let created = 0;
        let updated = 0;
        for (let i = 1; i < rows.length; i++) {
          const name = rows[i]?.[1];
          const price = rows[i]?.[7];
          if (!name || price === undefined || price === null) continue;

          const trimmedName = String(name).trim();
          const rawStock = rows[i]?.[34];
          const stock = rawStock !== undefined && rawStock !== null ? Math.floor(Number(rawStock)) : 0;

          const existingDocId = existingByName.get(trimmedName);
          if (existingDocId) {
            try {
              await strapi.documents('api::product.product').update({
                documentId: existingDocId,
                data: { stock },
                status: 'published',
              });
              updated++;
            } catch (err) {
              console.error(`Bootstrap: Failed to update stock for "${trimmedName}":`, err.message);
            }
            continue;
          }

          const slug = trimmedName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');

          try {
            await strapi.documents('api::product.product').create({
              data: { name: trimmedName, slug, price: parseFloat(price), stock },
              status: 'published',
            });
            existingByName.set(trimmedName, '');
            created++;
          } catch (err) {
            console.error(`Bootstrap: Failed to create product "${trimmedName}":`, err.message);
          }
        }
        console.log(`Bootstrap: Products import done. Created: ${created}, Updated stock: ${updated}`);
      } else {
        console.log('Bootstrap: export.xlsx not found, skipping product import.');
      }
    } catch (e) {
      console.error('Bootstrap: Failed to import products', e);
    }

    // Initial Check for Geo Data
    const fs = require('fs');
    const path = require('path');
    const publicDir = path.join(strapi.dirs.static.public);
    const filePath = path.join(publicDir, 'comuni.json');

    if (!fs.existsSync(filePath)) {
      console.log('Bootstrap: Geo Data missing. Downloading...');
      try {
        const url = 'https://cdn.jsdelivr.net/gh/matteocontrini/comuni-json@master/comuni.json';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          fs.writeFileSync(filePath, JSON.stringify(data));
          console.log('Bootstrap: Geo Data downloaded successfully.');
        }
      } catch (e) {
        console.error('Bootstrap: Failed to download Geo Data.', e);
      }
    }
  },
};
