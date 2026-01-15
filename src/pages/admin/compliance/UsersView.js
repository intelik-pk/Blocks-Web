import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Users, Search, Eye, Shield, Wallet, Lock } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { adminAPI } from '../../../services/api';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';

const UsersView = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kycFilter, setKycFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  const role = adminUser?.role;
  const isReadOnly = role === AdminRole.AUDIT_MANAGER;

  // Fetch all users
  const { data: usersData, isLoading } = useQuery(
    ['compliance-users-view'],
    () => adminAPI.getUsers({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: 1,
    }
  );

  const users = usersData?.data?.data?.users || 
               usersData?.data?.users || 
               usersData?.data || 
               (Array.isArray(usersData) ? usersData : []);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        (user.fullName || user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayCode || user.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const isActive = user.isActive !== undefined ? user.isActive : user.is_active;
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && isActive) ||
                           (statusFilter === 'inactive' && !isActive);
      
      const kycStatus = user.kycStatus || user.kyc_status || 'pending';
      const matchesKyc = kycFilter === 'all' || kycStatus === kycFilter;
      
      return matchesSearch && matchesStatus && matchesKyc;
    });
  }, [users, searchTerm, statusFilter, kycFilter]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Users className="w-6 h-6" />
            Users {isReadOnly && '(View Only)'}
          </h2>
          <p className="text-muted-foreground">
            User profiles and compliance status
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <InputTwo
                type="text"
                placeholder="Search by name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All KYC Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">KYC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Compliance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUsers.map((user) => {
                  const isActive = user.isActive !== undefined ? user.isActive : user.is_active;
                  const kycStatus = user.kycStatus || user.kyc_status || 'pending';
                  const complianceStatus = user.complianceStatus || 'clear';
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.fullName || user.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {user.displayCode || user.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {user.email || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          isActive 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          kycStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          kycStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        )}>
                          {kycStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          complianceStatus === 'clear' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          complianceStatus === 'under_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          complianceStatus === 'restricted' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          {complianceStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                User Details: {selectedUser.fullName || selectedUser.name}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUser.fullName || selectedUser.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUser.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Code</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUser.displayCode || selectedUser.id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge className={cn(
                    (selectedUser.isActive !== undefined ? selectedUser.isActive : selectedUser.is_active)
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    "mt-1"
                  )}>
                    {(selectedUser.isActive !== undefined ? selectedUser.isActive : selectedUser.is_active) ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">KYC Status</label>
                  <Badge className={cn(
                    (selectedUser.kycStatus || selectedUser.kyc_status) === 'approved' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : (selectedUser.kycStatus || selectedUser.kyc_status) === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                    "mt-1"
                  )}>
                    {selectedUser.kycStatus || selectedUser.kyc_status || 'pending'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Compliance Status</label>
                  <Badge className={cn(
                    (selectedUser.complianceStatus || 'clear') === 'clear' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : (selectedUser.complianceStatus || 'clear') === 'under_review'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : (selectedUser.complianceStatus || 'clear') === 'restricted'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    "mt-1"
                  )}>
                    {selectedUser.complianceStatus || 'clear'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Joined Date</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedUser.createdAt || selectedUser.created_at 
                      ? new Date(selectedUser.createdAt || selectedUser.created_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedUser.blockedReason && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900 dark:text-red-300">User Blocked</span>
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-400">Reason: {selectedUser.blockedReason}</p>
                  {selectedUser.blockedAt && (
                    <p className="text-sm text-red-800 dark:text-red-400">
                      Blocked At: {new Date(selectedUser.blockedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedUser.complianceNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Compliance Notes</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {selectedUser.complianceNotes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UsersView;
