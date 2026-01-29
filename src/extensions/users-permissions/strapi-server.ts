/**
 * Users-permissions plugin extension
 * This file is kept minimal since we use a custom registration endpoint.
 * The original register is left untouched.
 */

export default (plugin: any) => {
    // No overrides needed - custom registration is handled by /api/auth/custom-register
    return plugin;
};
