const path = require('path');

export default ({ env }) => {
    // Check if Cloudinary secret is present
    const hasCloudinary = env('CLOUDINARY_NAME') && env('CLOUDINARY_KEY') && env('CLOUDINARY_SECRET');

    const config: any = {};

    /* Cloudinary Enabled */
    if (hasCloudinary) {
        config.upload = {
            config: {
                provider: 'cloudinary',
                providerOptions: {
                    cloud_name: env('CLOUDINARY_NAME'),
                    api_key: env('CLOUDINARY_KEY'),
                    api_secret: env('CLOUDINARY_SECRET'),
                },
                actionOptions: {
                    upload: {},
                    uploadStream: {},
                    delete: {},
                },
            },
        };
    }

    /* Email with Resend */
    if (env('RESEND_API_KEY')) {
        config.email = {
            config: {
                // Point to the compiled provider in dist folder using absolute path
                provider: path.join(process.cwd(), 'dist', 'src', 'providers', 'email-resend'),
                providerOptions: {
                    apiKey: env('RESEND_API_KEY'),
                },
                settings: {
                    defaultFrom: 'BrinMalte <noreply@brinmalte.it>',
                    defaultReplyTo: 'noreply@brinmalte.it',
                },
            },
        };
    }

    return config;
};
