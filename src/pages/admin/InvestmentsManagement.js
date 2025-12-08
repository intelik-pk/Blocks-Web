import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  Eye, 
  TrendingUp,
  Building2,
  User,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  X,
  Award,
  ArrowUpRight,
  Activity,
  DollarSign,
  TrendingDown,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import InputTwo from '../../components/ui/InputTwo';
import { adminAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import { cn } from '../../utils/cn';
import { formatExactPrice, formatFullPrice } from '../../utils/formatPrice';

// Helper function to get full certificate URL from path
// Expected format in Neon DB: Full URL like:
// https://klglyxwyrjtjsxfzbzfv.supabase.co/storage/v1/object/public/certificates/transactions/{userId}/{transactionId}.pdf
// If database has relative path, this function constructs the full URL
const getCertificateUrl = (certificatePath) => {
  if (!certificatePath || certificatePath.trim() === '') {
    return null;
  }
  
  // If it's already a full URL, return as is
  if (certificatePath.startsWith('http://') || certificatePath.startsWith('https://')) {
    return certificatePath;
  }
  
  // Otherwise, prepend the Supabase certificates base URL
  // Base URL format: https://klglyxwyrjtjsxfzbzfv.supabase.co/storage/v1/object/public/certificates/
  const baseUrl = 'https://klglyxwyrjtjsxfzbzfv.supabase.co/storage/v1/object/public/certificates/';
  // Remove leading slash if present
  const cleanPath = certificatePath.startsWith('/') ? certificatePath.slice(1) : certificatePath;
  // Construct full URL: baseUrl + path
  // Example: baseUrl + "transactions/userId/file.pdf" = full URL
  return `${baseUrl}${cleanPath}`;
};

const InvestmentsManagement = () => {
  const { isAuthenticated } = useAdminAuth();
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    property: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [openFilterPanel, setOpenFilterPanel] = useState(null);
  const filterPanelRef = useRef(null);
  
  // Insights tabs and pagination state
  const [topInvestorsTab, setTopInvestorsTab] = useState('all'); // 'all', 'month', 'year'
  const [topInvestorsPage, setTopInvestorsPage] = useState(1);
  const [propertyBreakdownTab, setPropertyBreakdownTab] = useState('all'); // 'all', 'active', 'amount'
  const [propertyBreakdownPage, setPropertyBreakdownPage] = useState(1);
  const [recentActivityTab, setRecentActivityTab] = useState('all'); // 'all', 'investments', 'status'
  const [recentActivityPage, setRecentActivityPage] = useState(1);
  const [propertySearchTerm, setPropertySearchTerm] = useState(''); // For filtering properties in the filter panel
  
  const itemsPerPageTable = 20;
  const insightsItemsPerPage = 5; // Show 5 items per page in insight cards

  // Click outside handler for filter panel
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

  // Fetch investments
  const { data: investmentsData, isLoading, error } = useQuery(
    ['admin-investments'],
    async () => {
      const response = await adminAPI.getInvestments({
        limit: 1000 // Get all investments
      });
      console.log('Investments API Response:', response);
      return response;
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Fetch properties for property filter dropdown
  const { data: propertiesData } = useQuery(
    ['admin-properties-for-filter'],
    () => adminAPI.getProperties({ limit: 1000 }),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Fetch dashboard stats for accurate investment totals
  const { data: dashboardData } = useQuery(
    ['admin-dashboard'],
    () => adminAPI.getDashboard(),
    {
      retry: 1,
      enabled: isAuthenticated
    }
  );

  // Handle different response formats from backend
  // IMPORTANT: This must be declared before any useMemo that uses it
  const investments = investmentsData?.data?.data?.investments || 
                     investmentsData?.data?.investments || 
                     investmentsData?.data || 
                     (Array.isArray(investmentsData) ? investmentsData : []);

  // Get unique properties from investments
  const uniqueProperties = useMemo(() => {
    const propertySet = new Set();
    investments.forEach(inv => {
      const propertyTitle = inv.property?.title || inv.property_title;
      if (propertyTitle) {
        propertySet.add(propertyTitle);
      }
    });
    return Array.from(propertySet).sort();
  }, [investments]);

  // Get unique user IDs from investments (unused - commented out)
  // const uniqueUserIds = useMemo(() => {
  //   const userIds = new Set();
  //   investments.forEach((inv) => {
  //     const userId = inv.user_id || inv.userId || inv.user?.id;
  //     if (userId) userIds.add(userId);
  //   });
  //   return Array.from(userIds);
  // }, [investments]);

  // Note: Portfolio API is returning 404 errors, so we'll use investment data directly
  // const allUserPortfolios = null; // Disabled - Portfolio API not working
  
  const pagination = investmentsData?.data?.data?.pagination || 
                     investmentsData?.data?.pagination || 
                     {
                       totalPages: 1,
                       currentPage: 1,
                       totalInvestments: investments.length,
                       hasPrev: false,
                       hasNext: false
                     };

  // Calculate summary statistics using dashboard data for accurate totals
  const summary = useMemo(() => {
    // Get investment stats from dashboard API (more accurate)
    const dashboardInvestments = dashboardData?.data?.investments || {};
    
    const stats = {
      totalInvestments: parseFloat(dashboardInvestments.totalValue || 0),
      activeInvestments: 0,
      pendingInvestments: 0,
      totalInvestors: 0,
      investmentCount: parseInt(dashboardInvestments.count || 0),
      averageInvestment: parseFloat(dashboardInvestments.averageInvestment || 0),
      newInvestorsThisWeek: 0,
      totalTokens: 0
    };
    
    const uniqueInvestors = new Set();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    console.log('📊 Dashboard investments data:', dashboardInvestments);
    console.log('📊 Calculating counts from investments:', investments.length);
    
    // Calculate counts and investors from investment list
    investments.forEach((inv) => {
      const status = (inv.status || '').toLowerCase();
      const userId = inv.user_id || inv.userId;
      const createdAt = new Date(inv.createdAt || inv.created_at);
      const tokens = parseFloat(
        inv.tokensToBuy || 
        inv.tokens_bought || 
        inv.tokens || 
        inv.tokensBought ||
        inv.tokensPurchased ||
        0
      );
      
      // Count by status
      if (status === 'active' || status === 'confirmed' || status === 'completed') {
        stats.activeInvestments++;
        stats.totalTokens += tokens;
      } else if (status === 'pending') {
        stats.pendingInvestments++;
      }
      
      // Count unique investors
      if (userId) {
        uniqueInvestors.add(userId);
        
        // Count new investors this week
        if (createdAt >= weekAgo) {
          stats.newInvestorsThisWeek++;
        }
      }
    });
    
    stats.totalInvestors = uniqueInvestors.size;
    
    console.log('📊 Summary calculated:', stats);
    
    return stats;
  }, [investments, dashboardData]);

  // Calculate top investors with time-based filtering
  const topInvestors = useMemo(() => {
    const investorMap = new Map();
    const now = new Date();
    let startDate = null;
    
    // Filter by time period
    if (topInvestorsTab === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (topInvestorsTab === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    investments.forEach((inv) => {
      const userId = inv.user_id || inv.userId;
      const userName = inv.user?.fullName || inv.user_name || 'Unknown';
      const amount = parseFloat(inv.amountUSDT || inv.amount_invested || inv.amount || 0);
      const status = (inv.status || '').toLowerCase();
      const createdAt = new Date(inv.createdAt || inv.created_at);
      
      // Filter by time period if needed
      if (startDate && createdAt < startDate) {
        return;
      }
      
      // Only count active/completed investments
      if ((status === 'active' || status === 'confirmed' || status === 'completed') && userId) {
        if (!investorMap.has(userId)) {
          investorMap.set(userId, {
            userId,
            name: userName,
            totalAmount: 0,
            investmentCount: 0
          });
        }
        
        const investor = investorMap.get(userId);
        investor.totalAmount += amount;
        investor.investmentCount++;
      }
    });
    
    return Array.from(investorMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [investments, topInvestorsTab]);
  
  // Paginated top investors
  const paginatedTopInvestors = useMemo(() => {
    const startIndex = (topInvestorsPage - 1) * insightsItemsPerPage;
    const endIndex = startIndex + insightsItemsPerPage;
    return topInvestors.slice(startIndex, endIndex);
  }, [topInvestors, topInvestorsPage]);
  
  const topInvestorsTotalPages = Math.ceil(topInvestors.length / insightsItemsPerPage);

  // Calculate property breakdown with filtering
  const propertyBreakdown = useMemo(() => {
    const propertyMap = new Map();
    let totalInvested = 0;
    
    investments.forEach((inv) => {
      const propertyTitle = inv.property?.title || inv.property_title || 'Unknown';
      const amount = parseFloat(inv.amountUSDT || inv.amount_invested || inv.amount || 0);
      const status = (inv.status || '').toLowerCase();
      
      // Filter based on tab
      if (propertyBreakdownTab === 'active' && status !== 'active' && status !== 'confirmed' && status !== 'completed') {
        return;
      }
      
      // Only count active/completed investments (unless showing all)
      if (propertyBreakdownTab === 'all' || status === 'active' || status === 'confirmed' || status === 'completed') {
        if (!propertyMap.has(propertyTitle)) {
          propertyMap.set(propertyTitle, {
            property: propertyTitle,
            totalAmount: 0,
            investmentCount: 0
          });
        }
        
        const property = propertyMap.get(propertyTitle);
        property.totalAmount += amount;
        property.investmentCount++;
        totalInvested += amount;
      }
    });
    
    let sorted = Array.from(propertyMap.values())
      .map(p => ({
        ...p,
        percentage: totalInvested > 0 ? (p.totalAmount / totalInvested) * 100 : 0
      }));
    
    // Sort based on tab
    if (propertyBreakdownTab === 'amount') {
      sorted = sorted.sort((a, b) => b.totalAmount - a.totalAmount);
    } else {
      sorted = sorted.sort((a, b) => b.totalAmount - a.totalAmount);
    }
    
    return sorted;
  }, [investments, propertyBreakdownTab]);
  
  // Paginated property breakdown
  const paginatedPropertyBreakdown = useMemo(() => {
    const startIndex = (propertyBreakdownPage - 1) * insightsItemsPerPage;
    const endIndex = startIndex + insightsItemsPerPage;
    return propertyBreakdown.slice(startIndex, endIndex);
  }, [propertyBreakdown, propertyBreakdownPage]);
  
  const propertyBreakdownTotalPages = Math.ceil(propertyBreakdown.length / insightsItemsPerPage);

  // Calculate recent activity with filtering
  const recentActivity = useMemo(() => {
    let filtered = [...investments];
    
    // Filter based on tab
    if (recentActivityTab === 'investments') {
      // Only show investment activities
      filtered = filtered.filter(inv => {
        const type = (inv.transactionType || inv.transaction_type || '').toLowerCase();
        return type === 'investment' || type === 'invested' || type === 'invest';
      });
    } else if (recentActivityTab === 'status') {
      // Only show status changes (pending -> active, etc.)
      filtered = filtered.filter(inv => {
        const status = (inv.status || '').toLowerCase();
        return status === 'pending' || status === 'active' || status === 'completed';
      });
    }
    
    return filtered
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0);
        const dateB = new Date(b.createdAt || b.created_at || 0);
        return dateB - dateA;
      })
      .map(inv => ({
        id: inv.id || inv._id,
        userName: inv.user?.fullName || inv.user_name || 'Unknown',
        propertyTitle: inv.property?.title || inv.property_title || 'Unknown',
        amount: parseFloat(inv.amountUSDT || inv.amount_invested || inv.amount || 0),
        status: inv.status || 'unknown',
        date: new Date(inv.createdAt || inv.created_at)
      }));
  }, [investments, recentActivityTab]);
  
  // Paginated recent activity
  const paginatedRecentActivity = useMemo(() => {
    const startIndex = (recentActivityPage - 1) * insightsItemsPerPage;
    const endIndex = startIndex + insightsItemsPerPage;
    return recentActivity.slice(startIndex, endIndex);
  }, [recentActivity, recentActivityPage]);
  
  const recentActivityTotalPages = Math.ceil(recentActivity.length / insightsItemsPerPage);

  // Debug logging
  console.log('Investments Data:', {
    raw: investmentsData,
    investments: investments,
    pagination: pagination,
    count: investments.length,
    summary: summary,
    topInvestors: topInvestors,
    propertyBreakdown: propertyBreakdown
  });
  
  // Debug: Log sample investment to see available fields
  if (investments.length > 0) {
    console.log('📊 Investment Data Sample (first investment):', {
      investment: investments[0],
      availableTokenFields: {
        tokensToBuy: investments[0].tokensToBuy,
        tokens_bought: investments[0].tokens_bought,
        tokens: investments[0].tokens,
        tokensBought: investments[0].tokensBought,
        tokensPurchased: investments[0].tokensPurchased
      }
    });
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Frontend filtering logic
  const filteredInvestments = useMemo(() => {
    let filtered = [...investments];
    
    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(investment => {
        const id = (investment.id || investment.displayCode || '').toString().toLowerCase();
        const userName = (investment.user?.fullName || investment.user_name || '').toLowerCase();
        const userEmail = (investment.user?.email || investment.user_email || '').toLowerCase();
        const propertyTitle = (investment.property?.title || investment.property_title || '').toLowerCase();
        const amount = (investment.amountUSDT || investment.amount_invested || investment.amount || '').toString().toLowerCase();
        
        return id.includes(searchLower) ||
               userName.includes(searchLower) ||
               userEmail.includes(searchLower) ||
               propertyTitle.includes(searchLower) ||
               amount.includes(searchLower);
      });
    }
    
    // Status filter
    if (filters.status && filters.status.trim()) {
      filtered = filtered.filter(investment => {
        const investmentStatus = (investment.status || '').toLowerCase();
        const filterStatus = filters.status.toLowerCase();
        return investmentStatus === filterStatus;
      });
    }
    
    // Property filter
    if (filters.property && filters.property.trim()) {
      filtered = filtered.filter(investment => {
        const propertyTitle = (investment.property?.title || investment.property_title || '').toLowerCase();
        const propertySlug = (investment.property?.slug || '').toLowerCase();
        const filterProperty = filters.property.toLowerCase();
        return propertyTitle.includes(filterProperty) ||
               propertySlug.includes(filterProperty);
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
          case 'investment_amount':
            aValue = parseFloat(a.amountUSDT || a.amount_invested || a.amount || 0);
            bValue = parseFloat(b.amountUSDT || b.amount_invested || b.amount || 0);
            break;
          case 'status':
            aValue = (a.status || '').toLowerCase();
            bValue = (b.status || '').toLowerCase();
            break;
          case 'property_title':
            aValue = (a.property?.title || a.property_title || '').toLowerCase();
            bValue = (b.property?.title || b.property_title || '').toLowerCase();
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
  }, [investments, filters]);

  // Client-side pagination for table
  const totalFiltered = filteredInvestments.length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPageTable);
  
  const paginatedInvestments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPageTable;
    const endIndex = startIndex + itemsPerPageTable;
    return filteredInvestments.slice(startIndex, endIndex);
  }, [filteredInvestments, currentPage]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.property, filters.sort_by]);

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': { variant: 'success', text: 'Active', icon: CheckCircle },
      'pending': { variant: 'warning', text: 'Pending', icon: Clock },
      'completed': { variant: 'success', text: 'Completed', icon: CheckCircle },
      'cancelled': { variant: 'danger', text: 'Cancelled', icon: XCircle },
      'failed': { variant: 'danger', text: 'Failed', icon: XCircle }
    };
    return statusMap[status] || { variant: 'default', text: status, icon: Clock };
  };

  // Keep formatPrice for summary cards (abbreviated display)
  const formatPrice = (amount, currency = 'USD') => {
    const num = parseFloat(amount);
    if (num >= 1000000000) {
      return `${currency} ${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `${currency} ${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${currency} ${(num / 1000).toFixed(0)}K`;
    }
    return `${currency}${num.toFixed(0)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const activeFiltersCount = [
    filters.search,
    filters.status,
    filters.property,
    filters.sort_by !== 'created_at' || filters.sort_order !== 'desc'
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: '',
      property: '',
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  const toggleFilter = (filterKey, value) => {
    const currentValue = filters[filterKey];
    if (currentValue === value) {
      setFilters(prev => ({ ...prev, [filterKey]: '' }));
    } else {
      setFilters(prev => ({ ...prev, [filterKey]: value }));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view investments.</p>
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
        <p className="text-red-600">Failed to load investments</p>
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
          <h2 className="text-3xl font-bold text-card-foreground tracking-tight">Investments</h2>
          <p className="text-muted-foreground text-sm mt-1">Monitor and manage all property investments</p>
        </div>
      </div>

      {/* Summary Cards - Improved with trends */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                <TrendingUp className="w-3 h-3" />
                <span>12%</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Invested</p>
              <p 
                className="text-3xl font-bold text-card-foreground tracking-tight cursor-help"
                title={formatFullPrice(summary.totalInvestments, '$')}
              >
                {formatExactPrice(summary.totalInvestments, '$')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              {summary.pendingInvestments > 0 && (
                <Badge variant="warning" className="text-xs px-2 py-0.5">
                  {summary.pendingInvestments} pending
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Active Investments</p>
              <p className="text-3xl font-bold text-card-foreground tracking-tight">
                {summary.activeInvestments}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.totalTokens.toLocaleString()} tokens
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              {summary.newInvestorsThisWeek > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>{summary.newInvestorsThisWeek} new</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Total Investors</p>
              <p className="text-3xl font-bold text-card-foreground tracking-tight">
                {summary.totalInvestors}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Avg{' '}
                <span 
                  className="cursor-help"
                  title={formatFullPrice(summary.averageInvestment, '$')}
                >
                  {formatExactPrice(summary.averageInvestment, '$')}
                </span>{' '}
                each
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-shadow">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Properties</p>
              <p className="text-3xl font-bold text-card-foreground tracking-tight">
                {propertyBreakdown.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Active listings
              </p>
            </div>
          </div>
        </Card>
      </div>

      
      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Investors */}
        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-base font-semibold text-card-foreground">Top Investors</h3>
            </div>
            {topInvestorsTotalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTopInvestorsPage(prev => Math.max(prev - 1, 1))}
                  disabled={topInvestorsPage === 1}
                  className={cn(
                    "p-1.5 rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    topInvestorsPage > 1
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTopInvestorsPage(prev => Math.min(prev + 1, topInvestorsTotalPages))}
                  disabled={topInvestorsPage === topInvestorsTotalPages}
                  className={cn(
                    "p-1.5 rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    topInvestorsPage < topInvestorsTotalPages
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border/40">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'month', label: 'This Month' },
              { id: 'year', label: 'This Year' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setTopInvestorsTab(tab.id);
                  setTopInvestorsPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all duration-200 border-b-2 -mb-[1px]",
                  topInvestorsTab === tab.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="space-y-3 min-h-[200px]">
            {paginatedTopInvestors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              paginatedTopInvestors.map((investor, index) => {
                const globalIndex = (topInvestorsPage - 1) * insightsItemsPerPage + index;
                return (
                  <div 
                    key={investor.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-bold text-sm">
                        {globalIndex + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{investor.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {investor.investmentCount} {investor.investmentCount === 1 ? 'investment' : 'investments'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                    <p 
                      className="text-sm font-bold text-green-600 dark:text-green-400 cursor-help"
                      title={formatFullPrice(investor.totalAmount, '$')}
                    >
                      {formatExactPrice(investor.totalAmount, '$')}
                    </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Property Breakdown */}
        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-card-foreground">Property Breakdown</h3>
            </div>
            {propertyBreakdownTotalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPropertyBreakdownPage(prev => Math.max(prev - 1, 1))}
                  disabled={propertyBreakdownPage === 1}
                  className={cn(
                    "p-1.5 rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    propertyBreakdownPage > 1
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPropertyBreakdownPage(prev => Math.min(prev + 1, propertyBreakdownTotalPages))}
                  disabled={propertyBreakdownPage === propertyBreakdownTotalPages}
                  className={cn(
                    "p-1.5 rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    propertyBreakdownPage < propertyBreakdownTotalPages
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border/40">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active Only' },
              { id: 'amount', label: 'By Amount' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setPropertyBreakdownTab(tab.id);
                  setPropertyBreakdownPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all duration-200 border-b-2 -mb-[1px]",
                  propertyBreakdownTab === tab.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="space-y-3 min-h-[200px]">
            {paginatedPropertyBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              paginatedPropertyBreakdown.map((property) => (
                <div key={property.property} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-card-foreground truncate max-w-[180px]">
                      {property.property}
                    </p>
                    <p className="text-sm font-bold text-card-foreground">
                      {property.percentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${property.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span 
                      className="cursor-help"
                      title={formatFullPrice(property.totalAmount, '$')}
                    >
                      {formatExactPrice(property.totalAmount, '$')}
                    </span> • {property.investmentCount} investments
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-base font-semibold text-card-foreground">Recent Activity</h3>
            </div>
            {recentActivityTotalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRecentActivityPage(prev => Math.max(prev - 1, 1))}
                  disabled={recentActivityPage === 1}
                  className={cn(
                    "p-1.5 rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    recentActivityPage > 1
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRecentActivityPage(prev => Math.min(prev + 1, recentActivityTotalPages))}
                  disabled={recentActivityPage === recentActivityTotalPages}
                  className={cn(
                    "p-1.5 rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    recentActivityPage < recentActivityTotalPages
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border/40">
            {[
              { id: 'all', label: 'All' },
              { id: 'investments', label: 'Investments' },
              { id: 'status', label: 'Status' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setRecentActivityTab(tab.id);
                  setRecentActivityPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-all duration-200 border-b-2 -mb-[1px]",
                  recentActivityTab === tab.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="space-y-3 min-h-[200px]">
            {paginatedRecentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
            ) : (
              paginatedRecentActivity.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      activity.status === 'active' || activity.status === 'completed' 
                        ? "bg-green-500" 
                        : activity.status === 'pending'
                        ? "bg-yellow-500"
                        : "bg-gray-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-card-foreground leading-relaxed">
                      <span className="font-medium">{activity.userName}</span> invested{' '}
                      <span 
                        className="font-semibold text-green-600 dark:text-green-400 cursor-help"
                        title={formatFullPrice(activity.amount, '$')}
                      >
                        {formatExactPrice(activity.amount, '$')}
                      </span>{' '}
                      in <span className="font-medium">{activity.propertyTitle}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(activity.date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>


      {/* Modern Filters */}
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
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Clear All
            </Button>
          )}
        </div>

        <div className="relative w-full space-y-4" ref={filterPanelRef}>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Search Investments
              </label>
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <InputTwo
                  type="text"
                  name="search"
                  placeholder="Search by investor, property, or amount..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  style={{ paddingLeft: '48px' }}
                />
              </div>
            </div>

            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-foreground mb-1">
                More Filters
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

          {openFilterPanel === 'main' && (
            <div className="w-full rounded-xl p-6 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Filter */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                    Status
                    {filters.status && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                        Selected
                      </span>
                    )}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'active', label: 'Active' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'completed', label: 'Completed' },
                      { value: 'cancelled', label: 'Cancelled' }
                    ].map((option) => {
                      const isActive = filters.status === option.value;
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
                </div>

                {/* Property Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span className="w-1 h-4 bg-green-600 rounded-full"></span>
                      Property
                      {filters.property && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                          Selected
                        </span>
                      )}
                    </h4>
                    {uniqueProperties.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {uniqueProperties.length} {uniqueProperties.length === 1 ? 'property' : 'properties'}
                      </span>
                    )}
                  </div>
                  
                  {/* Property Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search properties..."
                      value={propertySearchTerm}
                      onChange={(e) => setPropertySearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white/60 dark:bg-slate-800/60 text-card-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                    />
                    {propertySearchTerm && (
                      <button
                        type="button"
                        onClick={() => setPropertySearchTerm('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Filtered Properties List */}
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto scrollbar-hide pr-1">
                    {(() => {
                      const filteredProperties = uniqueProperties.filter(property =>
                        property.toLowerCase().includes(propertySearchTerm.toLowerCase())
                      );
                      
                      if (filteredProperties.length === 0) {
                        return (
                          <p className="text-xs text-muted-foreground py-2 w-full text-center">
                            No properties found matching "{propertySearchTerm}"
                          </p>
                        );
                      }
                      
                      return filteredProperties.map((property) => {
                        const isActive = filters.property === property;
                        return (
                          <button
                            key={property}
                            type="button"
                            onClick={() => toggleFilter('property', property)}
                            className={cn(
                              "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium flex items-center gap-1.5",
                              isActive
                                ? "bg-green-600 text-white border-green-600 shadow-md hover:bg-green-700"
                                : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-700"
                            )}
                            title={property}
                          >
                            {isActive && <span className="text-xs">✓</span>}
                            <span className="truncate max-w-[150px]">
                              {property}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Show count if search is active */}
                  {propertySearchTerm && (
                    <p className="text-xs text-muted-foreground">
                      Showing {uniqueProperties.filter(p => p.toLowerCase().includes(propertySearchTerm.toLowerCase())).length} of {uniqueProperties.length} properties
                    </p>
                  )}
                </div>

                {/* Sort Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-600 rounded-full"></span>
                    Sort By
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'created_at', label: 'Date' },
                      { value: 'investment_amount', label: 'Amount' },
                      { value: 'status', label: 'Status' }
                    ].map((option) => {
                      const isActive = filters.sort_by === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, sort_by: option.value }))}
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
                  <div className="flex gap-2 mt-2">
                    {[
                      { value: 'desc', label: '↓ Desc' },
                      { value: 'asc', label: '↑ Asc' }
                    ].map((option) => {
                      const isActive = filters.sort_order === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFilters(prev => ({ ...prev, sort_order: option.value }))}
                          className={cn(
                            "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium",
                            isActive
                              ? "bg-pink-600 text-white border-pink-600 shadow-md"
                              : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-700"
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
              {filters.search && (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  onClick={() => handleFilterChange('search', '')}
                >
                  <span>Search: "{filters.search}"</span>
                  <X className="w-3 h-3" />
                </div>
              )}
              
              {filters.status && (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                  onClick={() => handleFilterChange('status', '')}
                >
                  <span>Status: {filters.status}</span>
                  <X className="w-3 h-3" />
                </div>
              )}
              
              {filters.property && (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm"
                  onClick={() => handleFilterChange('property', '')}
                >
                  <span>Property: {filters.property}</span>
                  <X className="w-3 h-3" />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Investments Table - New 5 Column Design */}
      <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/30 backdrop-blur-sm border-b border-border/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Investor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Investment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ownership
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-card/50 divide-y divide-border/30">
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No investments found</p>
                      <p className="text-sm">Investments will appear here once users start investing in properties</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvestments.map((investment) => {
                  // Extract tokens directly from investment data
                  let tokens_bought = parseFloat(
                    investment.tokensToBuy || 
                    investment.tokens_bought || 
                    investment.tokens || 
                    investment.tokensBought ||
                    investment.tokensPurchased ||
                    0
                  );
                  
                  // Map backend field names to frontend
                  const mappedInvestment = {
                    ...investment,
                    status: investment.status || 'active',
                    tokens_bought: tokens_bought,
                    amount_invested: investment.amountUSDT || investment.amount_invested || investment.amount || 0,
                    created_at: investment.createdAt || investment.created_at,
                    property_title: investment.property?.title || investment.property_title || 'Unknown Property',
                    user_name: investment.user?.fullName || investment.user_name || 'Unknown User',
                    user_email: investment.user?.email || investment.user_email || '',
                    certificatePath: investment.certificatePath || investment.certificate_path || null,
                  };
                  
                  // Calculate ownership percentage
                  const totalPropertyTokens = investment.property?.totalTokens || investment.property?.total_tokens || 100000;
                  const ownershipPercent = totalPropertyTokens > 0 
                    ? (tokens_bought / totalPropertyTokens) * 100 
                    : 0;

                  const statusInfo = getStatusBadge(mappedInvestment.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={investment.id} className="hover:bg-accent/50 transition-colors duration-200 border-b border-border/30">
                      {/* Investor Column - 2 lines */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">
                            {mappedInvestment.user_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {mappedInvestment.user_email}
                          </p>
                        </div>
                      </td>

                      {/* Property Column - 2 lines */}
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-card-foreground">
                              {mappedInvestment.property_title}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {investment.property?.displayCode || investment.displayCode || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Investment Column - 2 lines: amount + date */}
                      <td className="px-1 py-4">
                        <div>
                          <p 
                            className="text-base font-bold tracking-tight cursor-help"
                            title={formatFullPrice(mappedInvestment.amount_invested, '$')}
                          >
                            {formatExactPrice(mappedInvestment.amount_invested, '$')}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {new Date(mappedInvestment.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Ownership Column - 2 lines: tokens + percentage */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-card-foreground">
                            {tokens_bought.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                            })}{' '}
                            <span className="text-xs text-muted-foreground font-normal">tokens</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ownershipPercent >= 0.01 ? ownershipPercent.toFixed(2) : '< 0.01'}% ownership
                          </p>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-4 py-4">
                        <Badge variant={statusInfo.variant} className="flex items-center w-fit text-xs px-3 py-1">
                          <StatusIcon className="w-3 h-3 mr-1.5" />
                          {statusInfo.text}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-card/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-t border-border/50 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background/50 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background/50 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/50"
              >
                Next
              </button>
            </div>
            
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between gap-4">
              <div className="flex-shrink-0">
                <p className="text-sm text-foreground whitespace-nowrap">
                  Showing{' '}
                  <span className="font-medium">
                    {totalFiltered === 0 ? 0 : ((currentPage - 1) * itemsPerPageTable) + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPageTable, totalFiltered)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{totalFiltered}</span>{' '}
                  results
                </p>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <button
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      currentPage > 1
                        ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                        : "bg-background/30 border-border/50 text-muted-foreground"
                    )}
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    {(() => {
                      const maxPages = 10;
                      const current = currentPage;
                      let startPage = Math.max(1, current - Math.floor(maxPages / 2));
                      let endPage = Math.min(totalPages, startPage + maxPages - 1);
                      
                      if (endPage - startPage < maxPages - 1) {
                        startPage = Math.max(1, endPage - maxPages + 1);
                      }
                      
                      const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                      
                      return (
                        <>
                          {startPage > 1 && (
                            <>
                              <button
                                onClick={() => setCurrentPage(1)}
                                className={cn(
                                  "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                                  "bg-background/50 border-border text-foreground hover:bg-accent/50"
                                )}
                              >
                                1
                              </button>
                              {startPage > 2 && (
                                <span className="relative inline-flex items-center px-3 py-2 border border-border bg-background/50 text-sm text-muted-foreground">
                                  ...
                                </span>
                              )}
                            </>
                          )}
                          
                          {pageNumbers.map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                                page === currentPage
                                  ? "z-10 bg-primary/20 border-primary text-primary font-semibold"
                                  : "bg-background/50 border-border text-foreground hover:bg-accent/50"
                              )}
                            >
                              {page}
                            </button>
                          ))}
                          
                          {endPage < totalPages && (
                            <>
                              {endPage < totalPages - 1 && (
                                <span className="relative inline-flex items-center px-3 py-2 border border-border bg-background/50 text-sm text-muted-foreground">
                                  ...
                                </span>
                              )}
                              <button
                                onClick={() => setCurrentPage(totalPages)}
                                className={cn(
                                  "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                                  totalPages === currentPage
                                    ? "z-10 bg-primary/20 border-primary text-primary font-semibold"
                                    : "bg-background/50 border-border text-foreground hover:bg-accent/50"
                                )}
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </nav>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      currentPage < totalPages
                        ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                        : "bg-background/30 border-border/50 text-muted-foreground"
                    )}
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Go to:</span>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.target.querySelector('input');
                      const page = parseInt(input.value, 10);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                        input.value = '';
                      }
                    }} 
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      placeholder={currentPage.toString()}
                      className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      maxLength={4}
                      pattern="[0-9]*"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 text-sm font-medium bg-primary/20 text-primary border border-primary/50 rounded hover:bg-primary/30 transition-colors"
                      title="Jump to page"
                    >
                      Go
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default InvestmentsManagement;
