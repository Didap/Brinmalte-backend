
import { createStrapi } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

const CATEGORIES = [
    { name: 'Colorificio', slug: 'colorificio', image: 'cat_colorificio_v2.png', description: 'Pitture, vernici e prodotti per la decorazione professionale.' },
    { name: 'Impermeabilizzanti', slug: 'impermeabilizzanti', image: 'cat_impermeabilizzanti_v2.png', description: 'Sistemi di impermeabilizzazione Sika e guaine tecniche.' },
    { name: 'Cartongesso e Ristrutturazione', slug: 'cartongesso', image: 'cat_cartongesso_v2.png', description: 'Lastre, stucchi e strutture per sistemi a secco.' },
    { name: 'Pavimenti in Resina', slug: 'pavimenti-in-resina', image: 'cat_resina_v2.png', description: 'Resine epossidiche e cementizie per pavimenti industriali e civili.' },
    { name: 'Piscine', slug: 'piscine', image: 'cat_piscine_v2.png', description: 'Soluzioni per la costruzione e manutenzione di piscine.' },
    { name: 'Edilizia Pesante', slug: 'edilizia', image: 'cat_edilizia_v2.png', description: 'Materiali edili di base, malte tecniche e cementi.' },
];

// Path where the images are stored (ARTIFACTS DIR)
const IMAGES_DIR = 'c:/Users/aless/.gemini/antigravity/brain/42db81cb-5fd2-478b-a4cb-77aa79320661';

async function main() {
    console.log('Starting Strapi instance...');
    const strapi = createStrapi({ distDir: './dist' });
    await strapi.load();
    console.log('Strapi loaded successfully.');

    try {
        for (const cat of CATEGORIES) {
            console.log(`Processing category: ${cat.name}...`);

            // Check if exists
            const existing = await strapi.documents('api::category.category').findMany({
                filters: { slug: cat.slug }
            });

            if (existing.length > 0) {
                console.log(`- Category ${cat.name} already exists. Skipping.`);
                continue;
            }

            // Upload Image
            let imageId = null;
            const files = fs.readdirSync(IMAGES_DIR);
            const imageFile = files.find(f => f.startsWith(cat.image.replace('.png', '')) && f.endsWith('.png'));

            if (imageFile) {
                const filePath = path.join(IMAGES_DIR, imageFile);
                console.log(`- Found image: ${filePath}`);

                const stats = fs.statSync(filePath);

                // Manual Upload Flow
                const buffer = fs.readFileSync(filePath);
                const ext = path.extname(imageFile);
                const basename = path.basename(imageFile, ext);

                const file: any = {
                    name: imageFile,
                    alternativeText: cat.name,
                    caption: cat.name,
                    width: 1024,
                    height: 1024,
                    formats: null,
                    hash: `${basename}_${Date.now()}`,
                    ext: ext,
                    mime: 'image/png',
                    size: stats.size / 1000,
                    url: null,
                    provider: 'cloudinary',
                    provider_metadata: null,
                    folderPath: '/',
                    buffer: buffer,
                    stream: fs.createReadStream(filePath)
                };

                // 1. Upload to Cloudinary via Provider
                await strapi.plugin('upload').provider.upload(file);

                if (!file.url) {
                    throw new Error('Upload failed: no URL returned');
                }

                console.log(`- Uploaded to: ${file.url}`);

                // 2. Create DB Entry
                delete file.buffer;
                delete file.stream;

                const uploadedDoc = await strapi.documents('plugin::upload.file').create({
                    data: {
                        ...file,
                        publishedAt: new Date(),
                    }
                });

                if (uploadedDoc) {
                    imageId = (uploadedDoc as any).id; // Use integer ID for media relation
                    console.log(`- Image created in DB. ID: ${imageId}`);
                }
            } else {
                console.warn(`- WARNING: Image not found for ${cat.name} (looked for ${cat.image})`);
            }

            // Create Category
            await strapi.documents('api::category.category').create({
                data: {
                    name: cat.name,
                    slug: cat.slug,
                    description: cat.description,
                    heroImage: imageId, // Link the uploaded image
                    publishedAt: new Date(), // Publish immediately
                }
            });

            console.log(`- Created category: ${cat.name}`);
        }

        console.log('Seeding completed!');

    } catch (error: any) {
        console.error('An error occurred:', error);
        if (error.details) {
            console.error('Error Details:', JSON.stringify(error.details, null, 2));
        }
    } finally {
        process.exit(0);
    }
}

main();
