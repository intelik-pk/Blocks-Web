/**
 * RBAC (Role-Based Access Control) Helper Functions
 * Maps admin roles to their permissions for PVARA compliance
 */

export const AdminRole = {
  SUPER_ADMIN: 'super_admin',
  MLRO: 'mlro',
  AUDIT_MANAGER: 'audit_manager',
  COMPLIANCE_OFFICER: 'compliance',
  ADMIN: 'admin',
};

export const ROLE_PERMISSIONS = {
  [AdminRole.SUPER_ADMIN]: {
    users: { view: true, edit: true, block: true, delete: true },
    wallets: { view: true, freeze: true },
    transactions: { view: true, edit: true },
    kyc: { view: true, review: true, approve: true },
    compliance: { viewIsars: true, createIsar: true, approveIsar: true, viewAlerts: true },
    properties: { view: true, create: true, edit: true, delete: true },
    admins: { view: true, create: true, edit: true, delete: true },
    audit: { view: true, export: true },
    deposits: { view: true, approve: true },
    withdrawals: { view: true, approve: true },
  },
  [AdminRole.MLRO]: {
    users: { view: true, edit: false, block: true, delete: false },
    wallets: { view: true, freeze: true },
    transactions: { view: true, edit: false },
    kyc: { view: true, review: false, approve: false },
    compliance: { viewIsars: true, createIsar: true, approveIsar: true, viewAlerts: true },
    properties: { view: true, create: false, edit: false, delete: false },
    admins: { view: false, create: false, edit: false, delete: false },
    audit: { view: true, export: true },
    deposits: { view: true, approve: false },
    withdrawals: { view: true, approve: false },
  },
  [AdminRole.AUDIT_MANAGER]: {
    users: { view: true, edit: false, block: false, delete: false },
    wallets: { view: true, freeze: false },
    transactions: { view: true, edit: false },
    kyc: { view: true, review: false, approve: false },
    compliance: { viewIsars: true, createIsar: false, approveIsar: false, viewAlerts: true },
    properties: { view: true, create: false, edit: false, delete: false },
    admins: { view: false, create: false, edit: false, delete: false },
    audit: { view: true, export: true },
    deposits: { view: true, approve: false },
    withdrawals: { view: true, approve: false },
  },
  [AdminRole.COMPLIANCE_OFFICER]: {
    users: { view: true, edit: false, block: true, delete: false },
    wallets: { view: true, freeze: true },
    transactions: { view: true, edit: false },
    kyc: { view: true, review: true, approve: true },
    compliance: { viewIsars: true, createIsar: true, approveIsar: false, viewAlerts: true },
    properties: { view: true, create: false, edit: false, delete: false },
    admins: { view: false, create: false, edit: false, delete: false },
    audit: { view: true, export: false },
    deposits: { view: true, approve: false },
    withdrawals: { view: true, approve: false },
  },
  [AdminRole.ADMIN]: {
    users: { view: true, edit: true, block: false, delete: false },
    wallets: { view: true, freeze: false },
    transactions: { view: true, edit: false },
    kyc: { view: true, review: true, approve: true },
    compliance: { viewIsars: false, createIsar: false, approveIsar: false, viewAlerts: false },
    properties: { view: true, create: true, edit: true, delete: true },
    admins: { view: false, create: false, edit: false, delete: false },
    audit: { view: false, export: false },
    deposits: { view: true, approve: true },
    withdrawals: { view: true, approve: true },
  },
};

/**
 * Check if a role has a specific permission
 * @param {string} role - Admin role (e.g., 'super_admin', 'mlro')
 * @param {string} resource - Resource name (e.g., 'users', 'wallets')
 * @param {string} action - Action name (e.g., 'view', 'edit', 'block')
 * @returns {boolean} - True if permission is granted
 */
export function hasPermission(role, resource, action) {
  if (!role || !resource || !action) {
    if (process.env.NODE_ENV === 'development') {
      console.log('hasPermission check failed:', { role, resource, action });
    }
    return false;
  }
  
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    if (process.env.NODE_ENV === 'development') {
      console.log('No permissions found for role:', role);
    }
    return false;
  }
  
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    if (process.env.NODE_ENV === 'development') {
      console.log('No resource permissions found:', { role, resource });
    }
    return false;
  }
  
  const hasAccess = resourcePermissions[action] === true;
  if (process.env.NODE_ENV === 'development') {
    console.log('Permission check result:', { role, resource, action, hasAccess });
  }
  return hasAccess;
}

/**
 * Check if user can access a specific route
 * @param {string} role - Admin role
 * @param {string} route - Route path
 * @returns {boolean} - True if access is granted
 */
export function canAccessRoute(role, route) {
  const routePermissions = {
    '/admin/compliance': (role) => hasPermission(role, 'compliance', 'viewIsars'),
    '/admin/compliance/isars': (role) => hasPermission(role, 'compliance', 'viewIsars'),
    '/admin/compliance/alerts': (role) => hasPermission(role, 'compliance', 'viewAlerts'),
    '/admin/users': (role) => hasPermission(role, 'users', 'view'),
    '/admin/properties': (role) => hasPermission(role, 'properties', 'view'),
    '/admin/transactions': (role) => hasPermission(role, 'transactions', 'view'),
    '/admin/kyc': (role) => hasPermission(role, 'kyc', 'view'),
  };

  const checkPermission = routePermissions[route];
  return checkPermission ? checkPermission(role) : true; // Default to true for unlisted routes
}

/**
 * Get role display name
 * @param {string} role - Admin role
 * @returns {string} - Human-readable role name
 */
export function getRoleDisplayName(role) {
  const displayNames = {
    [AdminRole.SUPER_ADMIN]: 'Super Admin',
    [AdminRole.MLRO]: 'MLRO (AML Officer)',
    [AdminRole.AUDIT_MANAGER]: 'Audit Manager',
    [AdminRole.COMPLIANCE_OFFICER]: 'Compliance Officer',
    [AdminRole.ADMIN]: 'Admin',
  };
  return displayNames[role] || role;
}

/**
 * Get role badge color
 * @param {string} role - Admin role
 * @returns {string} - Tailwind color class
 */
export function getRoleBadgeColor(role) {
  const colors = {
    [AdminRole.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    [AdminRole.MLRO]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    [AdminRole.AUDIT_MANAGER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    [AdminRole.COMPLIANCE_OFFICER]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    [AdminRole.ADMIN]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return colors[role] || colors[AdminRole.ADMIN];
}
