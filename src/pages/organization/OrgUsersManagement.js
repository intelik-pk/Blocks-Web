import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Users as UsersIcon,
  DollarSign,
  TrendingUp,
  BarChart3,
  X,
  Shield,
  Building2,
  Eye
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { organizationsAPI, adminAPI, investmentsAPI } from '../../services/api';
import { useOrganizationAuth } from '../../components/organization/OrganizationAuth';
import { cn } from '../../utils/cn';
import Loader from '../../components/Loder';

const OrgUsersManagement = ({ organizationId }) => {
  const { isAuthenticated, organizationName } = useOrganizationAuth();
  
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserInvestments, setSelectedUserInvestments] = useState(null);
  const [sidebarView, setSidebarView] = useState(null); // 'user-details' or 'investments'

  // Fetch investors via Investment Analytics API
  const { data: investmentAnalytics, isLoading, error } = useQuery(
    ['org-investors', organizationId],
    async () => {
      console.log(`👥 Fetching investors who invested in ${organizationId} properties via Investment Analytics API`);
      // Use Investment Analytics API to get all investments with user data
      const response = await organizationsAPI.getInvestmentAnalytics(organizationId);
      console.log('✅ Investment Analytics Response:', response);
      return response;
    },
    {
      enabled: isAuthenticated && !!organizationId
    }
  );

  // Also fetch all investments using the same API as InvestmentsManagement page
  // This ensures we have the same data structure and token fields
  const { data: allInvestmentsData } = useQuery(
    ['all-investments-for-org-users', organizationId],
    async () => {
      console.log('📊 Fetching all investments (same as InvestmentsManagement)');
      const response = await adminAPI.getInvestments({
        limit: 1000
      });
      console.log('✅ All Investments Response:', response);
      return response;
    },
    {
      enabled: isAuthenticated && !!organizationId,
      retry: 1
    }
  );

  // Extract investments from both sources, prefer the detailed investments API
  const investmentsFromAnalytics = investmentAnalytics?.data?.investments || [];
  const analytics = investmentAnalytics?.data?.analytics || {};
  
  // Extract investments from the detailed API (same as InvestmentsManagement)
  const investmentsFromAPI = allInvestmentsData?.data?.data?.investments || 
                             allInvestmentsData?.data?.investments || 
                             allInvestmentsData?.data || 
                             (Array.isArray(allInvestmentsData) ? allInvestmentsData : []);
  
  // Filter investments to only this organization's properties
  const organizationInvestments = investmentsFromAPI.filter(inv => {
    const propertyOrgId = inv.property?.organizationId || 
                         inv.property?.organization_id ||
                         inv.property?.orgId;
    return propertyOrgId === organizationId || 
           String(propertyOrgId) === String(organizationId);
  });
  
  // Use detailed investments if available, otherwise fall back to analytics
  const investments = organizationInvestments.length > 0 ? organizationInvestments : investmentsFromAnalytics;
  
  const allInvestors = useMemo(() => {
    const investorMap = new Map();
    
    console.log(`📊 Processing ${investments.length} investments to extract unique investors...`);
    
    investments.forEach(investment => {
      const user = investment.user;
      if (!user) return;
      
      const userId = user.id || user.userId;
      if (!investorMap.has(userId)) {
        investorMap.set(userId, {
          ...user,
          displayCode: user.displayCode || `USR-${userId.slice(0, 6)}`,
          fullName: user.fullName || user.name || 'Unknown User',
          email: user.email || 'N/A',
          phone: user.phone || 'N/A',
          role: user.role || 'user',
          isActive: user.isActive !== undefined ? user.isActive : true,
          createdAt: user.createdAt || investment.createdAt,
          // Investment statistics
          totalInvested: 0,
          investmentCount: 0,
          activeInvestments: 0,
          properties: [],
          investmentList: [] // Store full investment objects
        });
      }
      
      const investor = investorMap.get(userId);
      investor.totalInvested += parseFloat(investment.amountUSDT || investment.amount || 0);
      investor.investmentCount += 1;
      if (investment.status === 'active' || investment.status === 'confirmed') {
        investor.activeInvestments += 1;
      }
      if (investment.property?.title) {
        investor.properties.push(investment.property.title);
      }
      // Store full investment object
      investor.investmentList.push(investment);
    });
    
    const investors = Array.from(investorMap.values());
    console.log(`✅ Found ${investors.length} unique investors:`, investors);
    return investors;
  }, [investments]);

  // Fetch full user data when selected
  const { data: fullUserData, isLoading: fullUserLoading } = useQuery(
    ['org-user-details', selectedUserId],
    () => adminAPI.getUserById(selectedUserId),
    {
      enabled: !!selectedUserId && sidebarView === 'user-details',
      retry: 1
    }
  );

  // Frontend filtering
  const users = useMemo(() => {
    let filtered = [...allInvestors];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        (user.fullName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower) ||
        (user.phone || '').toLowerCase().includes(searchLower) ||
        (user.displayCode || '').toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.status) {
      filtered = filtered.filter(user => {
        const isActive = user.isActive !== undefined ? user.isActive : true;
        return filters.status === 'active' ? isActive : !isActive;
      });
    }
    
    return filtered;
  }, [allInvestors, filters]);

  const pagination = {
    totalPages: Math.ceil(users.length / 10),
    currentPage: currentPage,
    totalUsers: users.length
  };
  
  // Paginate users
  const paginatedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * 10;
    const endIdx = startIdx + 10;
    return users.slice(startIdx, endIdx);
  }, [users, currentPage]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatPrice = (amount) => {
    return `$${parseFloat(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge variant="green" className="flex items-center">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="gray" className="flex items-center">
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const handleUserClick = (user) => {
    setSelectedUserId(user.id);
    setSidebarView('user-details');
  };

  const handleInvestmentsClick = (user) => {
    setSelectedUserId(user.id);
    setSelectedUserInvestments(user.investmentList || []);
    setSidebarView('investments');
  };

  const closeSidebar = () => {
    setSidebarView(null);
    setSelectedUserId(null);
    setSelectedUserInvestments(null);
  };

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return allInvestors.find(u => u.id === selectedUserId);
  }, [selectedUserId, allInvestors]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load users</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Investors Management</h2>
          <p className="text-muted-foreground">
            Users who invested in {organizationName} properties
            <span className="ml-2 text-primary font-medium">
              ({pagination.totalUsers} {pagination.totalUsers === 1 ? 'investor' : 'investors'})
            </span>
          </p>
        </div>
      </div>

      {/* Investment Analytics Summary */}
      {analytics && Object.keys(analytics).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 border-2 border-blue-400 rounded-lg">
            <div className="flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Investment Value</p>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-card-foreground">
                ${parseFloat(analytics.totalAmountUSDT || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </Card>

          <Card className="p-6 border-2 border-green-400 rounded-lg">
            <div className="flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Total Investors</p>
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-card-foreground">
                {analytics.totalInvestments || 0}
              </p>
            </div>
          </Card>

          <Card className="p-6 border-2 border-purple-400 rounded-lg">
            <div className="flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Active Investments</p>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-card-foreground">
                {analytics.activeInvestments || 0}
              </p>
            </div>
          </Card>

          <Card className="p-6 border-2 border-orange-400 rounded-lg">
            <div className="flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Avg. Investment</p>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-card-foreground">
                ${parseFloat(analytics.averageInvestmentAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Investors Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Investor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Invested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Investments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-gray-200">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-card-foreground mb-2">No investors found</h3>
                    <p className="text-muted-foreground">
                      {users.length === 0 
                        ? `No investors have invested in ${organizationName} properties yet` 
                        : 'No investors match your current filters'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-background">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserClick(user);
                        }}
                      >
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-primary/80 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {(user.fullName || user.name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-card-foreground hover:text-primary transition-colors">
                            {user.fullName || user.name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground hover:text-primary/70 transition-colors">
                            ID: {user.id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-card-foreground">
                          <Mail className="w-3 h-3 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="w-3 h-3 mr-2 text-gray-400" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInvestmentsClick(user);
                        }}
                      >
                        <div className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
                          ${user.totalInvested?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </div>
                        <div className="text-xs text-muted-foreground hover:text-primary/70 transition-colors">
                          {user.activeInvestments || 0} active
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-card-foreground">
                        {user.investmentCount || 0} {user.investmentCount === 1 ? 'investment' : 'investments'}
                      </div>
                      {user.properties && user.properties.length > 0 && (
                        <div 
                          className="text-xs text-muted-foreground truncate max-w-xs cursor-pointer hover:text-primary transition-colors" 
                          title={user.properties.join(', ')}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvestmentsClick(user);
                          }}
                        >
                          {user.properties.slice(0, 2).join(', ')}
                          {user.properties.length > 2 && ` +${user.properties.length - 2} more`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-2 text-gray-400" />
                        {formatDate(user.createdAt || user.created_at)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={!pagination.hasPrev}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={!pagination.hasNext}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{pagination.totalPages}</span>
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                  disabled={!pagination.hasNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Sidebar for User Details */}
      {sidebarView === 'user-details' && selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeSidebar}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-card shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              {fullUserLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-border pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-2xl">
                        {(selectedUser.fullName || selectedUser.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-card-foreground">
                          {selectedUser.fullName || selectedUser.name || 'Unknown User'}
                        </h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {selectedUser.email}
                        </p>
                        {selectedUser.displayCode && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-1">
                            ID: {selectedUser.displayCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={closeSidebar}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* User Info */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">User Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        {getStatusBadge(selectedUser.isActive)}
                      </div>
                      {selectedUser.phone && selectedUser.phone !== 'N/A' && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Phone</span>
                          <span className="text-sm font-medium text-card-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {selectedUser.phone}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Joined</span>
                        <span className="text-sm font-medium text-card-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(selectedUser.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Investment Summary */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Investment Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Invested</p>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          {formatPrice(selectedUser.totalInvested)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Investments</p>
                        <p className="text-lg font-bold text-card-foreground mt-1">
                          {selectedUser.investmentCount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Active Investments</p>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {selectedUser.activeInvestments || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Properties</p>
                        <p className="text-lg font-bold text-card-foreground mt-1">
                          {selectedUser.properties?.length || 0}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => handleInvestmentsClick(selectedUser)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View All Investments
                    </Button>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar for Investments */}
      {sidebarView === 'investments' && selectedUser && selectedUserInvestments && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeSidebar}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full max-w-3xl bg-card shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-card-foreground">
                      Investments
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedUser.fullName || selectedUser.name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {formatPrice(selectedUser.totalInvested)} • {selectedUser.investmentCount || 0} investments
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={closeSidebar}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Investments List */}
                {selectedUserInvestments.length === 0 ? (
                  <Card className="p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-base font-semibold text-card-foreground mb-2">No Investments</p>
                    <p className="text-sm text-muted-foreground">This user has not made any investments yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {selectedUserInvestments.map((investment, index) => {
                      const property = investment.property || {};
                      const amount = parseFloat(investment.amountUSDT || investment.amount || 0);
                      // Extract tokens using the same logic as InvestmentsManagement page
                      // Check all possible field names in the same order
                      let tokens = parseFloat(
                        investment.tokensToBuy || 
                        investment.tokens_bought || 
                        investment.tokens || 
                        investment.tokensBought ||
                        investment.tokensPurchased ||
                        investment.tokens_to_buy ||
                        investment.tokenAmount ||
                        investment.quantity ||
                        0
                      );
                      const status = investment.status || 'pending';
                      const createdAt = investment.createdAt || investment.created_at || investment.date;
                      
                      // Debug log to see what we're getting
                      console.log('Investment tokens (OrgUsers):', {
                        tokens,
                        tokensToBuy: investment.tokensToBuy,
                        tokens_bought: investment.tokens_bought,
                        tokens: investment.tokens,
                        tokensBought: investment.tokensBought,
                        tokensPurchased: investment.tokensPurchased,
                        tokens_to_buy: investment.tokens_to_buy,
                        fullInvestment: investment
                      });

                      return (
                        <Card key={investment.id || index} className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                <h3 className="text-lg font-semibold text-card-foreground">
                                  {property.title || property.name || 'Unknown Property'}
                                </h3>
                              </div>
                              {property.location && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {property.location}
                                </p>
                              )}
                            </div>
                            <Badge 
                              variant={status === 'active' || status === 'confirmed' ? 'green' : status === 'pending' ? 'yellow' : 'gray'}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Amount Invested</p>
                              <p className="text-base font-bold text-green-600 mt-1">
                                {formatPrice(amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Tokens</p>
                              <p className="text-base font-bold text-card-foreground mt-1">
                                {(() => {
                                  // Always show the actual value, no matter how small
                                  if (tokens === 0 || isNaN(tokens)) {
                                    return '0.00';
                                  }
                                  // Format tokens similar to InvestmentsManagement page
                                  // But with more precision for small values
                                  if (tokens < 0.01) {
                                    // For very small numbers, show up to 6 decimal places
                                    return tokens.toLocaleString('en-US', { 
                                      minimumFractionDigits: 1, 
                                      maximumFractionDigits: 6,
                                      useGrouping: false
                                    });
                                  }
                                  if (tokens < 1) {
                                    // For small numbers (< 1), show up to 3 decimal places (like 0.1)
                                    return tokens.toLocaleString('en-US', { 
                                      minimumFractionDigits: 1, 
                                      maximumFractionDigits: 3,
                                      useGrouping: false
                                    });
                                  }
                                  // For larger numbers, show up to 3 decimal places (like 68.513)
                                  return tokens.toLocaleString('en-US', { 
                                    minimumFractionDigits: 0, 
                                    maximumFractionDigits: 3 
                                  });
                                })()}{' '}
                                <span className="text-xs text-muted-foreground font-normal">tokens</span>
                              </p>
                            </div>
                          </div>

                          {createdAt && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-border">
                              <Calendar className="w-3 h-3" />
                              <span>Invested on {formatDate(createdAt)}</span>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgUsersManagement;

