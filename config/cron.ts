export default {
    // Run at 00:00 on day-of-month 1
    '0 0 1 * *': async ({ strapi }) => {
        console.log('Cron: Staring Geo Data update...');
        try {
            const fs = require('fs');
            const path = require('path');

            const url = 'https://cdn.jsdelivr.net/gh/matteocontrini/comuni-json@master/comuni.json';
            const response = await fetch(url);

            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
            const data = await response.json();

            const publicDir = path.join(strapi.dirs.static.public);
            const filePath = path.join(publicDir, 'comuni.json');

            fs.writeFileSync(filePath, JSON.stringify(data));
            console.log(`Cron: Geo Data updated successfully at ${filePath}`);
        } catch (err) {
            console.error('Cron: Failed to update Geo Data:', err);
        }
    },
};
