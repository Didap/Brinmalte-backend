/**
 * product controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::product.product', ({ strapi }) => ({
  async importExcel(ctx) {
    const XLSX = require('xlsx');
    const fs = require('fs');

    const file = ctx.request.files?.file;
    if (!file) return ctx.badRequest('Nessun file fornito');

    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const filePath = uploadedFile.filepath || (uploadedFile as any).path;

    let workbook;
    try {
      workbook = XLSX.readFile(filePath);
    } catch (e) {
      return ctx.badRequest('File Excel non valido');
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const allProducts = await strapi.documents('api::product.product').findMany({ limit: 10000 });
    const existingByName = new Map(allProducts.map((p) => [p.name, p.documentId]));

    let created = 0, updated = 0, errors = 0;

    for (let i = 1; i < rows.length; i++) {
      const name = (rows[i] as any[])?.[1];
      const price = (rows[i] as any[])?.[7];
      if (!name || price === undefined || price === null) continue;

      const trimmedName = String(name).trim();
      const rawStock = (rows[i] as any[])?.[34];
      const stock = rawStock !== undefined && rawStock !== null ? Math.floor(Number(rawStock)) : 0;

      const existingDocId = existingByName.get(trimmedName);
      if (existingDocId) {
        try {
          await strapi.documents('api::product.product').update({
            documentId: existingDocId,
            data: { stock, price: parseFloat(price) },
            status: 'published',
          });
          updated++;
        } catch { errors++; }
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
      } catch { errors++; }
    }

    try { fs.unlinkSync(filePath); } catch {}

    return ctx.send({ created, updated, errors });
  },
}));
