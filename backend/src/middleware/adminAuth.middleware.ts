import { roleGuard } from './auth.middleware';
export { roleGuard } from './auth.middleware';

// Backward-compat named exports
export const adminAuthMiddleware = roleGuard('admin', 'superadmin');
