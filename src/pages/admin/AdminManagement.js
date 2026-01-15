import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  UserPlus, 
  Shield, 
  Eye, 
  UserCheck, 
  UserX, 
  Mail, 
  Lock,
  CheckCircle,
  X,
  AlertCircle,
  Copy,
  Search,
  Filter,
  Trash2,
  KeyRound
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import InputTwo from '../../components/ui/InputTwo';
import { blocksAdminAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { hasPermission, getRoleDisplayName, getRoleBadgeColor, AdminRole } from '../../utils/rbac';
import Loader from '../../components/Loder';
import { cn } from '../../utils/cn';

const AdminManagement = () => {
  const { adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [resetPasswordErrors, setResetPasswordErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: AdminRole.ADMIN,
  });
  const [formErrors, setFormErrors] = useState({});

  // Check if user can manage admins (only super_admin)
  // Direct check for super_admin role + permission check
  const isSuperAdmin = adminUser?.role === AdminRole.SUPER_ADMIN || adminUser?.role === 'super_admin';
  const canManageAdmins = isSuperAdmin || hasPermission(adminUser?.role, 'admins', 'create');
  
  // Debug logging
  console.log('🔍 AdminManagement - Permission check:', {
    adminRole: adminUser?.role,
    AdminRole_SUPER_ADMIN: AdminRole.SUPER_ADMIN,
    isSuperAdmin,
    canManageAdmins,
    hasPermissionResult: hasPermission(adminUser?.role, 'admins', 'create'),
    adminUser: adminUser
  });

  // Fetch all admins
  const { data: adminsData, isLoading, error } = useQuery(
    ['admin-management', adminUser?.id],
    () => blocksAdminAPI.getAllAdmins(adminUser?.id),
    {
      enabled: !!adminUser?.id && canManageAdmins,
      retry: 1,
      onError: (err) => {
        console.error('Failed to fetch admins:', err);
      }
    }
  );

  const admins = adminsData?.data?.data || adminsData?.data || [];

  // Create admin mutation
  const createAdminMutation = useMutation(
    (data) => blocksAdminAPI.signup(data, adminUser?.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-management']);
        setShowCreateModal(false);
        setFormData({ email: '', password: '', fullName: '', role: AdminRole.ADMIN });
        setFormErrors({});
        alert('Admin account created successfully!');
      },
      onError: (error) => {
        const message = error.response?.data?.message || error.message || 'Failed to create admin';
        setFormErrors({ submit: message });
        console.error('Failed to create admin:', error);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors = {};
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (!formData.fullName) errors.fullName = 'Full name is required';
    if (!formData.role) errors.role = 'Role is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    createAdminMutation.mutate(formData);
  };

  const handleCopyCredentials = (email, password) => {
    const text = `Email: ${email}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  // Delete admin mutation
  const deleteAdminMutation = useMutation(
    (id) => blocksAdminAPI.deleteAdmin(id, adminUser?.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-management']);
        setShowDeleteModal(false);
        setSelectedAdmin(null);
        alert('Admin account deleted successfully!');
      },
      onError: (error) => {
        const message = error.response?.data?.message || error.message || 'Failed to delete admin';
        alert(message);
        console.error('Failed to delete admin:', error);
      }
    }
  );

  // Reset password mutation
  const resetPasswordMutation = useMutation(
    ({ id, newPassword }) => blocksAdminAPI.resetPassword(id, newPassword, adminUser?.id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-management']);
        setShowResetPasswordModal(false);
        setSelectedAdmin(null);
        setResetPasswordData({ newPassword: '', confirmPassword: '' });
        setResetPasswordErrors({});
        alert('Password reset successfully!');
      },
      onError: (error) => {
        const message = error.response?.data?.message || error.message || 'Failed to reset password';
        setResetPasswordErrors({ submit: message });
        console.error('Failed to reset password:', error);
      }
    }
  );

  const handleDeleteClick = (admin) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const handleResetPasswordClick = (admin) => {
    setSelectedAdmin(admin);
    setShowResetPasswordModal(true);
    setResetPasswordData({ newPassword: '', confirmPassword: '' });
    setResetPasswordErrors({});
  };

  const handleDeleteConfirm = () => {
    if (selectedAdmin) {
      deleteAdminMutation.mutate(selectedAdmin.id);
    }
  };

  const handleResetPasswordSubmit = (e) => {
    e.preventDefault();
    setResetPasswordErrors({});

    // Validation
    const errors = {};
    if (!resetPasswordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (resetPasswordData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }
    if (!resetPasswordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm the password';
    } else if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setResetPasswordErrors(errors);
      return;
    }

    if (selectedAdmin) {
      resetPasswordMutation.mutate({
        id: selectedAdmin.id,
        newPassword: resetPasswordData.newPassword,
      });
    }
  };

  // Filter admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = 
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.fullName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Role options
  const roleOptions = [
    { value: AdminRole.SUPER_ADMIN, label: 'Super Admin', description: 'Full system access' },
    { value: AdminRole.MLRO, label: 'MLRO (AML Officer)', description: 'Money Laundering Reporting Officer' },
    { value: AdminRole.AUDIT_MANAGER, label: 'Audit Manager', description: 'Head of Internal Audit (read-only)' },
    { value: AdminRole.COMPLIANCE_OFFICER, label: 'Compliance Officer', description: 'Day-to-day compliance operations' },
    { value: AdminRole.ADMIN, label: 'Admin', description: 'Regular admin operations' },
  ];

  if (!canManageAdmins) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Only Super Admins can manage admin accounts.
          </p>
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left text-sm">
            <p className="font-semibold mb-2">Debug Information:</p>
            <p>Current Role: <strong>{adminUser?.role || 'Not set'}</strong></p>
            <p>Expected Role: <strong>super_admin</strong></p>
            <p>Admin ID: <strong>{adminUser?.id || 'Not set'}</strong></p>
            <p>Admin Email: <strong>{adminUser?.email || 'Not set'}</strong></p>
            <p className="mt-2 text-xs text-gray-500">
              If you are a super admin, please update your role in the database:
              <br />
              <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                UPDATE blocks_admins SET role = 'super_admin' WHERE email = 'your-email@example.com';
              </code>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Admins</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error.response?.data?.message || error.message || 'Failed to load admin accounts'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compliance Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create credentials for MLRO, Audit Manager, and Compliance Officer roles. These users will access a separate compliance dashboard.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create Admin Account
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <InputTwo
                type="text"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Admins List */}
      <Card className="p-6">
        <div className="space-y-4">
          {filteredAdmins.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">No admins found</p>
            </div>
          ) : (
            filteredAdmins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {admin.fullName?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {admin.fullName || 'Unknown'}
                      </h3>
                      <Badge className={cn(getRoleBadgeColor(admin.role))}>
                        {getRoleDisplayName(admin.role)}
                      </Badge>
                      {admin.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {admin.email}
                      </span>
                      <span className="text-xs">
                        Created: {new Date(admin.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPasswordClick(admin)}
                    className="flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    Reset Password
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(admin)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    disabled={admin.id === adminUser?.id}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Admin Account
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ email: '', password: '', fullName: '', role: AdminRole.ADMIN });
                  setFormErrors({});
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <InputTwo
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className={formErrors.fullName ? 'border-red-500' : ''}
                />
                {formErrors.fullName && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <InputTwo
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  className={formErrors.email ? 'border-red-500' : ''}
                />
                {formErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password * (min 8 characters)
                </label>
                <InputTwo
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={formErrors.password ? 'border-red-500' : ''}
                />
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {roleOptions.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
                {formErrors.role && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.role}</p>
                )}
              </div>

              {formErrors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{formErrors.submit}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ email: '', password: '', fullName: '', role: AdminRole.ADMIN });
                    setFormErrors({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAdminMutation.isLoading}
                  className="flex-1"
                >
                  {createAdminMutation.isLoading ? 'Creating...' : 'Create Admin'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Reset Password
              </h2>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedAdmin(null);
                  setResetPasswordData({ newPassword: '', confirmPassword: '' });
                  setResetPasswordErrors({});
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Resetting password for: <strong>{selectedAdmin.fullName}</strong> ({selectedAdmin.email})
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password * (min 8 characters)
                </label>
                <InputTwo
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                  placeholder="••••••••"
                  className={resetPasswordErrors.newPassword ? 'border-red-500' : ''}
                />
                {resetPasswordErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{resetPasswordErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password *
                </label>
                <InputTwo
                  type="password"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className={resetPasswordErrors.confirmPassword ? 'border-red-500' : ''}
                />
                {resetPasswordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{resetPasswordErrors.confirmPassword}</p>
                )}
              </div>

              {resetPasswordErrors.submit && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{resetPasswordErrors.submit}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setSelectedAdmin(null);
                    setResetPasswordData({ newPassword: '', confirmPassword: '' });
                    setResetPasswordErrors({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isLoading}
                  className="flex-1"
                >
                  {resetPasswordMutation.isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Admin Modal */}
      {showDeleteModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Delete Admin Account
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAdmin(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <p className="text-center text-gray-700 dark:text-gray-300 mb-2">
                Are you sure you want to delete this admin account?
              </p>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="font-semibold text-gray-900 dark:text-white">{selectedAdmin.fullName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedAdmin.email}</p>
                <Badge className={cn(getRoleBadgeColor(selectedAdmin.role), "mt-2")}>
                  {getRoleDisplayName(selectedAdmin.role)}
                </Badge>
              </div>
              <p className="text-center text-sm text-red-600 dark:text-red-400 mt-4">
                This action cannot be undone!
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAdmin(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteAdminMutation.isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteAdminMutation.isLoading ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
