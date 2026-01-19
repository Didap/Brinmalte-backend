import type { Core } from '@strapi/strapi';

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
