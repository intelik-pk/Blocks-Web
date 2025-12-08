import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Edit,
  Users,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Wallet,
  TrendingUp,
  DollarSign,
  Building2,
  X,
  FileText,
  MapPin,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  User,
  Shield,
  Eye
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI, usersAPI, walletTransactionsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { API_BASE_URL } from '../../config/api';
import Loader from '../../components/Loder';
import { cn } from '../../utils/cn';
import { formatExactPrice, formatFullPrice } from '../../utils/formatPrice';
import InputTwo from '../../components/ui/InputTwo';

// Helper function to get full certificate URL from path
const getCertificateUrl = (certificatePath) => {
  if (!certificatePath || certificatePath.trim() === '') return null;
  if (certificatePath.startsWith('http://') || certificatePath.startsWith('https://')) {
    return certificatePath;
  }
  const baseUrl = 'https://klglyxwyrjtjsxfzbzfv.supabase.co/storage/v1/object/public/certificates/';
  const cleanPath = certificatePath.startsWith('/') ? certificatePath.slice(1) : certificatePath;
  return `${baseUrl}${cleanPath}`;
};

const UsersManagement = ({ initialFilters, onFiltersSet }) => {
  const { isAuthenticated } = useAdminAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [filters, setFilters] = useState({
    search: '',
    status: [],      // Multi-select
    kyc_status: [],  // Multi-select
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [actionPanel, setActionPanel] = useState(null); // 'details', null
  const [userDetailsTab, setUserDetailsTab] = useState('overview');
  const [openFilterPanel, setOpenFilterPanel] = useState(null);
  const filterPanelRef = useRef(null);

  // Handle click outside to close filter panels
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setOpenFilterPanel(null);
      }
    };

    if (openFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openFilterPanel]);

  // Fetch users
  const { data: usersData, isLoading, error } = useQuery(
    ['admin-users'],
    () => adminAPI.getUsers({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: 1
    }
  );

  // Fetch all KYC statuses
  const { data: allKYCData } = useQuery(
    ['all-kyc-statuses'],
    () => adminAPI.getAllKYC(),
    {
      enabled: isAuthenticated,
      staleTime: 60000
    }
  );

  // Extract KYC list - handle different data structures
  const kycList = useMemo(() => {
    if (!allKYCData) return [];
    return allKYCData?.data?.data || 
           allKYCData?.data || 
           (Array.isArray(allKYCData?.data) ? allKYCData.data : []) ||
           [];
  }, [allKYCData]);

  // Fetch selected user details
  const { data: fullUserData, isLoading: fullUserLoading } = useQuery(
    ['user-details', selectedUserId],
    () => usersAPI.getById(selectedUserId),
    {
      enabled: Boolean(selectedUserId && actionPanel === 'details'),
      retry: 1
    }
  );

  // Fetch user financial data
  const { data: userFinancialData, isLoading: financialLoading } = useQuery(
    ['user-financial', selectedUserId],
    async () => {
      const [walletResponse, portfolioResponse, transactionsResponse] = await Promise.allSettled([
        usersAPI.getWalletById(selectedUserId).catch(() => ({ data: null })),
        fetch(`${API_BASE_URL}/portfolio/user/${selectedUserId}/detailed`).then(r => r.json()).catch(() => null),
        walletTransactionsAPI.getByUserId(selectedUserId).catch(() => ({ data: [] }))
      ]);
      
      const walletData = walletResponse.status === 'fulfilled' ? walletResponse.value?.data : null;
      const walletBalance = parseFloat(walletData?.balanceUSDT || walletData?.data?.balanceUSDT || walletData?.balance || walletData?.data?.balance || 0);
      
      const portfolioData = portfolioResponse.status === 'fulfilled' ? portfolioResponse.value : null;
      const investments = portfolioData?.investments || [];
      const summary = portfolioData?.summary || {};
      
      const transactionsData = transactionsResponse.status === 'fulfilled' ? transactionsResponse.value?.data : [];
      const transactions = Array.isArray(transactionsData) ? transactionsData : 
                          transactionsData?.data?.transactions || 
                          transactionsData?.transactions || 
                          transactionsData?.data || 
                          [];
      
      return {
        walletBalance,
        totalInvestments: parseFloat(summary.totalInvestedUSDT || 0),
        totalReturns: parseFloat(summary.totalRewardsUSDT || 0),
        totalCurrentValue: parseFloat(summary.totalCurrentValueUSDT || 0),
        totalNetROI: parseFloat(summary.totalNetROI || 0),
        activeInvestments: parseInt(summary.activeInvestments || 0),
        averageROI: parseFloat(summary.averageROI || 0),
        propertiesInvested: investments.length,
        investments: investments,
        transactions: transactions
      };
    },
    {
      enabled: Boolean(selectedUserId && actionPanel === 'details'),
      retry: 1
    }
  );

  // Parse users data
  const allUsers = usersData?.data?.data?.users || 
                  usersData?.data?.users || 
                  usersData?.data || 
                  (Array.isArray(usersData) ? usersData : []);

  // Helper function to get KYC status
  const getUserKYCStatus = (user) => {
    if (!kycList || kycList.length === 0) return 'not_submitted';
    const kycRecord = kycList.find(kyc => 
      kyc.userId === user.id || 
      kyc.userId === user.displayCode ||
      kyc.user?.id === user.id ||
      kyc.user?.displayCode === user.displayCode
    );
    return kycRecord?.status || 'not_submitted';
  };

  // Get user's KYC records grouped
  const getUserKYCGroup = useMemo(() => {
    if (!selectedUserId || !kycList || kycList.length === 0) return null;
    
    const userKYCs = kycList.filter(kyc => {
      const kycUserId = kyc.userId;
      const kycUserDisplayCode = kyc.user?.displayCode;
      const kycUserObjectId = kyc.user?.id;
      
      const matches = kycUserId === selectedUserId || 
             kycUserId === fullUserData?.data?.id ||
             kycUserId === fullUserData?.data?.displayCode ||
             kycUserDisplayCode === selectedUserId ||
             kycUserDisplayCode === fullUserData?.data?.id ||
             kycUserDisplayCode === fullUserData?.data?.displayCode ||
             kycUserObjectId === selectedUserId ||
             kycUserObjectId === fullUserData?.data?.id ||
             kycUserObjectId === fullUserData?.data?.displayCode;
      
      return matches;
    });

    if (userKYCs.length === 0) {
      // Debug: log when no KYC records found
      console.log('No KYC records found for user:', {
        selectedUserId,
        kycListLength: kycList.length,
        sampleKyc: kycList[0],
        fullUserData: fullUserData?.data
      });
      return null;
    }

    // Debug: log found KYC records
    console.log('Found KYC records for user:', {
      selectedUserId,
      count: userKYCs.length,
      records: userKYCs.map(k => ({
        id: k.id,
        userId: k.userId,
        type: k.type,
        status: k.status,
        hasFront: !!(k.documentFrontUrl || k.document_front_url),
        hasBack: !!(k.documentBackUrl || k.document_back_url),
        hasSelfie: !!(k.selfieUrl || k.selfie_url)
      }))
    });

    // Determine overall status
    const hasPending = userKYCs.some(k => k.status === 'pending');
    const hasRejected = userKYCs.some(k => k.status === 'rejected');
    const allVerified = userKYCs.every(k => k.status === 'verified');
    
    let overallStatus = 'pending';
    if (allVerified) overallStatus = 'verified';
    else if (hasRejected && !hasPending) overallStatus = 'rejected';

    return {
      userId: selectedUserId,
      user: fullUserData?.data || null,
      documents: userKYCs,
      overallStatus
    };
  }, [selectedUserId, kycList, fullUserData]);

  // Helper functions for KYC
  const getKYCStatusBadgeComponent = (status) => {
    const statusMap = {
      'verified': { icon: CheckCircle, color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400', label: 'Verified' },
      'pending': { icon: Clock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pending' },
      'rejected': { icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400', label: 'Rejected' },
      'not_submitted': { icon: XCircle, color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400', label: 'Not Submitted' },
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    const Icon = statusInfo.icon;
    return (
      <Badge className={statusInfo.color}>
        <Icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const getDocumentUrl = ({ documentFrontUrl, documentBackUrl, selfieUrl }) => {
    // Use documentFrontUrl, documentBackUrl, or selfieUrl based on what's provided
    let url = documentFrontUrl || documentBackUrl || selfieUrl;
    
    if (!url) return null;
    
    // If URL is already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If URL starts with '/', prepend API_BASE_URL
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    
    // Otherwise, prepend API_BASE_URL with '/'
    return `${API_BASE_URL}/${url}`;
  };

  const getAllUserDocuments = (group) => {
    if (!group) return { front: null, back: null, selfie: null };
    const documents = {
      front: null,
      back: null,
      selfie: null
    };
    
    group.documents.forEach(kyc => {
      // Support both camelCase and snake_case field names
      const frontUrl = kyc.documentFrontUrl || kyc.document_front_url || kyc.documentFront || kyc.document_front;
      const backUrl = kyc.documentBackUrl || kyc.document_back_url || kyc.documentBack || kyc.document_back;
      const selfieUrl = kyc.selfieUrl || kyc.selfie_url || kyc.selfie;
      
      if (frontUrl) documents.front = frontUrl;
      if (backUrl) documents.back = backUrl;
      if (selfieUrl) documents.selfie = selfieUrl;
    });
    
    return documents;
  };

  // Frontend filtering and sorting
  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers];
    
    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(user => {
        const name = (user.fullName || user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const id = (user.id || user.displayCode || '').toString().toLowerCase();
        const phone = (user.phone || user.phoneNumber || '').toLowerCase();
        
        return name.includes(searchLower) ||
               email.includes(searchLower) ||
               id.includes(searchLower) ||
               phone.includes(searchLower);
      });
    }
    
    // Status filter (multi-select)
    if (Array.isArray(filters.status) && filters.status.length > 0) {
      filtered = filtered.filter(user => {
        const isActive = user.isActive !== undefined ? user.isActive : user.is_active;
        return filters.status.some(filterStatus => {
          if (filterStatus === 'active') return isActive;
          if (filterStatus === 'inactive') return !isActive;
          return true;
        });
      });
    }
    
    // KYC Status filter (multi-select)
    if (Array.isArray(filters.kyc_status) && filters.kyc_status.length > 0) {
      filtered = filtered.filter(user => {
        const userKYCStatus = getUserKYCStatus(user);
        return filters.kyc_status.includes(userKYCStatus);
      });
    }
    
    // Sorting
    if (filters.sort_by) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (filters.sort_by) {
          case 'created_at':
            aValue = new Date(a.createdAt || a.created_at || 0);
            bValue = new Date(b.createdAt || b.created_at || 0);
            break;
          case 'name':
            aValue = (a.fullName || a.name || '').toLowerCase();
            bValue = (b.fullName || b.name || '').toLowerCase();
            break;
          case 'email':
            aValue = (a.email || '').toLowerCase();
            bValue = (b.email || '').toLowerCase();
            break;
          default:
            return 0;
        }
        
        if (filters.sort_order === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }
    
    return filtered;
  }, [allUsers, filters, allKYCData]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Toggle filter value (for multi-select)
  const toggleFilter = (filterKey, value) => {
    setFilters(prev => {
      const currentArray = Array.isArray(prev[filterKey]) ? prev[filterKey] : [];
      const isSelected = currentArray.includes(value);
      
      if (isSelected) {
        return {
          ...prev,
          [filterKey]: currentArray.filter(v => v !== value)
        };
      } else {
        return {
          ...prev,
          [filterKey]: [...currentArray, value]
        };
      }
    });
  };

  // Count active filters
  const activeFiltersCount = [
    filters.search,
    ...(Array.isArray(filters.status) ? filters.status : []),
    ...(Array.isArray(filters.kyc_status) ? filters.kyc_status : [])
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: [],
      kyc_status: [],
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  const closeActionPanel = () => {
    setActionPanel(null);
    setSelectedUserId(null);
  };

  const getKYCStatusBadge = (status) => {
    const statusMap = {
      'verified': { variant: 'success', text: 'Verified' },
      'pending': { variant: 'warning', text: 'Pending' },
      'rejected': { variant: 'danger', text: 'Rejected' },
      'not_submitted': { variant: 'default', text: 'Not Submitted' }
    };
    return statusMap[status] || { variant: 'default', text: status };
  };

  const getStatusBadge = (isActive) => {
    return isActive 
      ? { variant: 'success', text: 'Active' }
      : { variant: 'danger', text: 'Inactive' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount, currency = 'USD') => {
    const num = parseFloat(amount);
    if (num >= 1000000000) {
      return `${currency} ${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `${currency} ${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${currency} ${(num / 1000).toFixed(0)}K`;
    }
    return `${currency} ${num.toFixed(0)}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view users.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load users: {error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Users Management</h2>
          <p className="text-muted-foreground">
            Manage all users in your platform
            {!actionPanel && filteredUsers.length > 0 && (
              <span className="ml-2 text-blue-600 font-semibold">
                ({filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found)
              </span>
            )}
          </p>
        </div>
        {!actionPanel && (
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
        )}
        {actionPanel && (
          <Button 
            onClick={closeActionPanel}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Back to List</span>
          </Button>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative transition-all duration-300">
        {/* LEFT SIDE: Filters + User List */}
        <div className={cn(
          "transition-all duration-300 space-y-4",
          actionPanel ? "lg:col-span-5" : "lg:col-span-12"
        )}>
          {/* Filters */}
          <Card variant="primary" className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-card-foreground">Filters</h3>
                {activeFiltersCount > 0 && (
                  <Badge variant="info" className="ml-2">
                    {activeFiltersCount} active
                  </Badge>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear All Filters
                </Button>
              )}
            </div>

            {/* Unified Filter System */}
            <div className="relative w-full space-y-4" ref={filterPanelRef}>
              {/* Top Row: Search + Single Filters Button */}
              <div className="flex gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Search Users
                  </label>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <InputTwo
                      type="text"
                      name="search"
                      placeholder="Search by name, email, ID..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange("search", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      style={{ paddingLeft: "48px" }}
                    />
                  </div>
                </div>

                {/* Single Unified Filters Button */}
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Filters
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpenFilterPanel(prev => prev === 'main' ? null : 'main')}
                    className={cn(
                      "px-5 py-2 border rounded-lg bg-card text-card-foreground flex items-center gap-2 transition-all hover:border-primary/50 min-w-[120px]",
                      openFilterPanel === 'main' || activeFiltersCount > 0
                        ? 'border-primary bg-accent font-semibold' 
                        : 'border-input'
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-sm">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                        {activeFiltersCount}
                      </span>
                    )}
                    <span className={cn(
                      "transition-transform duration-200",
                      openFilterPanel === 'main' ? "rotate-180" : ""
                    )}>▼</span>
                  </button>
                </div>
              </div>

              {/* Expanded Filter Panel */}
              {openFilterPanel === 'main' && (
                <div className="w-full rounded-xl p-6 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Section - Multi-select */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                        Account Status
                        {Array.isArray(filters.status) && filters.status.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                            {filters.status.length} selected
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' }
                        ].map((option) => {
                          const isActive = Array.isArray(filters.status) && filters.status.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleFilter('status', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium flex items-center gap-1.5",
                                isActive
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {isActive && <span className="text-xs">✓</span>}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      {Array.isArray(filters.status) && filters.status.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Clear status filters
                        </button>
                      )}
                    </div>

                    {/* KYC Status Section - Multi-select */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-green-600 rounded-full"></span>
                        KYC Status
                        {Array.isArray(filters.kyc_status) && filters.kyc_status.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                            {filters.kyc_status.length} selected
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'verified', label: 'Verified' },
                          { value: 'pending', label: 'Pending' },
                          { value: 'rejected', label: 'Rejected' },
                          { value: 'not_submitted', label: 'Not Submitted' }
                        ].map((option) => {
                          const isActive = Array.isArray(filters.kyc_status) && filters.kyc_status.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleFilter('kyc_status', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium flex items-center gap-1.5",
                                isActive
                                  ? "bg-green-600 text-white border-green-600 shadow-md hover:bg-green-700"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {isActive && <span className="text-xs">✓</span>}
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      {Array.isArray(filters.kyc_status) && filters.kyc_status.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, kyc_status: [] }))}
                          className="text-xs text-green-600 dark:text-green-400 hover:underline"
                        >
                          Clear KYC filters
                        </button>
                      )}
                    </div>

                    {/* Sort By Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-600 rounded-full"></span>
                        Sort By
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'created_at', label: 'Date Created' },
                          { value: 'name', label: 'Name' },
                          { value: 'email', label: 'Email' }
                        ].map((option) => {
                          const isActive = filters.sort_by === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFilterChange('sort_by', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium",
                                isActive
                                  ? "bg-purple-600 text-white border-purple-600 shadow-md"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sort Order Section */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-orange-600 rounded-full"></span>
                        Sort Order
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'desc', label: 'Descending ↓' },
                          { value: 'asc', label: 'Ascending ↑' }
                        ].map((option) => {
                          const isActive = filters.sort_order === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleFilterChange('sort_order', option.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium",
                                isActive
                                  ? "bg-orange-600 text-white border-orange-600 shadow-md"
                                  : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700"
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Filters Chips */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status chips */}
                  {Array.isArray(filters.status) && filters.status.length > 0 && filters.status.map((status) => (
                    <div 
                      key={status}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                      onClick={() => toggleFilter('status', status)}
                    >
                      <span>Status: {status === 'active' ? 'Active' : 'Inactive'}</span>
                      <X className="w-3 h-3" />
                    </div>
                  ))}
                  
                  {/* KYC Status chips */}
                  {Array.isArray(filters.kyc_status) && filters.kyc_status.length > 0 && filters.kyc_status.map((kyc) => {
                    const labels = {
                      'verified': 'Verified',
                      'pending': 'Pending',
                      'rejected': 'Rejected',
                      'not_submitted': 'Not Submitted'
                    };
                    return (
                      <div 
                        key={kyc}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm"
                        onClick={() => toggleFilter('kyc_status', kyc)}
                      >
                        <span>KYC: {labels[kyc] || kyc}</span>
                        <X className="w-3 h-3" />
                      </div>
                    );
                  })}
                  
                  {filters.search && (
                    <div 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors shadow-sm"
                      onClick={() => handleFilterChange('search', '')}
                    >
                      <span>Search: "{filters.search}"</span>
                      <X className="w-3 h-3" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium shadow-sm">
                    <span>{filters.sort_by === 'created_at' ? 'Date' : 
                              filters.sort_by === 'name' ? 'Name' : 'Email'}</span>
                    <span>{filters.sort_order === 'desc' ? '↓' : '↑'}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Users List */}
          <div className=" dark:bg-slate-900/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Users ({filteredUsers.length})
              </h3>
              <button className="text-gray-400 hover:text-gray-600">
                <span className="text-xl">⋯</span>
              </button>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mb-4 opacity-50" />
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No users found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const userId = user.id || user.displayCode;
                  const isSelected = actionPanel === 'details' && selectedUserId && (
                    userId === selectedUserId || 
                    String(userId) === String(selectedUserId)
                  );
                  const isActive = user.isActive !== undefined ? user.isActive : user.is_active;

                  return (
                    <div
                      key={userId}
                      onClick={() => {
                        if (userId) {
                          setSelectedUserId(userId);
                          setActionPanel('details');
                          setUserDetailsTab('overview'); // Reset to overview when selecting a new user
                        }
                      }}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all duration-200",
                        isSelected
                          ? " dark:bg-blue-900/20 border-2 border-black/10"
                          : " dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || user.name || 'U')}`}
                            alt=""
                            className="w-10 h-10 rounded-full"
                          />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.fullName || user.name || 'Unknown User'}
                            </p>
                          {user.isActive ? <span className="flex justify-end px-2 py-0.5 rounded text-[10px] font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</span> : <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Inactive</span>}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: User Details Panel */}
        {actionPanel === 'details' && selectedUserId && (
          <div className={cn(
            "lg:col-span-7 rounded-xl shadow-lg p-6",
            "transition-all duration-300",
            "lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          )}>
            {fullUserLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader />
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Header */}
                <div className="pb-4 border-b border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-2xl">
                        {(fullUserData?.data?.fullName || fullUserData?.data?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-card-foreground">
                          {fullUserData?.data?.fullName || fullUserData?.data?.name || 'Unknown User'}
                        </h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {fullUserData?.data?.email}
                        </p>
                        {fullUserData?.data?.displayCode && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-1">
                            User ID: {fullUserData.data.displayCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={closeActionPanel}
                      className="h-8 w-8 p-0"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mt-4 border-b border-border">
                    <button
                      onClick={() => setUserDetailsTab('overview')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2",
                        userDetailsTab === 'overview'
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      )}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setUserDetailsTab('kyc')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        userDetailsTab === 'kyc'
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      )}
                    >
                      <Shield className="w-4 h-4" />
                      KYC Details
                    </button>
                    <button
                      onClick={() => setUserDetailsTab('investments')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        userDetailsTab === 'investments'
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      )}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Investments
                    </button>
                    <button
                      onClick={() => setUserDetailsTab('transactions')}
                      className={cn(
                        "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
                        userDetailsTab === 'transactions'
                          ? "border-blue-500 text-blue-600 dark:text-blue-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      )}
                    >
                      <Activity className="w-4 h-4" />
                      Transactions
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                {userDetailsTab === 'overview' ? (
                  <>
                    {/* Financial Metrics - Row 1 */}
                    {financialLoading ? (
                      <div className="text-center py-4">
                        <Loader />
                        <p className="text-sm text-gray-500 mt-2">Loading financial data...</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Wallet Balance */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Wallet Balance</p>
                          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                            <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p 
                            className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-help"
                            title={formatFullPrice(userFinancialData?.walletBalance || 0, '$')}
                          >
                            {formatExactPrice(userFinancialData?.walletBalance || 0, '$')}
                          </p>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                      
                      {/* Total Investments */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Investments</p>
                          <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p 
                            className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-help"
                            title={formatFullPrice(userFinancialData?.totalInvestments || 0, '$')}
                          >
                            {formatExactPrice(userFinancialData?.totalInvestments || 0, '$')}
                          </p>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                      
                      {/* Total Returns */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Total Returns</p>
                          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                            <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p 
                            className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-help"
                            title={formatFullPrice(userFinancialData?.totalReturns || 0, '$')}
                          >
                            {formatExactPrice(userFinancialData?.totalReturns || 0, '$')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Properties */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Properties</p>
                          <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {userFinancialData?.propertiesInvested || 0}
                          </p>
                          <span className="text-xs text-red-500">↘</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Metrics - Row 2 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Current Value */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Current Value</p>
                          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                            <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p 
                            className="text-lg font-bold text-gray-900 dark:text-gray-100 cursor-help"
                            title={formatFullPrice(userFinancialData?.totalCurrentValue || 0, '$')}
                          >
                            {formatExactPrice(userFinancialData?.totalCurrentValue || 0, '$')}
                          </p>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      </div>

                      {/* Net ROI */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Net ROI</p>
                          <div className="p-1.5 rounded bg-red-100 dark:bg-red-900/30">
                            <span className="text-xs text-red-600">↘</span>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p 
                            className={cn(
                              "text-lg font-bold cursor-help",
                              (userFinancialData?.totalNetROI || 0) >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600'
                            )}
                            title={formatFullPrice(userFinancialData?.totalNetROI || 0, '$')}
                          >
                            {formatExactPrice(userFinancialData?.totalNetROI || 0, '$')}
                          </p>
                          <span className="text-xs text-red-500">↘</span>
                        </div>
                      </div>

                      {/* Average ROI */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Average ROI</p>
                          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                            <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {(userFinancialData?.averageROI || 0).toFixed(1)}%
                          </p>
                          <span className="text-xs text-red-500">↘</span>
                        </div>
                      </div>

                      {/* Active Investments */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Active Investments</p>
                          <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                            <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {userFinancialData?.activeInvestments || 0}
                          </p>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                    {/* Personal Information & Account Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Personal Information */}
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Personal Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Full Name</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                          {fullUserData?.data?.fullName || fullUserData?.data?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                          {fullUserData?.data?.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                          {fullUserData?.data?.phone || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">User ID</span>
                        <span className="text-xs font-mono text-gray-700 dark:text-gray-300 text-right break-all">
                          {fullUserData?.data?.id?.slice(0, 24)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Account Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
                        <span className={cn(
                          "text-sm font-semibold",
                          (fullUserData?.data?.isActive !== undefined ? fullUserData?.data?.isActive : fullUserData?.data?.is_active)
                            ? "text-green-600" 
                            : "text-gray-500"
                        )}>
                          {(fullUserData?.data?.isActive !== undefined ? fullUserData?.data?.isActive : fullUserData?.data?.is_active) ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">KYC Status</span>
                        <button
                          onClick={() => {
                            setUserDetailsTab('kyc');
                          }}
                          className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline cursor-pointer transition-colors flex items-center gap-1 group"
                          title="Click to view KYC details"
                        >
                          {getKYCStatusBadge(getUserKYCStatus(fullUserData?.data || {})).text}
                          <Shield className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Joined Date</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(fullUserData?.data?.createdAt || fullUserData?.data?.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Login</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {fullUserData?.data?.lastLogin ? formatDate(fullUserData.data.lastLogin) : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Investment Portfolio */}
                {userFinancialData?.investments && userFinancialData.investments.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Investment Portfolio
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-700">
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Property</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount Invested</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tokens</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Returns</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {userFinancialData.investments.slice(0, 10).map((investment, index) => {
                            const amount = parseFloat(investment.amountInvestedUSDT || investment.amount || 0);
                            const tokens = parseFloat(investment.tokensPurchased || investment.tokens || 0);
                            const returns = parseFloat(investment.totalRewardsUSDT || investment.returns || 0);
                            const propertyName = investment.property?.title || investment.propertyName || 'N/A';
                            const displayCode = investment.displayCode || '';
                            const status = investment.status || 'active';
                            const certificatePath = investment.certificatePath || investment.certificate_path || null;
                            const certificateUrl = certificatePath ? getCertificateUrl(certificatePath) : null;
                            
                            return (
                              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">{propertyName}</p>
                                      {displayCode && (
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{displayCode}</p>
                                      )}
                                    </div>
                                    {certificateUrl && (
                                      <button
                                        onClick={() => window.open(certificateUrl, '_blank')}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded"
                                        title="View Certificate"
                                      >
                                        <FileText className="w-3 h-3 text-gray-500" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">
                                  <span 
                                    className="cursor-help"
                                    title={formatFullPrice(amount, '$')}
                                  >
                                    {formatExactPrice(amount, '$')}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">{tokens.toLocaleString()}</td>
                                <td className="px-3 py-2 text-xs text-green-600">
                                  <span 
                                    className="cursor-help"
                                    title={formatFullPrice(returns, '$')}
                                  >
                                    {formatExactPrice(returns, '$')}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                                    status === 'confirmed' || status === 'active' 
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                      : status === 'pending'
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                                  )}>
                                    {status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Recent Transactions */}
                {userFinancialData?.transactions && userFinancialData.transactions.length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-base font-semibold text-card-foreground mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Recent Transactions
                    </h3>
                    <div className="space-y-2">
                      {userFinancialData.transactions.slice(0, 5).map((transaction, index) => {
                        const txType = transaction.type || 'unknown';
                        const isDeposit = txType === 'deposit';
                        const amount = parseFloat(transaction.amountUSDT || transaction.amount_in_pkr || transaction.amount || 0);
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${isDeposit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                <DollarSign className={`w-4 h-4 ${isDeposit ? 'text-green-600' : 'text-red-600'}`} />
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-card-foreground">{transaction.description || txType}</p>
                                  {transaction.displayCode && (
                                    <span className="text-xs text-muted-foreground">({transaction.displayCode})</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt || transaction.date)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                                {isDeposit ? '+' : '-'}
                                <span 
                                  className="cursor-help"
                                  title={formatFullPrice(amount, '$')}
                                >
                                  {formatExactPrice(amount, '$')}
                                </span>
                              </p>
                              <Badge 
                                variant={transaction.status === 'completed' ? 'success' : transaction.status === 'pending' ? 'warning' : 'default'}
                                className="text-[10px]"
                              >
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button variant="outline" className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Edit User
                      </Button>
                    </div>
                  </>
                ) : userDetailsTab === 'investments' ? (
                  /* Investments Tab */
                  <div className="space-y-4">
                    {financialLoading ? (
                      <div className="text-center py-4">
                        <Loader />
                        <p className="text-sm text-gray-500 mt-2">Loading investment data...</p>
                      </div>
                    ) : userFinancialData?.investments && userFinancialData.investments.length > 0 ? (
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                          Investment Portfolio
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-slate-700">
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Property</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount Invested</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tokens</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Returns</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                              {userFinancialData.investments.map((investment, index) => {
                                const amount = parseFloat(investment.amountInvestedUSDT || investment.amount || 0);
                                const tokens = parseFloat(investment.tokensPurchased || investment.tokens || 0);
                                const returns = parseFloat(investment.totalRewardsUSDT || investment.returns || 0);
                                const propertyName = investment.property?.title || investment.propertyName || 'N/A';
                                const displayCode = investment.displayCode || '';
                                const status = investment.status || 'active';
                                const certificatePath = investment.certificatePath || investment.certificate_path || null;
                                const certificateUrl = certificatePath ? getCertificateUrl(certificatePath) : null;
                                
                                return (
                                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <div>
                                          <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">{propertyName}</p>
                                          {displayCode && (
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{displayCode}</p>
                                          )}
                                        </div>
                                        {certificateUrl && (
                                          <button
                                            onClick={() => window.open(certificateUrl, '_blank')}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-600 rounded"
                                            title="View Certificate"
                                          >
                                            <FileText className="w-3 h-3 text-gray-500" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">{formatPrice(amount)}</td>
                                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-gray-100">{tokens.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-xs text-green-600">{formatPrice(returns)}</td>
                                    <td className="px-3 py-2">
                                      <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                                        status === 'confirmed' || status === 'active' 
                                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                          : status === 'pending'
                                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                                      )}>
                                        {status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No Investments</p>
                        <p className="text-sm text-gray-500">This user has not made any investments yet.</p>
                      </div>
                    )}
                  </div>
                ) : userDetailsTab === 'transactions' ? (
                  /* Transactions Tab */
                  <div className="space-y-4">
                    {financialLoading ? (
                      <div className="text-center py-4">
                        <Loader />
                        <p className="text-sm text-gray-500 mt-2">Loading transaction data...</p>
                      </div>
                    ) : userFinancialData?.transactions && userFinancialData.transactions.length > 0 ? (
                      <Card className="p-4">
                        <h3 className="text-base font-semibold text-card-foreground mb-3 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Recent Transactions
                        </h3>
                        <div className="space-y-2">
                          {userFinancialData.transactions.map((transaction, index) => {
                            const txType = transaction.type || 'unknown';
                            const isDeposit = txType === 'deposit';
                            const amount = parseFloat(transaction.amountUSDT || transaction.amount_in_pkr || transaction.amount || 0);
                            
                            return (
                              <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-lg ${isDeposit ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                    <DollarSign className={`w-4 h-4 ${isDeposit ? 'text-green-600' : 'text-red-600'}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <p className="text-sm font-medium text-card-foreground">{transaction.description || txType}</p>
                                      {transaction.displayCode && (
                                        <span className="text-xs text-muted-foreground">({transaction.displayCode})</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{formatDate(transaction.createdAt || transaction.date)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                                    {isDeposit ? '+' : '-'}{formatPrice(amount)}
                                  </p>
                                  <Badge 
                                    variant={transaction.status === 'completed' ? 'success' : transaction.status === 'pending' ? 'warning' : 'default'}
                                    className="text-[10px]"
                                  >
                                    {transaction.status}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No Transactions</p>
                        <p className="text-sm text-gray-500">This user has no transaction history yet.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* KYC Details Tab */
                  <div className="space-y-4">
                    {getUserKYCGroup ? (
                      <>
                        {/* KYC Status Section */}
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            KYC Verification Status
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Overall Status</span>
                              {getKYCStatusBadgeComponent(getUserKYCGroup.overallStatus)}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Documents</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {getUserKYCGroup.documents.length} submitted
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Pending Review</span>
                              <span className="text-sm font-medium text-yellow-600">
                                {getUserKYCGroup.documents.filter(d => d.status === 'pending').length}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* KYC Documents Preview */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Submitted Documents
                          </h3>
                          <div className="grid grid-cols-3 gap-3">
                            {(() => {
                              const allDocs = getAllUserDocuments(getUserKYCGroup);
                              const frontUrl = allDocs.front ? getDocumentUrl({ documentFrontUrl: allDocs.front }) : null;
                              const backUrl = allDocs.back ? getDocumentUrl({ documentBackUrl: allDocs.back }) : null;
                              const selfieUrl = allDocs.selfie ? getDocumentUrl({ selfieUrl: allDocs.selfie }) : null;
                              
                              return (
                                <>
                                  {frontUrl ? (
                                    <div className="border border-border rounded-lg p-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Front</p>
                                      <img
                                        src={frontUrl}
                                        alt="Front"
                                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(frontUrl, '_blank')}
                                        onError={(e) => {
                                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="80"%3E%3Crect fill="%23f3f4f6" width="100" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="border border-border rounded-lg p-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Front</p>
                                      <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                        <span className="text-xs text-gray-400">No image</span>
                                      </div>
                                    </div>
                                  )}
                                  {backUrl ? (
                                    <div className="border border-border rounded-lg p-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Back</p>
                                      <img
                                        src={backUrl}
                                        alt="Back"
                                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(backUrl, '_blank')}
                                        onError={(e) => {
                                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="80"%3E%3Crect fill="%23f3f4f6" width="100" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="border border-border rounded-lg p-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Back</p>
                                      <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                        <span className="text-xs text-gray-400">No image</span>
                                      </div>
                                    </div>
                                  )}
                                  {selfieUrl ? (
                                    <div className="border border-border rounded-lg p-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Selfie</p>
                                      <img
                                        src={selfieUrl}
                                        alt="Selfie"
                                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                        onClick={() => window.open(selfieUrl, '_blank')}
                                        onError={(e) => {
                                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="80"%3E%3Crect fill="%23f3f4f6" width="100" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="border border-border rounded-lg p-2">
                                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Selfie</p>
                                      <div className="w-full h-20 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                                        <span className="text-xs text-gray-400">No image</span>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        {/* KYC Documents List */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Document Details
                          </h3>
                          <div className="space-y-3">
                            {getUserKYCGroup.documents.map((kyc, index) => (
                              <div key={kyc.id || index} className="border border-border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {kyc.type === 'cnic' ? 'CNIC' : kyc.type === 'face' ? 'Face/Selfie' : kyc.type === 'card' ? 'Card' : kyc.type}
                                    </span>
                                  </div>
                                  {getKYCStatusBadgeComponent(kyc.status)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                  {kyc.submittedAt && (
                                    <div>Submitted: {new Date(kyc.submittedAt).toLocaleDateString()}</div>
                                  )}
                                  {kyc.reviewedAt && (
                                    <div>Reviewed: {new Date(kyc.reviewedAt).toLocaleDateString()}</div>
                                  )}
                                  {kyc.reviewer && (
                                    <div>Reviewer: {kyc.reviewer}</div>
                                  )}
                                  {kyc.rejectionReason && (
                                    <div className="text-red-600 dark:text-red-400">
                                      Reason: {kyc.rejectionReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4 opacity-50" />
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No KYC Records</p>
                        <p className="text-sm text-gray-500">This user has not submitted any KYC documents yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;
