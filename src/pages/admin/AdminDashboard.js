import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Award,
  Coins,
  Target,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Gift
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import ThemeToggle from '../../components/ThemeToggle';
import AdminSidebar from '../../components/admin/AdminSidebar';
import SafeAdminNotificationIcon from '../../components/admin/SafeAdminNotificationIcon';
import NotificationPopover from '../../components/notifications/NotificationPopover';
import MetricCards from '../../components/admin/MetricCards';
import InvestmentChart from '../../components/admin/InvestmentChart';
import { adminAPI, rewardsAPI, activitiesAPI } from '../../services/api';
import { useMutation, useQueryClient } from 'react-query';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import PropertiesManagement from './PropertiesManagement';
import PropertyRequestsManagement from './PropertyRequestsManagement';
import UsersManagement from './UsersManagement';
import TransactionsManagement from './TransactionsManagement';
import InvestmentsManagement from './InvestmentsManagement';
import OrganizationsManagement from './OrganizationsManagement';
import AdminSettings from './AdminSettings';
import TokensManagement from './TokensManagement';
import ReportsManagement from './ReportsManagement';
import KYCManagement from './KYCManagement';
import NotificationsManagement from './NotificationsManagement';
import BankTransferRequests from './BankTransferRequests';
import Loader from '../../components/Loder';
import { useTheme } from '../../contexts/ThemeContext';

