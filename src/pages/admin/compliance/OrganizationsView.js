import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Folder, Search, Eye } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { adminAPI } from '../../../services/api';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';

const OrganizationsView = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrganization, setSelectedOrganization] = useState(null);

  const role = adminUser?.role;
  const isReadOnly = role === AdminRole.AUDIT_MANAGER;

  // Fetch all organizations
  const { data: organizationsData, isLoading } = useQuery(
    ['compliance-organizations-view'],
    () => adminAPI.getOrganizations({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: 1,
    }
  );

  const organizations = organizationsData?.data?.data?.organizations || 
                       organizationsData?.data?.organizations || 
                       organizationsData?.data || 
                       (Array.isArray(organizationsData) ? organizationsData : []);

  // Filter organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter(org => {
      const matchesSearch = 
        (org.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.displayCode || org.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (org.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Organizations don't have a status field - default to active if they exist
      // Check if organization has an active admin, otherwise default to active
      const orgStatus = org.status || (org.isActive !== undefined ? (org.isActive ? 'active' : 'inactive') : 'active');
      const matchesStatus = statusFilter === 'all' || orgStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [organizations, searchTerm, statusFilter]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view organizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Folder className="w-6 h-6" />
            Organizations {isReadOnly && '(View Only)'}
          </h2>
          <p className="text-muted-foreground">
            All platform organizations
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
                placeholder="Search by name, code, or email..."
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
        </div>
      </Card>

      {/* Organizations List */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredOrganizations.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No organizations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredOrganizations.map((org) => {
                  // Organizations don't have a status field - default to active if they exist
                  // Check if organization has an active admin, otherwise default to active
                  const orgStatus = org.status || (org.isActive !== undefined ? (org.isActive ? 'active' : 'inactive') : 'active');
                  
                  return (
                    <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {org.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {org.displayCode || org.id}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {org.email || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {org.phone || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn(
                          orgStatus === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          {orgStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrganization(org)}
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

      {/* Organization Detail Modal */}
      {selectedOrganization && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organization Details: {selectedOrganization.name}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrganization(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization Name</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedOrganization.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Code</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedOrganization.displayCode || selectedOrganization.id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedOrganization.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedOrganization.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge className={cn(
                    (selectedOrganization.status || (selectedOrganization.isActive !== undefined ? (selectedOrganization.isActive ? 'active' : 'inactive') : 'active')) === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    "mt-1"
                  )}>
                    {selectedOrganization.status || (selectedOrganization.isActive !== undefined ? (selectedOrganization.isActive ? 'active' : 'inactive') : 'active')}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created At</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedOrganization.createdAt || selectedOrganization.created_at
                      ? new Date(selectedOrganization.createdAt || selectedOrganization.created_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrganizationsView;
