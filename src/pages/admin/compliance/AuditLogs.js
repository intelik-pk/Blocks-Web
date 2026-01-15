import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { ClipboardList, Search, Download, Filter, Eye } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { activitiesAPI } from '../../../services/api';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';

const AuditLogs = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'admin', 'org_admin', 'user', 'compliance'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch all activities
  const { data: activitiesData, isLoading } = useQuery(
    ['audit-logs', filterType, currentPage],
    () => activitiesAPI.getAll({
      userType: filterType === 'all' ? undefined : filterType,
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage
    }),
    {
      enabled: isAuthenticated,
      retry: 1,
    }
  );

  // Extract activities array - handle different response structures (same as AdminDashboard)
  let activities = [];
  if (activitiesData) {
    if (Array.isArray(activitiesData)) {
      activities = activitiesData;
    } else if (activitiesData.data?.data && Array.isArray(activitiesData.data.data)) {
      activities = activitiesData.data.data;
    } else if (activitiesData.data?.activities && Array.isArray(activitiesData.data.activities)) {
      activities = activitiesData.data.activities;
    } else if (activitiesData.data && Array.isArray(activitiesData.data)) {
      activities = activitiesData.data;
    }
  }
  
  const totalActivities = activitiesData?.data?.total || activities.length;

  // Filter activities: exclude anonymous logs and filter by search term
  const filteredActivities = activities.filter(activity => {
    // Filter out anonymous logs - only show logs with actual user information
    const userType = activity.userType?.toLowerCase();
    const userName = activity.userName;
    const userEmail = activity.userEmail;
    
    // Skip if userType is missing/null/undefined or equals 'anonymous'
    // Also skip if no userName and no userEmail (truly anonymous)
    if (!userType || userType === 'anonymous' || (!userName && !userEmail)) {
      return false;
    }
    
    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    const description = (activity.description || activity.action || '').toLowerCase();
    const entityType = (activity.entityType || '').toLowerCase();
    
    return description.includes(searchLower) || 
           userType.includes(searchLower) || 
           entityType.includes(searchLower);
  });

  const totalPages = Math.ceil(totalActivities / itemsPerPage);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            Audit Logs
          </h2>
          <p className="text-muted-foreground">
            Complete audit trail of all system activities
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
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="admin">Admin</option>
              <option value="org_admin">Org Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Activities Table */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredActivities.map((activity) => {
                    const date = activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'N/A';
                    const isComplianceRelated = activity.complianceRelated || false;
                    
                    // Derive entity info from endpoint
                    const getEntityInfo = (endpoint) => {
                      if (!endpoint) return 'N/A';
                      
                      // Extract entity type and ID from endpoint patterns
                      const patterns = [
                        { regex: /\/properties\/([^/?]+)/, type: 'Property', prefix: 'PROP-' },
                        { regex: /\/users\/([^/?]+)/, type: 'User', prefix: 'USER-' },
                        { regex: /\/wallets\/([^/?]+)/, type: 'Wallet', prefix: 'WALLET-' },
                        { regex: /\/investments\/([^/?]+)/, type: 'Investment', prefix: 'INV-' },
                        { regex: /\/organizations\/([^/?]+)/, type: 'Organization', prefix: 'ORG-' },
                        { regex: /\/kyc\/([^/?]+)/, type: 'KYC', prefix: 'KYC-' },
                        { regex: /\/transactions\/([^/?]+)/, type: 'Transaction', prefix: 'TXN-' },
                        { regex: /\/admin\/users\/([^/?]+)/, type: 'User', prefix: 'USER-' },
                        { regex: /\/admin\/wallets\/([^/?]+)/, type: 'Wallet', prefix: 'WALLET-' },
                        { regex: /\/wallet\/user\/([^/?]+)/, type: 'Wallet', prefix: 'USER-' },
                      ];
                      
                      for (const pattern of patterns) {
                        const match = endpoint.match(pattern.regex);
                        if (match) {
                          const id = match[1];
                          return `${pattern.type}: ${id.length > 12 ? id.slice(0, 12) + '...' : id}`;
                        }
                      }
                      
                      // Fallback: show endpoint path (simplified)
                      const pathParts = endpoint.split('?')[0].split('/').filter(p => p && p !== 'api' && p !== 'admin');
                      if (pathParts.length > 0) {
                        return pathParts.length > 2 
                          ? `${pathParts[0]} → ${pathParts[1]}`
                          : pathParts.join(' → ');
                      }
                      return endpoint.length > 40 ? endpoint.slice(0, 40) + '...' : endpoint;
                    };
                    
                    // Get action display
                    const getActionDisplay = () => {
                      if (activity.action) return activity.action;
                      if (activity.method && activity.endpoint) {
                        const endpointPart = activity.endpoint.split('?')[0].split('/').filter(p => p).pop() || '';
                        return `${activity.method} ${endpointPart || activity.endpoint.split('/').slice(-2).join('/')}`;
                      }
                      return 'N/A';
                    };
                    
                    // Get description display
                    const getDescriptionDisplay = () => {
                      if (activity.description) return activity.description;
                      if (activity.amount) return `Amount: ${activity.amount}`;
                      if (activity.endpoint) {
                        const pathParts = activity.endpoint.split('?')[0].split('/').filter(p => p && p !== 'api' && p !== 'admin');
                        if (pathParts.length > 0) {
                          return pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' → ');
                        }
                      }
                      return 'N/A';
                    };
                    
                    // Get user display
                    const getUserDisplay = () => {
                      if (activity.userName) {
                        return activity.userEmail 
                          ? `${activity.userName} (${activity.userEmail})`
                          : activity.userName;
                      }
                      // Since we filter out anonymous, this should always have a userType
                      return activity.userType || 'N/A';
                    };
                    
                    return (
                      <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                          {date}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <Badge className={cn(
                              activity.userType === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                              activity.userType === 'org_admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              activity.userType === 'user' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            )}>
                              {activity.userType || 'N/A'}
                            </Badge>
                            {activity.userName && (
                              <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[150px]">
                                {getUserDisplay()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">
                          {getActionDisplay()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-md">
                          <div className="truncate" title={getDescriptionDisplay()}>
                            {getDescriptionDisplay()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                          {getEntityInfo(activity.endpoint)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isComplianceRelated ? (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              {activity.complianceAction || 'Compliance'}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalActivities)} of {totalActivities} activities
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