const AdminDashboard = () => {
  const { adminUser, isAuthenticated, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  
  const validTabs = ['overview', 'properties', 'property-requests', 'users', 'bank-transfers', 'transactions', 'investments', 'organizations', 'tokens', 'reports', 'kyc', 'notifications', 'settings'];
  
  // Read initial tab from URL synchronously during render
  // Always use window.location.search for initial render to ensure we get the actual URL on refresh
  const getInitialTabFromURL = () => {
    if (typeof window === 'undefined') return 'overview';
    // Always read from window.location.search for initial render (works on refresh)
    const searchString = window.location.search || '';
    const urlParams = new URLSearchParams(searchString);
    const tabParam = urlParams.get('tab');
    if (tabParam && validTabs.includes(tabParam)) {
      return tabParam;
    }
    return 'overview';
  };
  
  // Initialize with tab from URL, or 'overview' as default
  const [activeTab, setActiveTabState] = useState(() => getInitialTabFromURL());
  const [analyticsFilter, setAnalyticsFilter] = useState({
    period: '30d',
    from: null,
    to: null
  });
  const [showTopSellers, setShowTopSellers] = useState(true); // Flip state for tokens chart
  const [activityFilter, setActivityFilter] = useState('all'); // 'all', 'admin', 'org_admin', 'user'
  const [tabFilters, setTabFilters] = useState({}); // Store filters to apply when switching tabs
  const [showNotifications, setShowNotifications] = useState(false); // Notification popover state
  const notificationIconRef = useRef(null); // Notification icon ref

  // Wrapper function to update both state and URL
  const setActiveTab = (tab) => {
    if (!validTabs.includes(tab)) {
      console.warn(`Invalid tab: ${tab}`);
      return;
    }
    setActiveTabState(tab);
    // Update URL without page reload
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('tab', tab);
    // Preserve other query parameters (like 'view', 'selected', etc.)
    navigate(`/admin?${urlParams.toString()}`, { replace: true });
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  // Track if we've initialized from URL to prevent overwriting on first render
  const hasInitializedRef = useRef(false);
  
  // Sync tab from URL on mount and when URL changes (including refresh)
  useEffect(() => {
    // Read from window.location.search to ensure we get the actual current URL (works on refresh)
    const searchString = typeof window !== 'undefined' ? window.location.search : location.search;
    const urlParams = new URLSearchParams(searchString);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['overview', 'properties', 'property-requests', 'users', 'bank-transfers', 'transactions', 'investments', 'organizations', 'tokens', 'reports', 'kyc', 'notifications', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // Sync whenever URL changes (refresh, back/forward buttons)

  // Fetch dashboard statistics
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useQuery(
    'admin-dashboard',
    () => adminAPI.getDashboard(),
    { 
      refetchInterval: 30000,
      enabled: isAuthenticated,
      retry: 1,
      onError: (error) => {
        console.log('Dashboard API not yet implemented:', error.message);
      }
    }
  );

  // Fetch analytics data with filters
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery(
    ['admin-analytics', analyticsFilter],
    () => adminAPI.getAnalytics(analyticsFilter),
    { 
      refetchInterval: 60000,
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Analytics API Error:', error.message);
      }
    }
  );

  // Fetch all investments to calculate total investment value
  const { data: investmentsData } = useQuery(
    ['admin-all-investments'],
    () => adminAPI.getInvestments({ limit: 10000 }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Investments fetch error:', error.message);
      }
    }
  );

  // Fetch all properties to get accurate count
  const { data: propertiesData } = useQuery(
    ['admin-all-properties'],
    () => adminAPI.getProperties({ limit: 10000 }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Properties fetch error:', error.message);
      }
    }
  );

  // Fetch all users to get accurate count (active users)
  const { data: usersData } = useQuery(
    ['admin-all-users'],
    () => adminAPI.getUsers({ limit: 10000, include_inactive: false }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Users fetch error:', error.message);
      }
    }
  );

  // Fetch all transactions to get accurate count
  const { data: transactionsData } = useQuery(
    ['admin-all-transactions'],
    () => adminAPI.getTransactions({ limit: 10000 }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Transactions fetch error:', error.message);
      }
    }
  );

  // Fetch activities with filter
  const { data: activitiesData, isLoading: activitiesLoading, error: activitiesError } = useQuery(
    ['admin-activities', activityFilter],
    () => activitiesAPI.getAll({ 
      userType: activityFilter === 'all' ? undefined : activityFilter,
      limit: 50,
      offset: 0
    }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      refetchInterval: 30000, // Refetch every 30 seconds
      retry: 1,
      onSuccess: (data) => {
        console.log('Activities fetched successfully:', data);
      },
      onError: (error) => {
        console.error('Activities fetch error:', error);
      }
    }
  );

  // Fetch activity count
  const { data: activityCountData } = useQuery(
    ['admin-activities-count', activityFilter],
    () => activitiesAPI.getCount(activityFilter === 'all' ? undefined : activityFilter),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Activity count fetch error:', error.message);
      }
    }
  );

  const queryClient = useQueryClient();
  
  // Delete all activities mutation
  const deleteAllActivitiesMutation = useMutation(
    () => activitiesAPI.deleteAll(),
    {
      onSuccess: () => {
        // Invalidate and refetch activities
        queryClient.invalidateQueries(['admin-activities']);
        queryClient.invalidateQueries(['admin-activities-count']);
        alert('All activities cleared successfully!');
      },
      onError: (error) => {
        console.error('Failed to delete activities:', error);
        alert('Failed to clear activities. Please try again.');
      }
    }
  );

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all activities? This action cannot be undone.')) {
      deleteAllActivitiesMutation.mutate();
    }
  };

  // Fetch all organizations to get accurate count
  const { data: organizationsData } = useQuery(
    ['admin-all-organizations'],
    () => adminAPI.getOrganizations({ limit: 10000 }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Organizations fetch error:', error.message);
      }
    }
  );

  // Fetch all KYC data to calculate approved/unapproved counts
  const { data: kycData } = useQuery(
    ['admin-all-kyc'],
    () => adminAPI.getAllKYC({ limit: 10000 }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('KYC fetch error:', error.message);
      }
    }
  );

  // Fetch recent rewards for activity feed
  const { data: rewardsData } = useQuery(
    ['admin-rewards'],
    () => rewardsAPI.getAll({ limit: 50 }),
    {
      enabled: isAuthenticated && activeTab === 'overview',
      retry: 1,
      onError: (error) => {
        console.log('Rewards fetch error:', error.message);
      }
    }
  );

  // Parse analytics data
  const analytics = analyticsData?.data?.data || analyticsData?.data || {};
  const stats = dashboardData?.data?.data || dashboardData?.data || {};
  
  // Extract arrays from API responses
  const investments = investmentsData?.data?.data?.investments || 
                     investmentsData?.data?.investments || 
                     investmentsData?.data || 
                     (Array.isArray(investmentsData) ? investmentsData : []);
  
  const properties = propertiesData?.data?.data?.properties || 
                    propertiesData?.data?.properties || 
                    propertiesData?.data || 
                    (Array.isArray(propertiesData) ? propertiesData : []);
  
  const users = usersData?.data?.data?.users || 
               usersData?.data?.users || 
               usersData?.data || 
               (Array.isArray(usersData) ? usersData : []);
  
  const transactions = transactionsData?.data?.data?.transactions || 
                      transactionsData?.data?.transactions || 
                      transactionsData?.data || 
                      (Array.isArray(transactionsData) ? transactionsData : []);
  
  const organizations = organizationsData?.data?.data?.organizations || 
                       organizationsData?.data?.organizations || 
                       organizationsData?.data || 
                       (Array.isArray(organizationsData) ? organizationsData : []);
  
  const kycList = kycData?.data?.data || 
                  kycData?.data || 
                  (Array.isArray(kycData) ? kycData : []);

  console.log('📊 Analytics Data:', {
    raw: analyticsData,
    parsed: analytics,
    filter: analyticsFilter
  });

  // Removed tabs - using sidebar navigation now

  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  // Format currency
  const formatCurrency = (amount, currency = 'USDT') => {
    if (!amount) return `0 ${currency}`;
    return `${parseFloat(amount).toLocaleString()} ${currency}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Stat Card Component
  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue', 
    change, 
    changeType = 'positive', 
    onClick,
    subtitle 
  }) => {
    const colorClasses = {
      blue: 'from-blue-500/20 to-blue-600/20',
      green: 'from-green-500/20 to-green-600/20',
      purple: 'from-purple-500/20 to-purple-600/20',
      yellow: 'from-yellow-500/20 to-yellow-600/20',
    };

    const iconColorClasses = {
      blue: 'text-blue-500',
      green: 'text-green-500',
      purple: 'text-purple-500',
      yellow: 'text-yellow-500',
    };

    return (
      <Card 
        className={`p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-card-foreground mt-2">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {change !== undefined && change !== null && (
              <div className={`flex items-center mt-2 text-sm font-semibold ${
                changeType === 'positive' ? 'text-green-400' : 
                changeType === 'negative' ? 'text-red-400' : 'text-muted-foreground'
              }`}>
                {changeType === 'positive' ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : changeType === 'negative' ? (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                ) : null}
                <span>{Math.abs(change).toFixed(1)}% vs previous period</span>
              </div>
            )}
          </div>
          <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className={`w-8 h-8 ${iconColorClasses[color] || iconColorClasses.blue}`} />
          </div>
        </div>
      </Card>
    );
  };

  // Mini Line Chart Component (unused - commented out)
  // const MiniLineChart = ({ data, color = 'blue' }) => {
  //   if (!data || data.length === 0) return null;
  //   const max = Math.max(...data.map(d => parseFloat(d.count || d.volume || 0)));
  //   const points = data.map((d, i) => {
  //     const x = (i / (data.length - 1)) * 100;
  //     const y = 100 - ((parseFloat(d.count || d.volume || 0) / max) * 100);
  //     return `${x},${y}`;
  //   }).join(' ');
  //   return (
  //     <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
  //       <polyline
  //         fill="none"
  //         stroke={color === 'blue' ? '#3B82F6' : color === 'green' ? '#10B981' : color === 'purple' ? '#8B5CF6' : '#F59E0B'}
  //         strokeWidth="2"
  //         points={points}
  //       />
  //     </svg>
  //   );
  // };

  // Time Series Chart Component
  const TimeSeriesChart = ({ data, title, color = 'blue', valueKey = 'count', showVolume = false }) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No data available</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => parseFloat(d[valueKey] || 0)));
    const maxVolume = showVolume ? Math.max(...data.map(d => parseFloat(d.volume || 0))) : 0;

    const barColors = {
      blue: 'bg-blue-500 hover:bg-blue-600',
      green: 'bg-green-500 hover:bg-green-600',
      purple: 'bg-purple-500 hover:bg-purple-600',
      yellow: 'bg-yellow-500 hover:bg-yellow-600',
    };

    const barLightColors = {
      blue: 'bg-blue-400/30',
      green: 'bg-green-400/30',
      purple: 'bg-purple-400/30',
      yellow: 'bg-yellow-400/30',
    };

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-card-foreground">{title}</h4>
        <div className="relative h-48">
          {data.map((item, index) => {
            const value = parseFloat(item[valueKey] || 0);
            const volume = parseFloat(item.volume || 0);
            const height = (value / maxValue) * 100;
            const volumeHeight = showVolume ? (volume / maxVolume) * 100 : 0;

            return (
              <div
                key={index}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ 
                  left: `${(index / (data.length - 1)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                {showVolume && (
                  <div
                    className={`w-2 rounded-t ${barLightColors[color] || barLightColors.blue}`}
                    style={{ height: `${volumeHeight}px` }}
                  />
                )}
                <div
                  className={`w-3 rounded-t transition-all ${barColors[color] || barColors.blue}`}
                  style={{ height: `${height}px` }}
                  title={`${formatDate(item.date)}: ${value}${showVolume ? ` / ${formatCurrency(volume)}` : ''}`}
                />
                {index % Math.ceil(data.length / 5) === 0 && (
                  <span className="text-xs text-muted-foreground mt-1">{formatDate(item.date)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Overview Tab
  const renderOverview = () => {
    const aggregated = analytics?.aggregated || {};
    const timeSeries = analytics?.timeSeries || {};
    const comparison = analytics?.comparison || {};
    const changePercentage = comparison?.changePercentage || {};

    // Calculate total investment value from investments table
    let totalInvestmentValue = 0;
    if (investments.length > 0) {
      totalInvestmentValue = investments.reduce((sum, inv) => {
        const amount = parseFloat(
          inv.amountUSDT || 
          inv.amount_usdt || 
          inv.amount || 
          inv.invested_amount || 
          inv.investmentAmount || 
          0
        );
        return sum + amount;
      }, 0);
    } else {
      // Fallback to aggregated data if investments array is empty
      totalInvestmentValue = parseFloat(aggregated?.investments?.totalValue || stats?.totalInvestmentVolume || 0);
    }
    // Use actual counts from fetched data, fallback to stats if not available
    const totalProperties = properties.length > 0 ? properties.length : parseInt(stats?.totalProperties || 0);
    const totalUsers = users.length > 0 ? users.length : parseInt(stats?.totalUsers || aggregated?.users?.total || 0);
    const totalTransactions = transactions.length > 0 ? transactions.length : parseInt(aggregated?.transactions?.total || 0);
    const totalOrganizations = organizations.length > 0 ? organizations.length : parseInt(stats?.totalOrganizations || 0);
    const totalInvestments = parseInt(aggregated?.investments?.count || 0);
    
    // Prepare chart data - use real investment trends
    const investmentTrendData = timeSeries?.investments || [];
    
    // Calculate property type breakdown from properties data
    const propertyTypeCounts = {
      residential: 0,
      commercial: 0,
      'mixed-use': 0,
      other: 0
    };
    
    properties.forEach(property => {
      const propertyType = (property.type || property.property_type || property.propertyType || '').toLowerCase();
      if (propertyType === 'residential') {
        propertyTypeCounts.residential++;
      } else if (propertyType === 'commercial') {
        propertyTypeCounts.commercial++;
      } else if (propertyType === 'mixed-use' || propertyType === 'mixed_use' || propertyType === 'mixeduse') {
        propertyTypeCounts['mixed-use']++;
      } else if (propertyType) {
        propertyTypeCounts.other++;
      }
    });
    
    const residentialCount = propertyTypeCounts.residential;
    const commercialCount = propertyTypeCounts.commercial;
    const mixedUseCount = propertyTypeCounts['mixed-use'];
    const totalPropertyTypes = residentialCount + commercialCount + mixedUseCount;
    
    // Calculate tokens sold per property (total - available)
    const propertiesWithTokensSold = properties.map(property => {
      const totalTokens = parseFloat(
        property.totalTokens || 
        property.total_tokens || 
        property.tokenization_total_tokens || 
        0
      );
      const availableTokens = parseFloat(
        property.availableTokens || 
        property.available_tokens || 
        property.tokenization_available_tokens || 
        0
      );
      const tokensSold = Math.max(0, totalTokens - availableTokens);
      const title = property.title || property.name || `Property ${property.id?.slice(0, 6) || 'Unknown'}`;
      return {
        id: property.id,
        title: title.length > 12 ? title.substring(0, 12) + '...' : title,
        fullTitle: title,
        tokensSold,
        totalTokens,
        availableTokens
      };
    });
    
    // Sort by tokens sold - descending (most sold first)
    const sortedByMostSold = [...propertiesWithTokensSold]
      .filter(p => p.totalTokens > 0) // Only include properties with tokens
      .sort((a, b) => b.tokensSold - a.tokensSold)
      .slice(0, 5); // Top 5 most sold
    
    // Sort by tokens sold - ascending (least sold first)
    const sortedByLeastSold = [...propertiesWithTokensSold]
      .filter(p => p.totalTokens > 0) // Only include properties with tokens
      .sort((a, b) => a.tokensSold - b.tokensSold)
      .slice(0, 5); // Top 5 least sold
    
    // Use the selected view
    const tokensChartData = showTopSellers ? sortedByMostSold : sortedByLeastSold;
    
    // Calculate KYC approved and unapproved counts
    const kycApproved = kycList.filter(kyc => 
      (kyc.status || '').toLowerCase() === 'verified' || 
      (kyc.status || '').toLowerCase() === 'approved'
    ).length;
    
    const kycUnapproved = kycList.filter(kyc => {
      const status = (kyc.status || '').toLowerCase();
      return status === 'pending' || 
             status === 'rejected' || 
             status === 'unapproved' ||
             (!status || status === '');
    }).length;

    // Calculate property status breakdown
    const propertyStatusCounts = {
      active: 0,
      funding: 0,
      construction: 0,
      'coming-soon': 0,
      'sold-out': 0,
      'on-hold': 0,
      completed: 0,
      pending: 0
    };
    
    properties.forEach(property => {
      const status = (property.status || '').toLowerCase();
      if (propertyStatusCounts.hasOwnProperty(status)) {
        propertyStatusCounts[status]++;
      }
    });

    // Calculate investment status breakdown
    const investmentStatusCounts = {
      active: 0,
      pending: 0,
      completed: 0,
      confirmed: 0,
      cancelled: 0
    };
    
    investments.forEach(inv => {
      const status = (inv.status || '').toLowerCase();
      if (status === 'active' || status === 'confirmed') {
        investmentStatusCounts.active++;
      } else if (status === 'pending') {
        investmentStatusCounts.pending++;
      } else if (status === 'completed') {
        investmentStatusCounts.completed++;
      } else if (status === 'cancelled' || status === 'canceled') {
        investmentStatusCounts.cancelled++;
      }
    });

    // Calculate total tokens in circulation
    const totalTokensInCirculation = properties.reduce((sum, prop) => {
      const total = parseFloat(prop.totalTokens || prop.total_tokens || prop.tokenization_total_tokens || 0);
      const available = parseFloat(prop.availableTokens || prop.available_tokens || prop.tokenization_available_tokens || 0);
      return sum + (total - available);
    }, 0);

    // Calculate average ROI across all properties
    const propertiesWithROI = properties.filter(prop => {
      const roi = parseFloat(prop.expectedROI || prop.pricing_expected_roi || prop.roi || 0);
      return roi > 0;
    });
    const averageROI = propertiesWithROI.length > 0
      ? propertiesWithROI.reduce((sum, prop) => {
          const roi = parseFloat(prop.expectedROI || prop.pricing_expected_roi || prop.roi || 0);
          return sum + roi;
        }, 0) / propertiesWithROI.length
      : 0;

    // Calculate total property value
    const totalPropertyValue = properties.reduce((sum, prop) => {
      return sum + parseFloat(
        prop.totalValueUSDT || 
        prop.pricing_total_value || 
        prop.purchasePriceUSDT || 
        prop.totalValue || 
        0
      );
    }, 0);

    // Calculate unique investors
    const uniqueInvestors = new Set();
    investments.forEach(inv => {
      const userId = inv.userId || inv.user_id || inv.user?.id;
      if (userId) uniqueInvestors.add(userId);
    });

    // Calculate recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTransactions = transactions.filter(txn => {
      const txnDate = new Date(txn.createdAt || txn.created_at || txn.date || 0);
      return txnDate >= sevenDaysAgo;
    }).length;

    // Calculate active properties (active + funding)
    const activeProperties = propertyStatusCounts.active + propertyStatusCounts.funding;

    // Get rewards data
    const rewards = rewardsData?.data?.rewards || 
                   rewardsData?.data?.data?.rewards || 
                   rewardsData?.data || 
                   (Array.isArray(rewardsData) ? rewardsData : []);

    // Transform API activities to match the UI format
    // Handle different response structures
    let activities = [];
    if (activitiesData) {
      if (Array.isArray(activitiesData)) {
        activities = activitiesData;
      } else if (activitiesData.activities) {
        activities = activitiesData.activities;
      } else if (activitiesData.data?.activities) {
        activities = activitiesData.data.activities;
      } else if (activitiesData.data && Array.isArray(activitiesData.data)) {
        activities = activitiesData.data;
      }
      console.log('Parsed activities:', activities.length, activities);
    }
    // Helper function to convert technical endpoints to user-friendly titles
    const getFriendlyTitle = (activity) => {
      const action = activity.action || '';
      const endpoint = activity.endpoint || '';
      const method = activity.method || '';
      
      // If action is already user-friendly, use it
      if (action && !action.includes('/') && !action.includes('POST') && !action.includes('PATCH') && !action.includes('GET') && !action.includes('PUT') && !action.includes('DELETE')) {
        return action;
      }
      
      // Handle specific endpoints
      if (endpoint.includes('/api/mobile/auth/login') || (method === 'POST' && endpoint.includes('/auth/login'))) {
        return 'Login in Mobile App';
      }
      
      if (endpoint.includes('/api/mobile/auth/register') || (method === 'POST' && endpoint.includes('/auth/register'))) {
        return 'User Registered via Mobile App';
      }
      
      if (endpoint.includes('/property-requests') && method === 'PATCH') {
        return 'Property Request Updated';
      }
      
      if (endpoint.includes('/property-requests') && method === 'POST') {
        return 'New Property Request';
      }
      
      if (endpoint.includes('/kyc') && method === 'POST') {
        return 'KYC Submitted';
      }
      
      if (endpoint.includes('/kyc') && method === 'PATCH') {
        return 'KYC Status Updated';
      }
      
      if (endpoint.includes('/investments') && method === 'POST') {
        return 'New Investment';
      }
      
      if (endpoint.includes('/transactions') && method === 'POST') {
        return 'Transaction Created';
      }
      
      if (endpoint.includes('/properties') && method === 'PATCH') {
        return 'Property Updated';
      }
      
      if (endpoint.includes('/properties') && method === 'POST') {
        return 'Property Created';
      }
      
      if (endpoint.includes('/organizations') && method === 'PATCH') {
        return 'Organization Updated';
      }
      
      // Generic fallbacks based on method
      if (method === 'POST' && endpoint.includes('/auth')) {
        return 'Authentication Activity';
      }
      
      if (method === 'PATCH') {
        return 'Resource Updated';
      }
      
      if (method === 'POST') {
        return 'Resource Created';
      }
      
      if (method === 'DELETE') {
        return 'Resource Deleted';
      }
      
      // Final fallback
      return 'Activity';
    };

    const sortedActivities = activities.map(activity => {
      // Determine icon and color based on action/endpoint
      let icon = Activity;
      let color = 'blue';
      let onClick = () => {};

      // Extract IDs from activity for filtering
      const userId = activity.userId;
      const propertyId = activity.requestBody?.propertyId || activity.responseData?.propertyId;
      const orgAdminId = activity.orgAdminId;
      
      // Extract transaction displayCode from response data (stored as JSONB in activity entity)
      // Response structure: { success: true, data: { investment, transaction, property, user, ... } }
      let transactionDisplayCode = null;
      const responseData = activity.responseData;
      if (responseData) {
        // Check various response structures
        if (responseData.data?.transaction?.displayCode) {
          transactionDisplayCode = responseData.data.transaction.displayCode;
        } else if (responseData.transaction?.displayCode) {
          transactionDisplayCode = responseData.transaction.displayCode;
        } else if (responseData.data?.displayCode && typeof responseData.data.displayCode === 'string' && responseData.data.displayCode.startsWith('TXN-')) {
          transactionDisplayCode = responseData.data.displayCode;
        } else if (responseData.displayCode && typeof responseData.displayCode === 'string' && responseData.displayCode.startsWith('TXN-')) {
          transactionDisplayCode = responseData.displayCode;
        }
        
        // Debug logging
        if (activity.action === 'New Investment' || activity.action === 'Investment Created') {
          console.log('Investment activity transaction code:', transactionDisplayCode, 'from responseData:', responseData);
        }
      }
      
      // Get user displayCode for filtering (if userId exists, we'll look it up)
      let userDisplayCode = null;
      if (userId && users.length > 0) {
        const user = users.find(u => u.id === userId);
        if (user) {
          userDisplayCode = user.displayCode;
        }
      }

      if (activity.action === 'Property Updated' || activity.action === 'Property Created') {
        icon = Edit;
        color = 'purple';
        onClick = () => {
          if (propertyId) {
            setTabFilters({ properties: { search: propertyId } });
          }
          setActiveTab('properties');
        };
      } else if (activity.action === 'New Investment' || activity.action === 'Investment Created') {
        icon = TrendingUp;
        color = 'green';
        onClick = () => {
          // Route to investments page - no filters
          setActiveTab('investments');
        };
      } else if (activity.action === 'deposit' || activity.action === 'Deposit') {
        icon = DollarSign;
        color = 'blue';
        onClick = () => {
          // Simply route to transactions - no filters
          setActiveTab('transactions');
        };
      } else if (activity.action === 'withdrawal' || activity.action === 'Withdrawal') {
        icon = DollarSign;
        color = 'orange';
        onClick = () => {
          // Simply route to transactions - no filters
          setActiveTab('transactions');
        };
      } else if (activity.action === 'transaction' || activity.action === 'Transaction') {
        icon = DollarSign;
        color = 'blue';
        onClick = () => {
          // Simply route to transactions - no filters
          setActiveTab('transactions');
        };
      } else if (activity.action === 'New User Registered' || activity.action === 'User Updated') {
        icon = Users;
        color = 'green';
        onClick = () => {
          if (userDisplayCode) {
            setTabFilters({ users: { search: userDisplayCode } });
          } else if (userId) {
            setTabFilters({ users: { search: userId } });
          }
          setActiveTab('users');
        };
      } else if (activity.action === 'User Logged In' || activity.endpoint?.includes('/api/mobile/auth/login')) {
        icon = Users;
        color = 'blue';
        onClick = () => {
          // If we have user info, navigate to users page with filter
          if (userDisplayCode) {
            setTabFilters({ users: { search: userDisplayCode } });
            setActiveTab('users');
          } else if (userId) {
            setTabFilters({ users: { search: userId } });
            setActiveTab('users');
          }
        };
      } else if (activity.endpoint?.includes('/property-requests') && activity.method === 'PATCH') {
        icon = Edit;
        color = 'purple';
        onClick = () => {
          setActiveTab('property-requests');
        };
      } else if (activity.action === 'KYC Submitted' || (activity.endpoint?.includes('/kyc') && activity.method === 'POST')) {
        icon = Shield;
        color = 'green';
        onClick = () => {
          if (userId) {
            setTabFilters({ kyc: { userId } });
          }
          setActiveTab('kyc');
        };
      } else if (activity.action === 'Reward Distributed') {
        icon = Gift;
        color = 'purple';
        onClick = () => {
          // Extract propertyId from requestBody or description
          const propId = propertyId || 
                        (activity.requestBody?.propertyId) ||
                        (activity.description?.match(/for\s+([A-Z0-9-]+)/i)?.[1]);
          if (propId) {
            setTabFilters({ properties: { search: propId } });
          }
          setActiveTab('properties');
        };
      }

      // Extract propertyId from various sources for rewards
      let extractedPropertyId = propertyId;
      if (!extractedPropertyId && activity.action === 'Reward Distributed') {
        extractedPropertyId = activity.requestBody?.propertyId || 
                             activity.responseData?.propertyId ||
                             (activity.description?.match(/for\s+([A-Z0-9-]+)/i)?.[1]);
      }

      // Helper to check if description is technical
      const isTechnicalDescription = (desc) => {
        if (!desc) return true;
        return desc.startsWith('/') ||
               desc.startsWith('POST') ||
               desc.startsWith('PATCH') ||
               desc.startsWith('GET') ||
               desc.startsWith('PUT') ||
               desc.startsWith('DELETE') ||
               desc.includes('/api/') ||
               desc === 'Activity' ||
               desc === activity.endpoint;
      };

      // For login activities, ensure we show user name in description
      let finalDescription = activity.description;
      if (activity.action === 'User Logged In' || activity.endpoint?.includes('/api/mobile/auth/login')) {
        // Prefer userName from activity, then description, then user from responseData
        if (activity.userName) {
          finalDescription = activity.userName;
        } else if (activity.description && !isTechnicalDescription(activity.description)) {
          finalDescription = activity.description;
        } else if (activity.responseData?.user?.fullName) {
          finalDescription = activity.responseData.user.fullName;
        } else if (activity.responseData?.user?.email) {
          finalDescription = activity.responseData.user.email;
        } else if (activity.responseData?.admin?.fullName) {
          finalDescription = activity.responseData.admin.fullName;
        } else if (activity.responseData?.admin?.email) {
          finalDescription = activity.responseData.admin.email;
        } else {
          // Fallback based on userType
          finalDescription = activity.userType === 'org_admin' ? 'ORG Admin' : 'User';
        }
      } else if (activity.action === 'KYC Submitted' || (activity.endpoint?.includes('/kyc') && activity.method === 'POST')) {
        // Extract user name from KYC submission description
        if (activity.description && activity.description.includes('submitted KYC')) {
          finalDescription = activity.description.replace(' submitted KYC', '').trim();
        } else if (activity.userName) {
          finalDescription = activity.userName;
        } else if (activity.responseData?.user?.fullName) {
          finalDescription = activity.responseData.user.fullName;
        } else if (activity.responseData?.user?.email) {
          finalDescription = activity.responseData.user.email;
        } else {
          finalDescription = 'User';
        }
      } else if (activity.action === 'New User Registered') {
        // For new user registrations, show user name
        if (activity.userName) {
          finalDescription = activity.userName;
        } else if (activity.description && !isTechnicalDescription(activity.description)) {
          finalDescription = activity.description;
        } else if (activity.responseData?.user?.fullName) {
          finalDescription = activity.responseData.user.fullName;
        } else if (activity.responseData?.user?.email) {
          finalDescription = activity.responseData.user.email;
        } else {
          finalDescription = 'New User';
        }
      } else {
        // For other activities, filter out technical endpoints
        if (activity.description && !isTechnicalDescription(activity.description)) {
          finalDescription = activity.description;
        } else if (activity.userName) {
          finalDescription = activity.userName;
        } else if (activity.responseData?.user?.fullName) {
          finalDescription = activity.responseData.user.fullName;
        } else if (activity.responseData?.user?.email) {
          finalDescription = activity.responseData.user.email;
        } else if (activity.action && !isTechnicalDescription(activity.action)) {
          finalDescription = activity.action;
        } else {
          // Use friendly title as fallback, but make it more descriptive
          const title = getFriendlyTitle(activity);
          if (title === 'Activity') {
            finalDescription = activity.userType === 'org_admin' ? 'ORG Admin Activity' : 
                             activity.userType === 'admin' ? 'Admin Activity' : 
                             'User Activity';
          } else {
            finalDescription = title;
          }
        }
      }

      // Get friendly title
      const friendlyTitle = getFriendlyTitle(activity);

      return {
        id: activity.id,
        type: activity.action?.toLowerCase().replace(/\s+/g, '_') || 'activity',
        title: friendlyTitle,
        description: finalDescription,
        amount: activity.amount ? parseFloat(activity.amount.replace(/[^0-9.-]/g, '')) : 0,
        date: new Date(activity.createdAt),
        icon,
        color,
        onClick,
        userType: activity.userType,
        userName: activity.userName,
        userId: activity.userId,
        propertyId: extractedPropertyId,
        requestBody: activity.requestBody,
        responseData: activity.responseData,
      };
    });

    // Format date helper for activity feed
    const formatActivityDate = (date) => {
      if (!date) return 'N/A';
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    // Format date for header
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    return (


      <div className="w-full p-4 flex flex-col overflow-hidden dark:from-gray-950 dark:via-blue-950/30 dark:to-purple-950/20">
        {/* Header */}
        <div className="flex justify-between items-center mb-3 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">{currentDate}</p>
          </div>
        </div>

        {/* Top Row: Large Blue Card + 4 Small Cards */}
        <div className="grid grid-cols-12 gap-3 mb-3 flex-shrink-0" style={{ minHeight: '140px', maxHeight: '180px' }}>
          {/* Total Investment - Large Blue Card */}
          <div 
            onClick={() => setActiveTab('investments')}
            className="col-span-4 bg-gradient-to-br from-blue-600/80 to-blue-700/80 dark:from-blue-700/80 dark:to-blue-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 p-4 rounded-3xl shadow-lg text-white flex flex-col min-h-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs opacity-90 font-medium">Total Investment</div>
                  <div className="text-[10px] opacity-75 mt-0.5">All confirmed investments</div>
                </div>
              </div>
              <div className="px-2 py-0.5 bg-green-500 rounded-full text-[10px] font-bold">
                +{changePercentage?.investments?.toFixed(1) || '100.0'}%
              </div>
            </div>
            <div className="text-3xl font-extrabold mt-1">
              ${totalInvestmentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] opacity-80">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {uniqueInvestors.size} investors
              </span>
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {investmentStatusCounts.active} active
              </span>
            </div>
            <div className="text-[9px] opacity-70 mt-1">Click to manage investments</div>
          </div>

          {/* Total Properties */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('properties')}
            className="col-span-2 p-3 rounded-3xl flex flex-col justify-between min-h-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="px-1.5 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md text-[10px] font-bold">
                {activeProperties} active
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-medium">Total Properties</div>
              <div className="text-xl font-extrabold text-card-foreground mt-0.5">
                {totalProperties}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                ${(totalPropertyValue / 1000000).toFixed(1)}M total value
              </div>
            </div>
          </Card>

          {/* Total Users */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('users')}
            className="col-span-2 p-3 rounded-3xl flex flex-col justify-between min-h-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="p-1.5 bg-green-500/10 rounded-lg">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <div className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold">
                {uniqueInvestors.size} investors
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-medium">Total Users</div>
              <div className="text-xl font-extrabold text-card-foreground mt-0.5">
                {totalUsers}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {kycApproved} verified
              </div>
            </div>
          </Card>

          {/* Total Organizations */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('organizations')}
            className="col-span-2 p-3 rounded-3xl flex flex-col justify-between min-h-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <Building2 className="w-4 h-4 text-purple-600" />
              </div>
              <div className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md text-[10px] font-bold">
                Active
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-medium">Organizations</div>
              <div className="text-xl font-extrabold text-card-foreground mt-0.5">
                {totalOrganizations}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                Managing properties
              </div>
            </div>
          </Card>

          {/* Total Transactions */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('transactions')}
            className="col-span-2 p-3 rounded-3xl flex flex-col justify-between min-h-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="p-1.5 bg-orange-500/10 rounded-lg">
                <Activity className="w-4 h-4 text-orange-600" />
              </div>
              <div className="px-1.5 py-0.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md text-[10px] font-bold">
                {recentTransactions} this week
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground font-medium">Transactions</div>
              <div className="text-xl font-extrabold text-card-foreground mt-0.5">
                {totalTransactions}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                All time total
              </div>
            </div>
          </Card>
                </div>

        {/* Middle Row - Additional Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-3 flex-shrink-0">
          {/* Average ROI */}
          <Card variant="primary" className="p-3 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              <div className="text-[9px] text-muted-foreground font-medium">Avg ROI</div>
            </div>
            <div className="text-lg font-bold text-card-foreground">{averageROI.toFixed(1)}%</div>
            <div className="text-[8px] text-muted-foreground mt-0.5">Across all properties</div>
          </Card>

          {/* Total Tokens */}
          <Card variant="primary" className="p-3 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-3.5 h-3.5 text-yellow-600" />
              <div className="text-[9px] text-muted-foreground font-medium">Tokens Sold</div>
            </div>
            <div className="text-lg font-bold text-card-foreground">
              {(totalTokensInCirculation).toFixed(2)}
            </div>
            <div className="text-[8px] text-muted-foreground mt-0.5">In circulation</div>
          </Card>

          {/* Active Investments */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('investments')}
            className="p-3 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-3.5 h-3.5 text-green-600" />
              <div className="text-[9px] text-muted-foreground font-medium">Active</div>
            </div>
            <div className="text-lg font-bold text-card-foreground">{investmentStatusCounts.active}</div>
            <div className="text-[8px] text-muted-foreground mt-0.5">Investments</div>
          </Card>

          {/* Pending Investments */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('investments')}
            className="p-3 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <div className="text-[9px] text-muted-foreground font-medium">Pending</div>
            </div>
            <div className="text-lg font-bold text-card-foreground">{investmentStatusCounts.pending}</div>
            <div className="text-[8px] text-muted-foreground mt-0.5">Requires action</div>
          </Card>

          {/* Properties Funding */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('properties')}
            className="p-3 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <div className="text-[9px] text-muted-foreground font-medium">Funding</div>
            </div>
            <div className="text-lg font-bold text-card-foreground">{propertyStatusCounts.funding}</div>
            <div className="text-[8px] text-muted-foreground mt-0.5">Properties</div>
          </Card>

          {/* KYC Pending */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('kyc')}
            className="p-3 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-red-600" />
              <div className="text-[9px] text-muted-foreground font-medium">KYC Pending</div>
            </div>
            <div className="text-lg font-bold text-card-foreground">{kycUnapproved}</div>
            <div className="text-[8px] text-muted-foreground mt-0.5">Needs review</div>
          </Card>
        </div>

        {/* Bottom Row - 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden pb-5">
          {/* Tokens Sold Chart - Flippable */}
          <Card variant="primary" className="p-4 rounded-3xl flex flex-col min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-card-foreground">
                {showTopSellers ? '🔥 Top 5 Most Tokens Sold' : '📉 Top 5 Least Tokens Sold'}
              </h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopSellers(!showTopSellers);
                }}
                className="text-[10px] px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
              >
                {showTopSellers ? 'Show Least' : 'Show Most'}
              </button>
            </div>
            
            <div className="flex gap-2 items-end flex-1 min-h-0">
              {tokensChartData.length > 0 ? tokensChartData.map((property, i) => {
                const maxValue = Math.max(...tokensChartData.map(p => p.tokensSold), 1);
                const height = maxValue > 0 ? Math.max(5, Math.min(100, (property.tokensSold / maxValue) * 100)) : 5;
                
                return (
                  <div key={property.id || i} className="flex-1 flex flex-col items-center h-full min-w-0">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg flex items-end relative group h-full">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          showTopSellers 
                            ? 'bg-gradient-to-t from-green-600 to-green-400 dark:from-green-700 dark:to-green-500' 
                            : 'bg-gradient-to-t from-orange-600 to-orange-400 dark:from-orange-700 dark:to-orange-500'
                        }`}
                        style={{ height: `${height}%` }}
                      ></div>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 dark:bg-gray-700 text-white text-[9px] px-2 py-1 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                        <div className="font-semibold">{property.fullTitle}</div>
                        <div>{property.tokensSold.toLocaleString()} sold / {property.totalTokens.toLocaleString()} total</div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  No properties with tokens
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-[8px] text-muted-foreground truncate">
              {tokensChartData.map((property, i) => (
                <span key={i} className="flex-1 text-center truncate px-0.5" title={property.fullTitle}>
                  {property.title}
                </span>
              ))}
            </div>
            <div 
              onClick={() => setActiveTab('properties')}
              className="mt-2 text-center text-[10px] text-blue-500 hover:text-blue-600 cursor-pointer"
            >
              View All Properties →
            </div>
          </Card>

          {/* Investment Statistic - Donut Chart */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('investments')}
            className="flex flex-col p-4 md:p-5 w-full h-full min-h-[360px] cursor-pointer hover:scale-[1.02] transition-all duration-200 rounded-3xl"
          >
  {/* Header */}
  <div className="flex justify-between items-center mb-4">
    <div>
      <h3 className="text-sm md:text-base font-bold text-card-foreground">
        Property Types
      </h3>
      <p className="text-[10px] text-muted-foreground mt-0.5">Distribution by category</p>
    </div>
    <div className="text-[10px] md:text-xs text-muted-foreground">{totalPropertyTypes} total</div>
  </div>

  {/* Content Wrapper */}
  <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">

    {/* Chart Container */}
    <div
      className="
        relative 
        aspect-square   /* <-- Makes width & height ALWAYS equal */
        w-28 h-28 
        sm:w-32 sm:h-32 
        md:w-40 md:h-40 
        lg:w-48 lg:h-48 
        flex-shrink-0
      "
    >
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Background */}
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke="#e5e7eb"
          className="dark:stroke-gray-700"
          strokeWidth="3.8"
        />

        {/* Blue (Residential) */}
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke="url(#blueGrad)"
          strokeWidth="3.8"
          strokeDasharray={`${totalPropertyTypes > 0 ? (residentialCount / totalPropertyTypes * 100) : 0} ${totalPropertyTypes > 0 ? (100 - residentialCount / totalPropertyTypes * 100) : 100}`}
          strokeLinecap="round"
        />

        {/* Green (Commercial) */}
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke="url(#greenGrad)"
          strokeWidth="3.8"
          strokeDasharray={`${totalPropertyTypes > 0 ? (commercialCount / totalPropertyTypes * 100) : 0} ${totalPropertyTypes > 0 ? (100 - commercialCount / totalPropertyTypes * 100) : 100}`}
          strokeLinecap="round"
          strokeDashoffset={`-${totalPropertyTypes > 0 ? (residentialCount / totalPropertyTypes * 100) : 0}`}
        />

        {/* Gray (Mixed Use) */}
        <circle
          cx="18" cy="18" r="15.9155"
          fill="none"
          stroke="#9ca3af"
          className="dark:stroke-gray-500"
          strokeWidth="3.8"
          strokeDasharray={`${totalPropertyTypes > 0 ? (mixedUseCount / totalPropertyTypes * 100) : 0} ${totalPropertyTypes > 0 ? (100 - mixedUseCount / totalPropertyTypes * 100) : 100}`}
          strokeLinecap="round"
          strokeDashoffset={`-${totalPropertyTypes > 0 ? ((residentialCount + commercialCount) / totalPropertyTypes * 100) : 0}`}
        />
      </svg>
    </div>

    {/* Legend Section */}
    <div className="flex-1 w-full">
      <div className="space-y-2 text-[11px] md:text-xs">
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Residential
          </span>
          <span className="font-bold text-card-foreground">{residentialCount}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Commercial
          </span>
          <span className="font-bold text-card-foreground">{commercialCount}</span>
        </div>

        {mixedUseCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
              Mixed-Use
            </span>
            <span className="font-bold text-card-foreground">{mixedUseCount}</span>
          </div>
        )}

      </div>
    </div>
  </div>
          </Card>

          {/* Customer Growth - KYC Status */}
          <Card
            variant="primary"
            onClick={() => setActiveTab('kyc')}
            className="flex flex-col p-4 md:p-5 w-full h-full min-h-[380px] cursor-pointer hover:scale-[1.02] transition-all duration-200 rounded-3xl"
          >
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <div>
                <h3 className="text-sm md:text-base font-bold text-card-foreground">KYC Status</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">User verification status</p>
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground">{kycList.length} total</div>
            </div>
            
            <div className="space-y-3 md:space-y-4 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 md:gap-4 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-green-500/30">
                  <span className="font-bold text-card-foreground text-sm md:text-base lg:text-lg">{kycApproved}</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs md:text-sm text-card-foreground font-semibold">Approved</div>
                  <div className="text-[10px] text-muted-foreground">
                    {kycList.length > 0 ? ((kycApproved / kycList.length) * 100).toFixed(0) : 0}% verified
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 md:gap-4 p-3 rounded-lg hover:bg-accent/20 transition-colors">
                <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-red-500/30">
                  <span className="font-bold text-card-foreground text-sm md:text-base lg:text-lg">{kycUnapproved}</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs md:text-sm text-card-foreground font-semibold">Pending Review</div>
                  <div className="text-[10px] text-muted-foreground">
                    {kycUnapproved > 0 ? 'Needs attention' : 'All clear'}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-[9px] text-muted-foreground text-center">Click to manage KYC</p>
            </div>
          </Card>
        </div>

        {/* Recent Activity Section - At the Bottom */}
        <div className="mt-3 flex-shrink-0">
          <Card variant="primary" className="rounded-3xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">Recent Activity</h3>
                  <p className="text-[10px] text-muted-foreground">Latest updates across the platform</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info" className="text-xs">
                  {activityCountData?.count || sortedActivities.length} activities
                </Badge>
                {sortedActivities.length > 0 && (
                  <Button
                    onClick={handleClearAll}
                    disabled={deleteAllActivitiesMutation.isLoading}
                    variant="outline"
                    className="text-xs px-3 py-1.5 h-auto bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    {deleteAllActivitiesMutation.isLoading ? 'Clearing...' : 'Clear All'}
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setActivityFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activityFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActivityFilter('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activityFilter === 'admin'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setActivityFilter('org_admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activityFilter === 'org_admin'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                ORG Admin
              </button>
              <button
                onClick={() => setActivityFilter('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activityFilter === 'user'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Users
              </button>
            </div>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {activitiesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm">Loading activities...</p>
                </div>
              ) : sortedActivities.length > 0 ? (
                sortedActivities.map((activity) => {
                  const Icon = activity.icon;
                  const colorClasses = {
                    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                    green: 'bg-green-500/10 text-green-600 border-green-500/20',
                    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                    red: 'bg-red-500/10 text-red-600 border-red-500/20'
                  };
                  
                  return (
                    <div
                      key={activity.id}
                      onClick={activity.onClick}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:bg-accent/30 hover:border-primary/30 cursor-pointer transition-all duration-200 group"
                    >
                      <div className={`p-2 rounded-lg border ${colorClasses[activity.color] || colorClasses.blue} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-card-foreground truncate">
                              {activity.title}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {activity.description}
                            </p>
                          </div>
                          {activity.amount > 0 && (
                            <div className="text-xs font-bold text-card-foreground whitespace-nowrap">
                              ${activity.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {formatActivityDate(activity.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">Activity will appear here as updates occur</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
 
    );
  };

  const renderTabContent = () => {
    console.log('🔄 Active Tab:', activeTab);
    
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'properties':
        console.log('📦 Rendering PropertiesManagement');
        return <PropertiesManagement initialFilters={tabFilters.properties} onFiltersSet={() => setTabFilters({ ...tabFilters, properties: undefined })} />;
      case 'property-requests':
        return <PropertyRequestsManagement />;
      case 'users':
        return <UsersManagement initialFilters={tabFilters.users} onFiltersSet={() => setTabFilters({ ...tabFilters, users: undefined })} />;
      case 'bank-transfers':
        return <BankTransferRequests initialFilters={tabFilters['bank-transfers']} onFiltersSet={() => setTabFilters({ ...tabFilters, 'bank-transfers': undefined })} />;
      case 'transactions':
        return <TransactionsManagement initialFilters={tabFilters.transactions} onFiltersSet={() => setTabFilters({ ...tabFilters, transactions: undefined })} />;
      case 'investments':
        return <InvestmentsManagement />;
      case 'organizations':
        return <OrganizationsManagement />;
      case 'tokens':
        return <TokensManagement />;
      case 'reports':
        return <ReportsManagement />;
      case 'kyc':
        const kycUrlParams = new URLSearchParams(window.location.search);
        const kycUserId = kycUrlParams.get('userId');
        return <KYCManagement initialUserId={kycUserId} />;
      case 'notifications':
        const urlParams = new URLSearchParams(window.location.search);
        const viewParam = urlParams.get('view');
        return <NotificationsManagement activeView={viewParam === 'all' ? 'view' : 'send'} />;
      case 'settings':
        return <AdminSettings />;
      default:
        return renderOverview();
    }
  };

  if (dashboardLoading && !dashboardError) {
    return (
      <div className="flex h-screen bg-background">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 flex items-center justify-center">
          <Loader />
        </main>
      </div>
    );
  }

  return (
 
    <div 
    style={{ 
      backgroundImage: theme === 'dark' ? 'url(/250.jpg)' : 'url(/249.jpg)', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundRepeat: 'no-repeat' 
    }}
    className="flex h-screen bg-background overflow-hidden" >
      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
{/* Main Content */}
<main className="flex-1 overflow-auto">

  {/* Glassy Header */}
  <div
    className="
      sticky top-0 z-20
      bg-white/10 dark:bg-black/20
      backdrop-blur-xl
      border-b border-white/30 dark:border-white/10
    "
  >
    <div className="px-10 py-4 ml-4 ">
      <div className="flex justify-between items-center">

        {/* Left Section */}
        <div className="flex items-center space-x-4">

          <div
            className="
              p-2 rounded-lg shadow-lg
              
              backdrop-blur-md
            "
          >
            <Shield className="w-6 h-6 text-blue-900/80" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-black/80 dark:text-white/80">
              Admin Panel
            </h1>
            <p className="text-sm text-black/70 dark:text-white/70">
              Real Estate Management
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">

          <div className="text-sm text-black/80 dark:text-white/80">
            Welcome,{" "}
            <span className="font-medium text-primary">
              {adminUser?.name || "Admin"}
            </span>
          </div>

          <ThemeToggle />
          <div ref={notificationIconRef} className="relative">
            <SafeAdminNotificationIcon 
              onToggle={() => {
                console.log('🔔 Toggling notifications, current state:', showNotifications);
                setShowNotifications(!showNotifications);
              }} 
            />
            <NotificationPopover
              isOpen={showNotifications}
              onClose={() => {
                console.log('🔔 Closing notifications popover');
                setShowNotifications(false);
              }}
              anchorRef={notificationIconRef}
            />
          </div>

          <Button
            variant="outline"
            onClick={logout}
            className="
              flex items-center space-x-2
              text-destructive hover:text-destructive
              bg-white/10 hover:bg-white/20
              border-white/20 dark:border-white/10
              backdrop-blur-md
            "
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>

      </div>
    </div>
  </div>




        {/* Page Content */}
        <div className="p-8">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
