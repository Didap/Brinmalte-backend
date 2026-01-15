export default (plugin: any) => {
    plugin.controllers.auth.register = async (ctx: any) => {
        const { email, username, password, name, surname, phone } = ctx.request.body;

        // Basic validation
        if (!email || !password) {
            return ctx.badRequest('Email and password are required');
        }

        const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });
        const settings: any = await pluginStore.get({ key: 'advanced' });

        if (!settings.allow_register) {
            return ctx.badRequest('Register action is currently disabled');
        }

        const params = {
            username: username || email,
            email,
            password,
            name,
            surname,
            phone,
            provider: 'local',
        };

        // Check for unique email (basic check, service.add also checks)
        // We rely on service.add to throw if conflict

        try {
            const role = await strapi
                .plugin('users-permissions')
                .service('role')
                .findOne({ type: settings.default_role });

            if (!role) {
                return ctx.badRequest('Impossible to find the default role');
            }

            const newUser = await strapi.plugin('users-permissions').service('user').add({
                ...params,
                role: role.id,
                confirmed: settings.email_confirmation ? false : true,
            });

            // Issue JWT
            const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: newUser.id });

            // Manual sanitization to ensure no private fields leak
            const sanitizedUser = { ...newUser };
            delete sanitizedUser.password;
            delete sanitizedUser.resetPasswordToken;
            delete sanitizedUser.confirmationToken;

            return ctx.send({
                jwt,
                user: sanitizedUser,
            });
        } catch (err: any) {
            if (err.message && err.message.includes('already taken')) {
                return ctx.badRequest(err.message);
            }
            throw err;
        }
    };

    return plugin;
};

