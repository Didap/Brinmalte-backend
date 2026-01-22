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

    return config;
};
