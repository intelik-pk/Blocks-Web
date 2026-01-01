import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Coins, 
  Search,
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  BarChart3,
  PieChart,
  Calendar,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  Edit,
  ArrowLeft,
  ChevronRight,
  X,
  Filter,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI, organizationsAPI, investmentsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import { cn } from '../../utils/cn';
import InputTwo from '../../components/ui/InputTwo';

const TokensManagement = () => {
  const { isAuthenticated } = useAdminAuth();
  
  // Drill-down navigation state
  const [viewLevel, setViewLevel] = useState('ORG'); // 'ORG' | 'PROPERTIES' | 'PROPERTY'
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  
  // Legacy state for backward compatibility (if needed)
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    valuation: true,
    supply: true,
    ownership: true,
    yield: true,
    performance: true,
    audit: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'totalTokens', 'boughtTokens'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [openFilterPanel, setOpenFilterPanel] = useState(null);
  const filterPanelRef = React.useRef(null);
  
  // Expanded organizations state for collapsible rows
  const [expandedOrgIds, setExpandedOrgIds] = useState(new Set());
  
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
  
  // Toggle organization expansion
  const toggleOrgExpansion = (orgId) => {
    setExpandedOrgIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orgId)) {
        newSet.delete(orgId);
      } else {
        newSet.add(orgId);
      }
      return newSet;
    });
  };

  // Fetch all organizations
  const { data: organizationsData, isLoading: isLoadingOrgs, error: orgsError } = useQuery(
    ['admin-organizations'],
    () => adminAPI.getOrganizations({ limit: 1000 }),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Fetch all investments
  const { data: investmentsData, isLoading: isLoadingInvestments } = useQuery(
    ['all-investments-for-tokens'],
    () => investmentsAPI.getAll(),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Fetch all properties
  const { data: propertiesData } = useQuery(
    ['all-properties-for-tokens'],
    () => adminAPI.getProperties({ limit: 1000 }),
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Calculate token statistics for each organization
  const tokensData = useMemo(() => {
    if (!organizationsData?.data || !propertiesData?.data || !investmentsData?.data) {
      return [];
    }

    const organizations = Array.isArray(organizationsData.data)
      ? organizationsData.data
      : organizationsData.data?.data?.organizations || organizationsData.data?.organizations || [];

    const properties = Array.isArray(propertiesData.data)
      ? propertiesData.data
      : propertiesData.data?.data?.properties || propertiesData.data?.properties || [];

    const investments = Array.isArray(investmentsData.data)
      ? investmentsData.data
      : investmentsData.data?.data || investmentsData.data || [];

    return organizations.map(org => {
      const orgId = org.id || org.displayCode;
      
      // Get all properties for this organization
      const orgProperties = properties.filter(prop => 
        prop.organizationId === orgId || 
        prop.organization?.id === orgId || 
        prop.organization?.displayCode === orgId
      );

      // Calculate total tokens from all properties
      const totalTokens = orgProperties.reduce((sum, prop) => {
        const tokens = parseFloat(prop.totalTokens || prop.tokenization_total_tokens || 0);
        return sum + tokens;
      }, 0);

      // Calculate bought tokens (tokens purchased from investments in this org's properties)
      const boughtTokens = investments
        .filter(inv => {
          const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
          return orgProperties.some(prop => 
            (prop.id === invPropertyId || prop.displayCode === invPropertyId) &&
            (inv.status === 'confirmed' || inv.status === 'active')
          );
        })
        .reduce((sum, inv) => {
          const tokens = parseFloat(inv.tokensPurchased || 0);
          return sum + tokens;
        }, 0);

      // Calculate available tokens
      const availableTokens = totalTokens - boughtTokens;

      // Calculate total investment (USD) from investments in this org's properties
      const totalInvestment = investments
        .filter(inv => {
          const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
          return orgProperties.some(prop => 
            (prop.id === invPropertyId || prop.displayCode === invPropertyId) &&
            (inv.status === 'confirmed' || inv.status === 'active')
          );
        })
        .reduce((sum, inv) => {
          const amount = parseFloat(inv.amountUSDT || inv.amount || 0);
          return sum + amount;
        }, 0);

      // Calculate funding percentage
      const fundingPercentage = totalTokens > 0 ? (boughtTokens / totalTokens) * 100 : 0;

      return {
        id: org.id,
        displayCode: org.displayCode,
        name: org.name || 'Unknown Organization',
        totalTokens: totalTokens,
        boughtTokens: boughtTokens,
        availableTokens: availableTokens,
        totalInvestment: totalInvestment,
        fundingPercentage: fundingPercentage,
        propertyCount: orgProperties.length,
        logoUrl: org.logoUrl || null,
        orgProperties: orgProperties.map(prop => {
          const propTokens = parseFloat(prop.totalTokens || prop.tokenization_total_tokens || 0);
          const propBoughtTokens = investments
            .filter(inv => {
              const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
              return (prop.id === invPropertyId || prop.displayCode === invPropertyId) &&
                     (inv.status === 'confirmed' || inv.status === 'active');
            })
            .reduce((sum, inv) => sum + parseFloat(inv.tokensPurchased || 0), 0);
          const propAvailableTokens = propTokens - propBoughtTokens;
          const propFundingPercentage = propTokens > 0 ? (propBoughtTokens / propTokens) * 100 : 0;
          
          return {
            id: prop.id,
            displayCode: prop.displayCode,
            name: prop.title || prop.name || 'Unknown Property',
            tokensAllocated: propTokens,
            tokensSold: propBoughtTokens,
            availableTokens: propAvailableTokens,
            fundingPercentage: propFundingPercentage,
            status: prop.status || 'active'
          };
        })
      };
    });
  }, [organizationsData, propertiesData, investmentsData]);

  // Calculate individual property tokens (for Token Details view)
  const individualTokens = useMemo(() => {
    if (!propertiesData?.data || !investmentsData?.data) {
      return [];
    }

    const properties = Array.isArray(propertiesData.data)
      ? propertiesData.data
      : propertiesData.data?.data?.properties || propertiesData.data?.properties || [];

    const investments = Array.isArray(investmentsData.data)
      ? investmentsData.data
      : investmentsData.data?.data || investmentsData.data || [];

    return properties
      .filter(prop => {
        const totalTokens = parseFloat(prop.totalTokens || prop.tokenization_total_tokens || 0);
        return totalTokens > 0; // Only include properties with tokens
      })
      .map(prop => {
        const totalTokens = parseFloat(prop.totalTokens || prop.tokenization_total_tokens || 0);
        const availableTokens = parseFloat(prop.availableTokens || prop.tokenization_available_tokens || 0);
        const pricePerToken = parseFloat(prop.pricePerTokenUSDT || prop.price_per_token_usdt || 0);
        const totalValue = parseFloat(prop.totalValueUSDT || prop.total_value_usdt || 0);
        
        // Get investments for this property
        const propInvestments = investments.filter(inv => {
          const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
          return (prop.id === invPropertyId || prop.displayCode === invPropertyId) &&
                 (inv.status === 'confirmed' || inv.status === 'active');
        });

        const soldTokens = totalTokens - availableTokens;
        const totalInvestment = propInvestments.reduce((sum, inv) => {
          return sum + parseFloat(inv.amountUSDT || inv.amount || 0);
        }, 0);

        // Get unique investors
        const uniqueInvestors = new Set();
        propInvestments.forEach(inv => {
          const userId = inv.userId || inv.user_id || inv.user?.id;
          if (userId) uniqueInvestors.add(userId);
        });

        return {
          id: prop.id,
          displayCode: prop.displayCode,
          tokenName: `${prop.title || 'Property'} Token`,
          propertyName: prop.title || 'Unknown Property',
          propertyId: prop.id,
          organizationId: prop.organizationId || prop.organization?.id,
          organizationName: prop.organization?.name || 'Unknown Organization',
          status: prop.status || 'active', // 'draft' | 'active' | 'closed' | 'distribution' | 'archived'
          pricePerToken: pricePerToken || (totalTokens > 0 ? totalValue / totalTokens : 0),
          totalTokens: totalTokens,
          soldTokens: soldTokens,
          availableTokens: availableTokens,
          totalTokenValue: totalValue || (pricePerToken * totalTokens),
          totalInvestment: totalInvestment,
          investorCount: uniqueInvestors.size,
          fundingPercentage: totalTokens > 0 ? (soldTokens / totalTokens) * 100 : 0
        };
      });
  }, [propertiesData, investmentsData]);

  // Get selected organization details
  const selectedOrg = useMemo(() => {
    if (!selectedOrgId) return null;
    return tokensData.find(org => org.id === selectedOrgId);
  }, [selectedOrgId, tokensData]);


  // Get selected property details
  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return individualTokens.find(t => t.id === selectedPropertyId);
  }, [selectedPropertyId, individualTokens]);

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    let filtered = tokensData.filter(token => {
      const search = (searchTerm || '').toLowerCase();
      if (!search) return true;
      
      return (
        token.name.toLowerCase().includes(search) ||
        (token.displayCode || '').toLowerCase().includes(search)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'totalTokens':
          aValue = a.totalTokens;
          bValue = b.totalTokens;
          break;
        case 'boughtTokens':
          aValue = a.boughtTokens;
          bValue = b.boughtTokens;
          break;
        case 'name':
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [tokensData, searchTerm, sortBy, sortOrder]);

  const formatNumber = (num) => {
    if (num === 0) return '0';
    if (num < 1) return num.toFixed(6);
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format relative time (e.g., "2 days ago", "3 hours ago")
  const formatRelativeTime = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'draft': { variant: 'warning', label: 'Draft' },
      'active': { variant: 'success', label: 'Active' },
      'closed': { variant: 'danger', label: 'Closed' },
      'distribution': { variant: 'info', label: 'Distribution' },
      'archived': { variant: 'default', label: 'Archived' },
      'planning': { variant: 'warning', label: 'Planning' },
      'construction': { variant: 'info', label: 'Construction' },
      'onhold': { variant: 'warning', label: 'On Hold' },
      'soldout': { variant: 'danger', label: 'Sold Out' },
      'completed': { variant: 'success', label: 'Completed' }
    };
    const statusInfo = statusMap[status?.toLowerCase()] || { variant: 'default', label: status || 'Unknown' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateOwnershipData = (investmentsData, propertyId) => {
    if (!investmentsData?.data) return [];
    
    const investments = Array.isArray(investmentsData.data)
      ? investmentsData.data
      : investmentsData.data?.data || investmentsData.data || [];

    const propInvestments = investments.filter(inv => {
      const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
      return (propertyId === invPropertyId) && (inv.status === 'confirmed' || inv.status === 'active');
    });

    // Group by user and sum tokens
    const ownershipMap = new Map();
    propInvestments.forEach(inv => {
      const userId = inv.userId || inv.user_id || inv.user?.id;
      const userName = inv.user?.name || inv.user?.email || `User ${userId?.slice(0, 8)}` || 'Unknown';
      const tokens = parseFloat(inv.tokensPurchased || 0);
      
      if (ownershipMap.has(userId)) {
        ownershipMap.get(userId).tokens += tokens;
      } else {
        ownershipMap.set(userId, {
          userId,
          userName,
          tokens,
          allocationDate: inv.createdAt || inv.created_at || new Date().toISOString()
        });
      }
    });

    return Array.from(ownershipMap.values())
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 20); // Top 20 holders
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Side panel state for property details
  const [selectedPropertyForPanel, setSelectedPropertyForPanel] = useState(null);
  const [chartTimeRange, setChartTimeRange] = useState('30d'); // '5d', '30d', '90d', 'all'
  const [hoveredDate, setHoveredDate] = useState(null); // For time travel on hover
  const [lockedDate, setLockedDate] = useState(null); // For locked date (sticky)
  
  // Active date: locked date takes priority, otherwise use hovered date
  const activeDate = lockedDate || hoveredDate;
  
  // Navigation helpers
  const navigateToProperty = (propertyId) => {
    setSelectedPropertyId(propertyId);
    setViewLevel('PROPERTY');
  };
  
  // Open property details in side panel
  const openPropertyPanel = (propertyId) => {
    const property = individualTokens.find(t => t.id === propertyId);
    if (property) {
      setSelectedPropertyForPanel(property);
      setHoveredDate(null); // Reset hover when opening new property
      setLockedDate(null); // Reset lock when opening new property
      setChartTimeRange('30d'); // Reset to default
    }
  };
  
  // Close property panel
  const closePropertyPanel = () => {
      setSelectedPropertyForPanel(null);
      setHoveredDate(null);
      setLockedDate(null);
      setChartTimeRange('30d'); // Reset to default
  };

  const navigateToOrg = () => {
    setViewLevel('ORG');
    setSelectedOrgId(null);
    setSelectedPropertyId(null);
  };

  const navigateBackToProperties = () => {
    setViewLevel('ORG');
    setSelectedPropertyId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view tokens.</p>
      </div>
    );
  }

  if (isLoadingOrgs || isLoadingInvestments) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
      </div>
    );
  }

  if (orgsError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load tokens: {orgsError.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  // Render Level 1: Organization View
  const renderLevel1OrgView = () => {
    // Calculate portfolio-wide averages
    const totalPortfolioValue = filteredAndSortedTokens.reduce((sum, org) => {
      return sum + (org.totalTokens * (org.totalInvestment / Math.max(org.boughtTokens, 1)));
    }, 0);
    
    const totalTokensIssued = filteredAndSortedTokens.reduce((sum, org) => sum + org.totalTokens, 0);
    const totalTokensSold = filteredAndSortedTokens.reduce((sum, org) => sum + org.boughtTokens, 0);
    const overallSalesProgress = totalTokensIssued > 0 ? (totalTokensSold / totalTokensIssued) * 100 : 0;
    
    // Weighted average token price
    const weightedPriceSum = filteredAndSortedTokens.reduce((sum, org) => {
      const avgPrice = org.totalTokens > 0 ? org.totalInvestment / Math.max(org.boughtTokens, 1) : 0;
      return sum + (avgPrice * org.totalTokens);
    }, 0);
    const avgTokenPrice = totalTokensIssued > 0 ? weightedPriceSum / totalTokensIssued : 0;

    // Calculate Funding Remaining: Total Target Value - Total Investment
    let totalTargetValue = 0;
    if (propertiesData?.data && individualTokens.length > 0) {
      totalTargetValue = individualTokens.reduce((sum, token) => {
        return sum + (token.totalTokenValue || 0);
      }, 0);
    }
    
    const totalInvestmentRaised = filteredAndSortedTokens.reduce((sum, t) => sum + t.totalInvestment, 0);
    const fundingRemaining = Math.max(0, totalTargetValue - totalInvestmentRaised);

    // Calculate Investors (Unique) and New Investors (7d)
    let totalInvestors = 0;
    let newInvestors7d = 0;
    
    // Calculate Recent Pace (5d): Tokens sold and Investment raised in last 5 days
    let tokensSold5d = 0;
    let investmentRaised5d = 0;
    
    if (investmentsData?.data) {
      const investments = Array.isArray(investmentsData.data)
        ? investmentsData.data
        : investmentsData.data?.data || investmentsData.data || [];

      // Filter confirmed/active investments
      const confirmedInvestments = investments.filter(inv => 
        inv.status === 'confirmed' || inv.status === 'active'
      );

      // Calculate 5d pace
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      
      const investments5d = confirmedInvestments.filter(inv => {
        const createdAt = new Date(inv.createdAt || inv.created_at || inv.date);
        return createdAt >= fiveDaysAgo;
      });

      tokensSold5d = investments5d.reduce((sum, inv) => {
        return sum + parseFloat(inv.tokensPurchased || inv.tokens || 0);
      }, 0);

      investmentRaised5d = investments5d.reduce((sum, inv) => {
        return sum + parseFloat(inv.amountUSDT || inv.amount || 0);
      }, 0);

      // Get unique investors and their first investment date
      const investorMap = new Map();
      confirmedInvestments.forEach(inv => {
        const userId = inv.userId || inv.user_id || inv.user?.id;
        if (!userId) return;

        const createdAt = new Date(inv.createdAt || inv.created_at || inv.date);
        
        if (!investorMap.has(userId)) {
          investorMap.set(userId, createdAt);
        } else {
          // Keep the earliest date
          const existingDate = investorMap.get(userId);
          if (createdAt < existingDate) {
            investorMap.set(userId, createdAt);
          }
        }
      });

      totalInvestors = investorMap.size;

      // Calculate new investors in last 7 days
      newInvestors7d = Array.from(investorMap.values()).filter(firstDate => 
        firstDate >= fiveDaysAgo
      ).length;
    }

    // Calculate Last Purchase Date (portfolio level)
    let lastPurchaseDate = null;
    if (investmentsData?.data) {
      const investments = Array.isArray(investmentsData.data)
        ? investmentsData.data
        : investmentsData.data?.data || investmentsData.data || [];
      
      const confirmedInvestments = investments.filter(inv => 
        inv.status === 'confirmed' || inv.status === 'active'
      );
      
      if (confirmedInvestments.length > 0) {
        const purchaseDates = confirmedInvestments.map(inv => 
          new Date(inv.createdAt || inv.created_at || inv.date)
        );
        lastPurchaseDate = new Date(Math.max(...purchaseDates));
      }
    }

    // Calculate Stagnant Properties (no sales in last 30 days)
    let stagnantPropertiesCount = 0;
    if (investmentsData?.data && individualTokens.length > 0) {
      const investments = Array.isArray(investmentsData.data)
        ? investmentsData.data
        : investmentsData.data?.data || investmentsData.data || [];
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const confirmedInvestments = investments.filter(inv => 
        inv.status === 'confirmed' || inv.status === 'active'
      );
      
      // Get properties with investments in last 30 days
      const activePropertyIds = new Set();
      confirmedInvestments.forEach(inv => {
        const createdAt = new Date(inv.createdAt || inv.created_at || inv.date);
        if (createdAt >= thirtyDaysAgo) {
          const propertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
          if (propertyId) {
            activePropertyIds.add(propertyId);
          }
        }
      });
      
      // Count properties that are NOT in the active set
      stagnantPropertiesCount = individualTokens.filter(token => {
        const tokenPropertyId = token.propertyId || token.id || token.displayCode;
        return !activePropertyIds.has(tokenPropertyId);
      }).length;
    }

    // Portfolio supply data for donut chart
    const portfolioSupplyData = [
      { name: 'Sold', value: totalTokensSold, color: '#10b981' },
      { name: 'Available', value: totalTokensIssued - totalTokensSold, color: '#f59e0b' }
    ];

  return (
    <div className="space-y-6">
        {/* Portfolio Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                Token Portfolio Overview
          </h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-muted-foreground">
                  Aggregate view of all organization tokens
                </p>
                {lastPurchaseDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last purchase: {formatRelativeTime(lastPurchaseDate)}
                  </span>
                )}
              </div>
        </div>
            <div className="flex items-center gap-2">
              <div className="h-64 w-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Legend />
                    <Pie
                      data={portfolioSupplyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {portfolioSupplyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Organizations</p>
              <p className="text-2xl font-bold text-card-foreground">{filteredAndSortedTokens.length}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Properties</p>
              <p className="text-2xl font-bold text-card-foreground">
                {filteredAndSortedTokens.reduce((sum, org) => sum + org.propertyCount, 0)}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Stagnant Properties</p>
              <p className="text-2xl font-bold text-orange-600">
                {stagnantPropertiesCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">No sales (30d)</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(totalTokensIssued)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Tokens Sold</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(totalTokensSold)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Portfolio Value</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPortfolioValue)}</p>
            </div>
          </div>
        </Card>

        {/* Organization KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Investment</p>
                <p className="text-lg font-bold text-card-foreground">
                  {formatCurrency(filteredAndSortedTokens.reduce((sum, t) => sum + t.totalInvestment, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Tokens Issued</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatNumber(totalTokensIssued)}
                </p>
              </div>
              <Coins className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Tokens Sold</p>
                <p className="text-lg font-bold text-green-600">
                  {formatNumber(totalTokensSold)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sales Progress</p>
                <p className="text-lg font-bold text-card-foreground">
                  {overallSalesProgress.toFixed(1)}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-yellow-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">5d Pace</p>
                <p className="text-sm font-semibold text-card-foreground">
                  {formatNumber(tokensSold5d)} tokens
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(investmentRaised5d)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg Token Price</p>
                <p className="text-lg font-bold text-card-foreground">
                  {formatCurrency(avgTokenPrice)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Funding Remaining</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(fundingRemaining)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatNumber(totalTokensIssued - totalTokensSold)} tokens remaining
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Investors</p>
                <p className="text-lg font-bold text-card-foreground">
                  {formatNumber(totalInvestors)}
                </p>
                {newInvestors7d > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    +{newInvestors7d} in last 7d
                  </p>
                )}
              </div>
              <Users className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </Card>
      </div>


      {/* Filters */}
      <Card variant="primary" className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-card-foreground">Filters</h3>
            {(searchTerm || sortBy !== 'name' || sortOrder !== 'asc') && (
              <Badge variant="info" className="ml-2">
                {[searchTerm, sortBy !== 'name' || sortOrder !== 'asc'].filter(Boolean).length} active
              </Badge>
            )}
          </div>
          {(searchTerm || sortBy !== 'name' || sortOrder !== 'asc') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSortBy('name');
                setSortOrder('asc');
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear All Filters
            </Button>
          )}
        </div>

        <div className="relative w-full space-y-4" ref={filterPanelRef}>
          {/* Top Row: Search + Single Filters Button */}
          <div className="flex gap-4">
            {/* Search Input - Takes most space */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-1">
                Search Organizations
              </label>
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <InputTwo
                  type="text"
                  name="search"
                  placeholder="Search by organization name, display code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  style={{ paddingLeft: '48px' }}
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
                  openFilterPanel === 'main' || (sortBy !== 'name' || sortOrder !== 'asc')
                    ? 'border-primary bg-accent font-semibold' 
                    : 'border-input'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
                {(sortBy !== 'name' || sortOrder !== 'asc') && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                    {(sortBy !== 'name' || sortOrder !== 'asc') ? 1 : 0}
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
                {/* Sort By Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-600 rounded-full"></span>
                    Sort By
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'name', label: 'Organization Name' },
                      { value: 'totalTokens', label: 'Total Tokens' },
                      { value: 'boughtTokens', label: 'Bought Tokens' }
                    ].map((option) => {
                      const isActive = sortBy === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortBy(option.value)}
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

                {/* Sort Order Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span className="w-1 h-4 bg-pink-600 rounded-full"></span>
                    Sort Order
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'asc', label: 'Ascending ↑' },
                      { value: 'desc', label: 'Descending ↓' }
                    ].map((option) => {
                      const isActive = sortOrder === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortOrder(option.value)}
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

          {/* Active Filters Chips Bar */}
          {(searchTerm || sortBy !== 'name' || sortOrder !== 'asc') && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Search chip */}
              {searchTerm && (
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  onClick={() => setSearchTerm('')}
                >
                  <span>Search: "{searchTerm}"</span>
                  <X className="w-3 h-3" />
                </div>
              )}
              
              {/* Sort chip */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium shadow-sm">
                <span>{sortBy === 'name' ? 'Name' : 
                          sortBy === 'totalTokens' ? 'Total Tokens' : 'Bought Tokens'}</span>
                <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

        {/* Organizations Table with Properties */}
      <Card>
        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px) scaleY(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scaleY(1);
            }
          }
        `}</style>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Properties
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Tokens
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sold Tokens
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Available Tokens
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredAndSortedTokens.length === 0 ? (
                <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                    <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No organizations found</p>
                  </td>
                </tr>
              ) : (
                  filteredAndSortedTokens.map((org) => {
                    // Get properties for this org
                    const orgProps = individualTokens.filter(t => 
                      t.organizationId === org.id
                    );

                    const isExpanded = expandedOrgIds.has(org.id);
                    
                    return (
                      <React.Fragment key={org.id}>
                        {/* Organization Row */}
                        <tr 
                          className="hover:bg-accent  transition-colors bg-muted/30 cursor-pointer"
                          onClick={(e) => {
                            // Only toggle if clicking on the row itself, not on buttons
                            if (e.target.closest('button') === null) {
                              toggleOrgExpansion(org.id);
                            }
                          }}
                        >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrgExpansion(org.id);
                          }}
                          className="flex items-center justify-center w-5 h-5 hover:bg-accent rounded transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div>
                              <div className="text-sm font-semibold text-card-foreground">
                                {org.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                                {org.displayCode}
                        </div>
                      </div>
                      </div>
                    </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant="info">
                              {org.propertyCount} {org.propertyCount === 1 ? 'property' : 'properties'}
                            </Badge>
                          </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end text-sm text-card-foreground">
                        <Coins className="w-4 h-4 mr-1 text-blue-600" />
                              <span className="font-semibold">{formatNumber(org.totalTokens)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end text-sm text-card-foreground">
                        <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                              <span className="font-semibold text-green-600">{formatNumber(org.boughtTokens)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end text-sm text-card-foreground">
                        <Coins className="w-4 h-4 mr-1 text-orange-600" />
                              <span className="font-semibold">{formatNumber(org.availableTokens)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end text-sm text-card-foreground">
                        <DollarSign className="w-4 h-4 mr-1 text-purple-600" />
                              <span className="font-semibold text-purple-600">{formatCurrency(org.totalInvestment)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <div className="w-24 bg-muted rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                                    org.fundingPercentage >= 50 ? 'bg-green-600' : 
                                    org.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                            }`}
                                  style={{ width: `${Math.min(org.fundingPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-card-foreground">
                                {org.fundingPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Organization Funding Remaining & 5d Pace Row (shown when expanded) */}
                  {isExpanded && (() => {
                    // Calculate 5d pace for this organization
                    let orgTokensSold5d = 0;
                    let orgInvestmentRaised5d = 0;
                    let orgStagnantPropertiesCount = 0;
                    
                    if (investmentsData?.data) {
                      const investments = Array.isArray(investmentsData.data)
                        ? investmentsData.data
                        : investmentsData.data?.data || investmentsData.data || [];
                      
                      const now = new Date();
                      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      
                      // Get property IDs for this org
                      const orgPropertyIds = orgProps.map(prop => prop.id || prop.displayCode);
                      
                      const orgInvestments5d = investments.filter(inv => {
                        const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                        const createdAt = new Date(inv.createdAt || inv.created_at || inv.date);
                        return orgPropertyIds.includes(invPropertyId) &&
                               (inv.status === 'confirmed' || inv.status === 'active') &&
                               createdAt >= fiveDaysAgo;
                      });
                      
                      orgTokensSold5d = orgInvestments5d.reduce((sum, inv) => {
                        return sum + parseFloat(inv.tokensPurchased || inv.tokens || 0);
                      }, 0);
                      
                      orgInvestmentRaised5d = orgInvestments5d.reduce((sum, inv) => {
                        return sum + parseFloat(inv.amountUSDT || inv.amount || 0);
                      }, 0);
                      
                      // Calculate stagnant properties (no sales in last 30 days)
                      const confirmedInvestments = investments.filter(inv => 
                        inv.status === 'confirmed' || inv.status === 'active'
                      );
                      
                      const activeOrgPropertyIds = new Set();
                      confirmedInvestments.forEach(inv => {
                        const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                        const createdAt = new Date(inv.createdAt || inv.created_at || inv.date);
                        if (orgPropertyIds.includes(invPropertyId) && createdAt >= thirtyDaysAgo) {
                          activeOrgPropertyIds.add(invPropertyId);
                        }
                      });
                      
                      orgStagnantPropertiesCount = orgProps.filter(prop => {
                        const propId = prop.id || prop.displayCode;
                        return !activeOrgPropertyIds.has(propId);
                      }).length;
                    }
                    
                    return (
                      <tr className="bg-muted/20">
                        <td colSpan="7" className="px-6 py-3">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="w-5 h-5 text-orange-600" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Organization Funding Remaining</p>
                                    <p className="text-lg font-bold text-orange-600">
                                      {formatCurrency(Math.max(0, orgProps.reduce((sum, prop) => sum + (prop.totalTokenValue || 0), 0) - org.totalInvestment))}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {formatNumber(orgProps.reduce((sum, prop) => sum + (prop.availableTokens || 0), 0))} tokens remaining
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">5d Pace</p>
                                    <p className="text-sm font-bold text-blue-600">
                                      {formatNumber(orgTokensSold5d)} tokens
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {formatCurrency(orgInvestmentRaised5d)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {/* Organization Stagnant Properties */}
                              {orgStagnantPropertiesCount > 0 && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Stagnant Properties</p>
                                      <p className="text-sm font-bold text-red-600">
                                        {orgStagnantPropertiesCount} properties
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        No sales in last 30d
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {/* Organization Last Purchase */}
                              {(() => {
                                let orgLastPurchaseDate = null;
                                if (investmentsData?.data) {
                                  const investments = Array.isArray(investmentsData.data)
                                    ? investmentsData.data
                                    : investmentsData.data?.data || investmentsData.data || [];
                                  
                                  const orgPropertyIds = orgProps.map(prop => prop.id || prop.displayCode);
                                  const orgInvestments = investments.filter(inv => {
                                    const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                                    return orgPropertyIds.includes(invPropertyId) &&
                                           (inv.status === 'confirmed' || inv.status === 'active');
                                  });
                                  
                                  if (orgInvestments.length > 0) {
                                    const purchaseDates = orgInvestments.map(inv => 
                                      new Date(inv.createdAt || inv.created_at || inv.date)
                                    );
                                    orgLastPurchaseDate = new Date(Math.max(...purchaseDates));
                                  }
                                }
                                
                                return orgLastPurchaseDate ? (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Last purchase: {formatRelativeTime(orgLastPurchaseDate)}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })()}
                        
                        {/* Properties Rows (collapsible) */}
                        {isExpanded && orgProps.map((prop, index) => (
                          <tr 
                            key={prop.id} 
                            className="hover:bg-accent/50 cursor-pointer bg-muted/10"
                            style={{
                              animation: `slideDown 0.3s ease-out ${index * 0.05}s both`,
                              transformOrigin: 'top'
                            }}
                            onClick={(e) => {
                              if (e.target.closest('button') === null) {
                                openPropertyPanel(prop.id);
                              }
                            }}
                          >
                            <td className="px-6 py-3 pl-12 whitespace-nowrap">
                              <div className="text-sm text-muted-foreground">
                                {prop.propertyName}
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              {getStatusBadge(prop.status)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end text-sm text-card-foreground">
                                <Coins className="w-4 h-4 mr-1 text-blue-600" />
                                <span className="font-semibold">{formatNumber(prop.totalTokens)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end text-sm text-card-foreground">
                                <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                                <span className="font-semibold text-green-600">{formatNumber(prop.soldTokens)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end text-sm text-card-foreground">
                                <Coins className="w-4 h-4 mr-1 text-orange-600" />
                                <span className="font-semibold">{formatNumber(prop.availableTokens)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end text-sm text-card-foreground">
                                <DollarSign className="w-4 h-4 mr-1 text-purple-600" />
                                <span className="font-semibold text-purple-600">{formatCurrency(prop.totalTokenValue)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                <div className="w-24 bg-muted rounded-full h-2 mr-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      prop.fundingPercentage >= 50 ? 'bg-green-600' : 
                                      prop.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                                    }`}
                                    style={{ width: `${Math.min(prop.fundingPercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-card-foreground">
                                  {prop.fundingPercentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
    );
  };

  // Render Token Details View (Legacy - keeping for backward compatibility)
  const renderTokenDetails = () => {
    if (!selectedProperty) {
      return (
        <div className="text-center py-12">
          <Coins className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Please select a token to view details</p>
        </div>
      );
    }

    const token = selectedProperty;
    const ownershipData = generateOwnershipData(investmentsData, token.propertyId);
    const totalOwnership = ownershipData.reduce((sum, inv) => sum + inv.tokens, 0);
    
    // Calculate ownership percentages
    const ownershipWithPercentages = ownershipData.map(inv => ({
      ...inv,
      percentage: token.totalTokens > 0 ? (inv.tokens / token.totalTokens) * 100 : 0
    }));

    // Supply data for donut chart
    const supplyData = [
      { name: 'Sold', value: token.soldTokens, color: '#10b981' },
      { name: 'Available', value: token.availableTokens, color: '#f59e0b' },
      { name: 'Reserved', value: Math.max(0, token.totalTokens * 0.05), color: '#6366f1' }
    ];

    // Top 5 holders for bar chart
    const topHolders = ownershipWithPercentages.slice(0, 5);


    return (
      <div className="space-y-6">
        {/* Token Selector */}
        <Card className="p-6">
            <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Token
              </label>
              <select
                value={selectedPropertyId || ''}
                onChange={(e) => {
                  const propId = e.target.value || null;
                  if (propId) {
                    setSelectedPropertyId(propId);
                    setViewLevel('PROPERTY');
                  }
                }}
                className="w-full md:w-96 px-4 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">— Select a token —</option>
                {individualTokens.map(token => (
                  <option key={token.id} value={token.id}>
                    {token.tokenName} ({token.propertyName})
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => navigateToOrg()}
              className="ml-4"
            >
              Back to Overview
            </Button>
          </div>
        </Card>

        {/* P0: Token Overview */}
        {expandedSections.overview ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Token Overview
              </h3>
              <button onClick={() => toggleSection('overview')}>
                {expandedSections.overview ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Token Name</p>
                <p className="text-lg font-semibold text-card-foreground">{token.tokenName}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Property Name</p>
                <p className="text-lg font-semibold text-card-foreground">{token.propertyName}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <div className="mt-1">{getStatusBadge(token.status)}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Price per Token</p>
                <p className="text-lg font-semibold text-card-foreground">{formatCurrency(token.pricePerToken)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Tokens</p>
                <p className="text-2xl font-bold text-card-foreground">{formatNumber(token.totalTokens)}</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tokens Sold</p>
                <p className="text-2xl font-bold text-green-600">{formatNumber(token.soldTokens)}</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tokens Available</p>
                <p className="text-2xl font-bold text-orange-600">{formatNumber(token.availableTokens)}</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Token Value</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(token.totalTokenValue)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Funding Progress</span>
                <span className="font-semibold text-card-foreground">{token.fundingPercentage.toFixed(2)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    token.fundingPercentage >= 50 ? 'bg-green-600' : 
                    token.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(token.fundingPercentage, 100)}%` }}
                ></div>
              </div>
              {/* 5d Pace for Property */}
              {(() => {
                let propTokensSold5d = 0;
                let propInvestmentRaised5d = 0;
                
                if (investmentsData?.data) {
                  const investments = Array.isArray(investmentsData.data)
                    ? investmentsData.data
                    : investmentsData.data?.data || investmentsData.data || [];
                  
                  const now = new Date();
                  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                  const propertyId = token.id || token.propertyId;
                  
                  const propInvestments5d = investments.filter(inv => {
                    const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                    const createdAt = new Date(inv.createdAt || inv.created_at || inv.date);
                    return (invPropertyId === propertyId) &&
                           (inv.status === 'confirmed' || inv.status === 'active') &&
                           createdAt >= fiveDaysAgo;
                  });
                  
                  propTokensSold5d = propInvestments5d.reduce((sum, inv) => {
                    return sum + parseFloat(inv.tokensPurchased || inv.tokens || 0);
                  }, 0);
                  
                  propInvestmentRaised5d = propInvestments5d.reduce((sum, inv) => {
                    return sum + parseFloat(inv.amountUSDT || inv.amount || 0);
                  }, 0);
                }
                
                const propAvailableTokens = token.availableTokens || 0;
                const propTokensPerDay = propTokensSold5d > 0 ? propTokensSold5d / 5 : 0;
                let propSellOutETA = null;
                if (propAvailableTokens <= 0) {
                  propSellOutETA = 'Sold Out';
                } else if (propTokensPerDay > 0) {
                  const daysToSellOut = Math.ceil(propAvailableTokens / propTokensPerDay);
                  propSellOutETA = `~${daysToSellOut} days`;
                }
                
                return (
                  <>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-muted-foreground">5d Pace</p>
                            <p className="text-sm font-semibold text-blue-600">
                              {formatNumber(propTokensSold5d)} tokens • {formatCurrency(propInvestmentRaised5d)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {propSellOutETA && (
                      <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-orange-600" />
                            <div>
                              <p className="text-xs text-muted-foreground">Sell-out ETA</p>
                              <p className="text-sm font-semibold text-orange-600">
                                {propSellOutETA}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Coins className="w-5 h-5" />
                Token Overview
              </h3>
              <button onClick={() => toggleSection('overview')}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

        {/* P1: Valuation & Pricing - Removed mock data */}
        {expandedSections.valuation ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Valuation & Pricing
              </h3>
              <button onClick={() => toggleSection('valuation')}>
                {expandedSections.valuation ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(token.pricePerToken)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Token Value</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(token.totalTokenValue)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Investment</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(token.totalInvestment)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-muted-foreground mb-1">Funding Remaining</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(Math.max(0, (token.totalTokenValue || 0) - (token.totalInvestment || 0)))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(token.availableTokens || 0)} tokens remaining
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Valuation & Pricing
              </h3>
              <button onClick={() => toggleSection('valuation')}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

        {/* P1: Supply & Availability */}
        {expandedSections.supply ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Supply & Availability
              </h3>
              <button onClick={() => toggleSection('supply')}>
                {expandedSections.supply ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Token Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Legend />
                      <Pie
                        data={supplyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {supplyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Authorized Tokens</p>
                  <p className="text-2xl font-bold text-card-foreground">{formatNumber(token.totalTokens)}</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Released Tokens</p>
                  <p className="text-2xl font-bold text-card-foreground">{formatNumber(token.totalTokens)}</p>
                </div>
                <div className="p-4 border border-border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Sold Tokens</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(token.soldTokens)}</p>
                </div>
                <div className="p-4 border border-border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Available Tokens</p>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(token.availableTokens)}</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Reserved Tokens</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {formatNumber(Math.max(0, token.totalTokens * 0.05))}
                </p>
              </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Supply & Availability
              </h3>
              <button onClick={() => toggleSection('supply')}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

        {/* P1: Investor Ownership */}
        {expandedSections.ownership ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Users className="w-5 h-5" />
                Investor Ownership
              </h3>
              <button onClick={() => toggleSection('ownership')}>
                {expandedSections.ownership ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            {ownershipData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                    <h4 className="text-sm font-semibold text-card-foreground mb-4">Ownership Distribution</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Tooltip formatter={(value, name) => [`${formatNumber(value)} tokens (${((value / token.totalTokens) * 100).toFixed(1)}%)`, name]} />
                          <Legend />
                          <Pie
                            data={topHolders.map((h, i) => ({
                              name: h.userName.length > 15 ? h.userName.substring(0, 15) + '...' : h.userName,
                              value: h.tokens,
                              color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {topHolders.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-card-foreground mb-4">Top 5 Holders</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topHolders}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="userName" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="#6b7280" />
                          <Tooltip formatter={(value) => formatNumber(value)} />
                          <Bar dataKey="tokens" fill="#3b82f6" name="Tokens" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Investor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Units</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">% Ownership</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Allocation Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ownershipWithPercentages.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-accent">
                          <td className="px-4 py-3 text-sm text-card-foreground">{inv.userName}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-card-foreground">{formatNumber(inv.tokens)}</td>
                          <td className="px-4 py-3 text-sm text-card-foreground">{inv.percentage.toFixed(2)}%</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(inv.allocationDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Top 10 Concentration:</strong> {
                      ownershipWithPercentages.slice(0, 10).reduce((sum, inv) => sum + inv.percentage, 0).toFixed(2)
                    }%
                </p>
              </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No investors found for this token</p>
            </div>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Users className="w-5 h-5" />
                Investor Ownership
              </h3>
              <button onClick={() => toggleSection('ownership')}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}



      </div>
    );
  };


  // Render Level 3: Single Property Token Breakdown
  const renderLevel3PropertyDetails = () => {
    if (!selectedProperty) {
      return (
        <div className="text-center py-12">
          <Coins className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Property not found</p>
          <Button onClick={() => navigateBackToProperties()} className="mt-4">
            Back to Properties
          </Button>
        </div>
      );
    }

    const token = selectedProperty;
    const ownershipData = generateOwnershipData(investmentsData, token.propertyId);
    
    const ownershipWithPercentages = ownershipData.map(inv => ({
      ...inv,
      percentage: token.totalTokens > 0 ? (inv.tokens / token.totalTokens) * 100 : 0
    }));

    const supplyData = [
      { name: 'Sold', value: token.soldTokens, color: '#10b981' },
      { name: 'Available', value: token.availableTokens, color: '#f59e0b' },
      { name: 'Reserved', value: Math.max(0, token.totalTokens * 0.05), color: '#6366f1' }
    ];

    const topHolders = ownershipWithPercentages.slice(0, 5);

    return (
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigateToOrg()} className="hover:text-card-foreground transition-colors">
            Organizations
          </button>
          <ChevronRight className="w-4 h-4" />
          <button onClick={() => navigateBackToProperties()} className="hover:text-card-foreground transition-colors">
            {selectedOrg?.name || 'Properties'}
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-card-foreground font-medium">{token.propertyName}</span>
        </div>

        {/* Property Token Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-card-foreground mb-2">{token.tokenName}</h2>
              <p className="text-muted-foreground mb-4">{token.propertyName}</p>
              <div className="flex items-center gap-4 flex-wrap">
                {getStatusBadge(token.status)}
                <div>
                  <p className="text-xs text-muted-foreground">Token Price</p>
                  <p className="text-lg font-bold text-card-foreground">{formatCurrency(token.pricePerToken)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm text-card-foreground">{formatDate(new Date().toISOString())}</p>
                </div>
                {(() => {
                  let propLastPurchaseDate = null;
                  if (investmentsData?.data) {
                    const investments = Array.isArray(investmentsData.data)
                      ? investmentsData.data
                      : investmentsData.data?.data || investmentsData.data || [];
                    
                    const propertyId = token.propertyId || token.id;
                    const propInvestments = investments.filter(inv => {
                      const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                      return (invPropertyId === propertyId || invPropertyId === token.displayCode) &&
                             (inv.status === 'confirmed' || inv.status === 'active');
                    });
                    
                    if (propInvestments.length > 0) {
                      const purchaseDates = propInvestments.map(inv => 
                        new Date(inv.createdAt || inv.created_at || inv.date)
                      );
                      propLastPurchaseDate = new Date(Math.max(...purchaseDates));
                    }
                  }
                  
                  return propLastPurchaseDate ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Last Purchase</p>
                      <p className="text-sm text-card-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(propLastPurchaseDate)}
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            <Button variant="outline" onClick={() => navigateBackToProperties()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Properties
            </Button>
          </div>
          
          {/* Investor Concentration (Top 1 share) - Quick Summary */}
          {ownershipData.length > 0 && (() => {
            const sortedOwnership = [...ownershipWithPercentages].sort((a, b) => b.tokens - a.tokens);
            const top1Holder = sortedOwnership[0];
            // Calculate total sold tokens from actual ownership data (not property field)
            const totalSoldTokensFromData = ownershipData.reduce((sum, holder) => sum + holder.tokens, 0);
            const top1SharePercentage = totalSoldTokensFromData > 0 
              ? (top1Holder.tokens / totalSoldTokensFromData) * 100 
              : 0;
            
            return (
              <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Top Share</p>
                    <p className="text-xl font-bold text-purple-600">
                      {top1SharePercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Top buyer holds {formatNumber(top1Holder.tokens)} tokens ({top1SharePercentage.toFixed(1)}% of sold)
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-purple-600 opacity-50" />
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Reuse existing token details sections from renderTokenDetails */}
        {/* P1: Valuation & Pricing */}
        {expandedSections.valuation && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Valuation & Pricing
              </h3>
              <button onClick={() => toggleSection('valuation')}>
                {expandedSections.valuation ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(token.pricePerToken)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Token Value</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(token.totalTokenValue)}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Investment</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(token.totalInvestment)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Continue with other sections - Supply, Ownership, Yield, Performance, Audit */}
        {/* (Reusing the same structure from renderTokenDetails but simplified) */}
        
        {/* Supply & Availability */}
        {expandedSections.supply && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Supply & Availability
              </h3>
              <button onClick={() => toggleSection('supply')}>
                {expandedSections.supply ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Token Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Legend />
                      <Pie
                        data={supplyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {supplyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Tokens</p>
                  <p className="text-2xl font-bold text-card-foreground">{formatNumber(token.totalTokens)}</p>
                </div>
                <div className="p-4 border border-border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Sold Tokens</p>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(token.soldTokens)}</p>
                </div>
                <div className="p-4 border border-border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-sm text-muted-foreground mb-1">Available Tokens</p>
                  <p className="text-2xl font-bold text-orange-600">{formatNumber(token.availableTokens)}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Investor Ownership */}
        {expandedSections.ownership && ownershipData.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Users className="w-5 h-5" />
                Investor Ownership
              </h3>
              <button onClick={() => toggleSection('ownership')}>
                {expandedSections.ownership ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Top 5 Holders</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topHolders}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="userName" stroke="#6b7280" angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Bar dataKey="tokens" fill="#3b82f6" name="Tokens" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Ownership Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Tooltip formatter={(value, name) => [`${formatNumber(value)} tokens (${((value / token.totalTokens) * 100).toFixed(1)}%)`, name]} />
                      <Legend />
                      <Pie
                        data={topHolders.map((h, i) => ({
                          name: h.userName.length > 15 ? h.userName.substring(0, 15) + '...' : h.userName,
                          value: h.tokens,
                          color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {topHolders.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Investor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Units</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">% Ownership</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Allocation Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ownershipWithPercentages.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-accent">
                      <td className="px-4 py-3 text-sm text-card-foreground">{inv.userName}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-card-foreground">{formatNumber(inv.tokens)}</td>
                      <td className="px-4 py-3 text-sm text-card-foreground">{inv.percentage.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(inv.allocationDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs (only show for Level 3) */}
      {viewLevel === 'PROPERTY' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigateToOrg()} className="hover:text-card-foreground transition-colors">
            Organizations
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-card-foreground font-medium">{selectedProperty?.propertyName || 'Property'}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Coins className="w-6 h-6" />
            Tokens
          </h2>
          <p className="text-muted-foreground">
            {viewLevel === 'ORG' && 'Organization-level token portfolio overview'}
            {viewLevel === 'PROPERTY' && `Token details for ${selectedProperty?.propertyName || 'Property'}`}
          </p>
        </div>
        {viewLevel !== 'ORG' && (
          <Button variant="outline" onClick={() => navigateToOrg()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organizations
          </Button>
        )}
      </div>

      {/* Render based on view level */}
      {viewLevel === 'ORG' && renderLevel1OrgView()}
      {viewLevel === 'PROPERTY' && renderLevel3PropertyDetails()}
      
      {/* Property Details Side Panel */}
      {selectedPropertyForPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={closePropertyPanel}
          />
          
          {/* Side Panel */}
          <div 
            className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] lg:w-[700px] z-[60] flex flex-col shadow-2xl"
            style={{
              animation: 'slideInFromRight 0.3s ease-out',
            }}
          >
            <style>{`
              @keyframes slideInFromRight {
                from {
                  transform: translateX(100%);
                  opacity: 0;
                }
                to {
                  transform: translateX(0);
                  opacity: 1;
                }
              }
            `}</style>
            
            <Card className="h-full flex flex-col rounded-none md:rounded-l-2xl shadow-2xl border-l border-border/50">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold text-card-foreground">{selectedPropertyForPanel.propertyName}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-muted-foreground">
                      {selectedPropertyForPanel.displayCode || selectedPropertyForPanel.id}
                    </p>
                    {(() => {
                      let propLastPurchaseDate = null;
                      if (investmentsData?.data) {
                        const investments = Array.isArray(investmentsData.data)
                          ? investmentsData.data
                          : investmentsData.data?.data || investmentsData.data || [];
                        
                        const propertyId = selectedPropertyForPanel.id || selectedPropertyForPanel.propertyId;
                        const propInvestments = investments.filter(inv => {
                          const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                          return (invPropertyId === propertyId || invPropertyId === selectedPropertyForPanel.displayCode) &&
                                 (inv.status === 'confirmed' || inv.status === 'active');
                        });
                        
                        if (propInvestments.length > 0) {
                          const purchaseDates = propInvestments.map(inv => 
                            new Date(inv.createdAt || inv.created_at || inv.date)
                          );
                          propLastPurchaseDate = new Date(Math.max(...purchaseDates));
                        }
                      }
                      
                      return propLastPurchaseDate ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last purchase: {formatRelativeTime(propLastPurchaseDate)}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closePropertyPanel}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Status</p>
                  {getStatusBadge(selectedPropertyForPanel.status)}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Price per Token</p>
                    <p className="text-lg font-bold text-card-foreground">
                      {formatCurrency(selectedPropertyForPanel.pricePerToken)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(selectedPropertyForPanel.totalTokenValue)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatNumber(selectedPropertyForPanel.totalTokens)}
                    </p>
                  </div>
                  {(() => {
                    // Calculate metrics as of activeDate (locked or hovered) or current
                    const propertyId = selectedPropertyForPanel.id || selectedPropertyForPanel.propertyId;
                    
                    let tokensSoldAsOf = selectedPropertyForPanel.soldTokens || 0;
                    let availableTokensAsOf = selectedPropertyForPanel.availableTokens || 0;
                    let totalInvestmentAsOf = selectedPropertyForPanel.totalInvestment || 0;
                    
                    if (activeDate && investmentsData?.data) {
                      const investments = Array.isArray(investmentsData.data)
                        ? investmentsData.data
                        : investmentsData.data?.data || investmentsData.data || [];
                      
                      const filteredInvestments = investments.filter(inv => {
                        const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                        const invDate = new Date(inv.createdAt || inv.created_at || inv.date);
                        const activeDateObj = new Date(activeDate);
                        return (invPropertyId === propertyId || invPropertyId === selectedPropertyForPanel.displayCode) &&
                               (inv.status === 'confirmed' || inv.status === 'active') &&
                               invDate <= activeDateObj;
                      });
                      
                      tokensSoldAsOf = filteredInvestments.reduce((sum, inv) => 
                        sum + parseFloat(inv.tokensPurchased || inv.tokens || 0), 0
                      );
                      totalInvestmentAsOf = filteredInvestments.reduce((sum, inv) => 
                        sum + parseFloat(inv.amountUSDT || inv.amount || 0), 0
                      );
                      availableTokensAsOf = (selectedPropertyForPanel.totalTokens || 0) - tokensSoldAsOf;
                    }
                    
                    return (
                      <>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Sold Tokens</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatNumber(tokensSoldAsOf)}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Available Tokens</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatNumber(availableTokensAsOf)}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Total Investment</p>
                          <p className="text-lg font-bold text-card-foreground">
                            {formatCurrency(totalInvestmentAsOf)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Cumulative Tokens Sold Chart */}
                {(() => {
                  const propertyId = selectedPropertyForPanel.id || selectedPropertyForPanel.propertyId;
                  
                  if (!investmentsData?.data) return null;
                  
                  const investments = Array.isArray(investmentsData.data)
                    ? investmentsData.data
                    : investmentsData.data?.data || investmentsData.data || [];
                  
                  // Filter investments for this property
                  const propInvestments = investments.filter(inv => {
                    const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                    return (invPropertyId === propertyId || invPropertyId === selectedPropertyForPanel.displayCode) &&
                           (inv.status === 'confirmed' || inv.status === 'active');
                  });
                  
                  if (propInvestments.length === 0) return null;
                  
                  // Calculate date range
                  const now = new Date();
                  let startDate = new Date();
                  switch (chartTimeRange) {
                    case '5d':
                      startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                      break;
                    case '30d':
                      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      break;
                    case '90d':
                      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                      break;
                    case 'all':
                      // Use earliest investment date
                      const earliestDate = new Date(Math.min(...propInvestments.map(inv => 
                        new Date(inv.createdAt || inv.created_at || inv.date)
                      )));
                      startDate = earliestDate;
                      break;
                    default:
                      // Default to 30 days if unknown range
                      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      break;
                  }
                  
                  // Group investments by date and calculate cumulative tokens
                  const investmentsByDate = new Map();
                  propInvestments.forEach(inv => {
                    const invDate = new Date(inv.createdAt || inv.created_at || inv.date);
                    if (invDate >= startDate) {
                      const dateKey = invDate.toISOString().split('T')[0]; // YYYY-MM-DD
                      if (!investmentsByDate.has(dateKey)) {
                        investmentsByDate.set(dateKey, []);
                      }
                      investmentsByDate.get(dateKey).push(inv);
                    }
                  });
                  
                  // Create sorted date array
                  const sortedDates = Array.from(investmentsByDate.keys()).sort();
                  
                  // Calculate cumulative data
                  let cumulativeTokens = 0;
                  const chartData = sortedDates.map(date => {
                    const dayInvestments = investmentsByDate.get(date);
                    const dayTokens = dayInvestments.reduce((sum, inv) => 
                      sum + parseFloat(inv.tokensPurchased || inv.tokens || 0), 0
                    );
                    cumulativeTokens += dayTokens;
                    
                    return {
                      date,
                      dateFormatted: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      tokens: cumulativeTokens,
                      dayTokens: dayTokens
                    };
                  });
                  
                  // If no data in range, return null
                  if (chartData.length === 0) return null;
                  
                  return (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-card-foreground">Cumulative Tokens Sold</h4>
                        <div className="flex items-center gap-2">
                          {['5d', '30d', '90d', 'all'].map(range => (
                            <button
                              key={range}
                              onClick={() => setChartTimeRange(range)}
                              className={`px-2 py-1 text-xs rounded ${
                                chartTimeRange === range
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {range === 'all' ? 'All' : range}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            onMouseMove={(e) => {
                              if (e && e.activePayload && e.activePayload[0]) {
                                const data = e.activePayload[0].payload;
                                // Only update hover if no date is locked
                                if (!lockedDate) {
                                  setHoveredDate(data.date);
                                }
                              }
                            }}
                            onMouseLeave={() => {
                              // Only clear hover if no date is locked
                              if (!lockedDate) {
                                setHoveredDate(null);
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                            <XAxis 
                              dataKey="dateFormatted" 
                              stroke="#6b7280"
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis stroke="#6b7280" />
                            <Tooltip
                              formatter={(value) => formatNumber(value)}
                              labelFormatter={(label) => {
                                const data = chartData.find(d => d.dateFormatted === label);
                                return data ? new Date(data.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                }) : label;
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="tokens" 
                              stroke="#3b82f6" 
                              strokeWidth={2}
                              dot={(props) => {
                                const { cx, cy, payload } = props;
                                const isLocked = lockedDate === payload.date;
                                return (
                                  <g>
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={isLocked ? 6 : 4}
                                      fill={isLocked ? "#10b981" : "#3b82f6"}
                                      stroke={isLocked ? "#059669" : "#2563eb"}
                                      strokeWidth={isLocked ? 2 : 1}
                                    />
                                  </g>
                                );
                              }}
                              activeDot={(props) => {
                                const { cx, cy, payload } = props;
                                const isLocked = lockedDate === payload.date;
                                return (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={8}
                                    fill={isLocked ? "#10b981" : "#3b82f6"}
                                    stroke={isLocked ? "#059669" : "#2563eb"}
                                    strokeWidth={2}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const clickedDate = payload.date;
                                      // Toggle lock: if clicking same date, unlock; otherwise lock new date
                                      if (lockedDate === clickedDate) {
                                        setLockedDate(null);
                                        setHoveredDate(null);
                                      } else {
                                        setLockedDate(clickedDate);
                                        setHoveredDate(clickedDate);
                                      }
                                    }}
                                  />
                                );
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      {activeDate && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(activeDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                          {lockedDate && (
                            <button
                              onClick={() => {
                                setLockedDate(null);
                                setHoveredDate(null);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Reset to Current
                            </button>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })()}

                {/* Funding Remaining - Separate section for emphasis */}
                {(() => {
                  // Calculate metrics as of activeDate (locked or hovered) or current
                  const propertyId = selectedPropertyForPanel.id || selectedPropertyForPanel.propertyId;
                  
                  if (!investmentsData?.data) {
                    return (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Funding Remaining</p>
                            <p className="text-xl font-bold text-orange-600">
                              {formatCurrency(Math.max(0, (selectedPropertyForPanel.totalTokenValue || 0) - (selectedPropertyForPanel.totalInvestment || 0)))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatNumber(selectedPropertyForPanel.availableTokens || 0)} tokens remaining
                            </p>
                          </div>
                          <TrendingDown className="w-8 h-8 text-orange-600 opacity-50" />
                        </div>
                      </div>
                    );
                  }
                  
                  const investments = Array.isArray(investmentsData.data)
                    ? investmentsData.data
                    : investmentsData.data?.data || investmentsData.data || [];
                  
                  // Filter investments up to hoveredDate or all
                  const filteredInvestments = investments.filter(inv => {
                    const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                    if (invPropertyId !== propertyId && invPropertyId !== selectedPropertyForPanel.displayCode) {
                      return false;
                    }
                    if (inv.status !== 'confirmed' && inv.status !== 'active') {
                      return false;
                    }
                    if (activeDate) {
                      const invDate = new Date(inv.createdAt || inv.created_at || inv.date);
                      const activeDateObj = new Date(activeDate);
                      // Set to end of day (23:59:59.999) to include all investments on that date
                      activeDateObj.setHours(23, 59, 59, 999);
                      return invDate <= activeDateObj;
                    }
                    return true;
                  });
                  
                  const tokensSoldAsOf = filteredInvestments.reduce((sum, inv) => 
                    sum + parseFloat(inv.tokensPurchased || inv.tokens || 0), 0
                  );
                  const investmentRaisedAsOf = filteredInvestments.reduce((sum, inv) => 
                    sum + parseFloat(inv.amountUSDT || inv.amount || 0), 0
                  );
                  const availableTokensAsOf = (selectedPropertyForPanel.totalTokens || 0) - tokensSoldAsOf;
                  const fundingRemainingAsOf = Math.max(0, (selectedPropertyForPanel.totalTokenValue || 0) - investmentRaisedAsOf);
                  
                  return (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Funding Remaining</p>
                          <p className="text-xl font-bold text-orange-600">
                            {formatCurrency(fundingRemainingAsOf)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNumber(availableTokensAsOf)} tokens remaining
                          </p>
                        </div>
                        <TrendingDown className="w-8 h-8 text-orange-600 opacity-50" />
                      </div>
                    </div>
                  );
                })()}

                {/* Investor Concentration (Top 1 share) */}
                {(() => {
                  const propertyId = selectedPropertyForPanel.id || selectedPropertyForPanel.propertyId;
                  
                  if (!investmentsData?.data) return null;
                  
                  const investments = Array.isArray(investmentsData.data)
                    ? investmentsData.data
                    : investmentsData.data?.data || investmentsData.data || [];
                  
                  // Filter investments up to hoveredDate or all
                  const filteredInvestments = investments.filter(inv => {
                    const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                    if (invPropertyId !== propertyId && invPropertyId !== selectedPropertyForPanel.displayCode) {
                      return false;
                    }
                    if (inv.status !== 'confirmed' && inv.status !== 'active') {
                      return false;
                    }
                    if (activeDate) {
                      const invDate = new Date(inv.createdAt || inv.created_at || inv.date);
                      const activeDateObj = new Date(activeDate);
                      // Set to end of day (23:59:59.999) to include all investments on that date
                      activeDateObj.setHours(23, 59, 59, 999);
                      return invDate <= activeDateObj;
                    }
                    return true;
                  });
                  
                  // Generate ownership data from filtered investments
                  const ownershipMap = new Map();
                  filteredInvestments.forEach(inv => {
                    const userId = inv.userId || inv.user_id || inv.user?.id;
                    const userName = inv.user?.name || inv.user?.email || `User ${userId?.slice(0, 8)}` || 'Unknown';
                    const tokens = parseFloat(inv.tokensPurchased || 0);
                    
                    if (ownershipMap.has(userId)) {
                      ownershipMap.get(userId).tokens += tokens;
                    } else {
                      ownershipMap.set(userId, {
                        userId,
                        userName,
                        tokens,
                        allocationDate: inv.createdAt || inv.created_at || new Date().toISOString()
                      });
                    }
                  });
                  
                  const ownershipData = Array.from(ownershipMap.values());
                  
                  if (ownershipData.length === 0) return null;
                  
                  // Sort by tokens descending and get top 1
                  const sortedOwnership = [...ownershipData].sort((a, b) => b.tokens - a.tokens);
                  const top1Holder = sortedOwnership[0];
                  // Calculate total sold tokens from actual ownership data (not property field)
                  const totalSoldTokensFromData = ownershipData.reduce((sum, holder) => sum + holder.tokens, 0);
                  const top1SharePercentage = totalSoldTokensFromData > 0 
                    ? (top1Holder.tokens / totalSoldTokensFromData) * 100 
                    : 0;
                  
                  return (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Top Share</p>
                          <p className="text-xl font-bold text-purple-600">
                            {top1SharePercentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Top buyer holds {formatNumber(top1Holder.tokens)} tokens ({top1SharePercentage.toFixed(1)}% of sold)
                          </p>
                        </div>
                        <Users className="w-8 h-8 text-purple-600 opacity-50" />
                      </div>
                    </div>
                  );
                })()}

                {/* Funding Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Funding Progress</span>
                    <span className="font-semibold text-card-foreground">
                      {selectedPropertyForPanel.fundingPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        selectedPropertyForPanel.fundingPercentage >= 50 ? 'bg-green-600' : 
                        selectedPropertyForPanel.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(selectedPropertyForPanel.fundingPercentage, 100)}%` }}
                    ></div>
                  </div>
                  {/* 5d Pace for Property */}
                  {(() => {
                    let propTokensSold5d = 0;
                    let propInvestmentRaised5d = 0;
                    
                    if (investmentsData?.data) {
                      const investments = Array.isArray(investmentsData.data)
                        ? investmentsData.data
                        : investmentsData.data?.data || investmentsData.data || [];
                      
                      const now = new Date();
                      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                      const propertyId = selectedPropertyForPanel.id || selectedPropertyForPanel.propertyId;
                      
                      const propInvestments5d = investments.filter(inv => {
                        const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                        const createdAt = new Date(inv.createdAt || inv.created_at || inv.date);
                        return (invPropertyId === propertyId) &&
                               (inv.status === 'confirmed' || inv.status === 'active') &&
                               createdAt >= fiveDaysAgo;
                      });
                      
                      propTokensSold5d = propInvestments5d.reduce((sum, inv) => {
                        return sum + parseFloat(inv.tokensPurchased || inv.tokens || 0);
                      }, 0);
                      
                      propInvestmentRaised5d = propInvestments5d.reduce((sum, inv) => {
                        return sum + parseFloat(inv.amountUSDT || inv.amount || 0);
                      }, 0);
                    }
                    
                    const propAvailableTokens = selectedPropertyForPanel.availableTokens || 0;
                    const propTokensPerDay = propTokensSold5d > 0 ? propTokensSold5d / 5 : 0;
                    let propSellOutETA = null;
                    if (propAvailableTokens <= 0) {
                      propSellOutETA = 'Sold Out';
                    } else if (propTokensPerDay > 0) {
                      const daysToSellOut = Math.ceil(propAvailableTokens / propTokensPerDay);
                      propSellOutETA = `~${daysToSellOut} days`;
                    }
                    
                    return (
                      <>
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="text-xs text-muted-foreground">5d Pace</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {formatNumber(propTokensSold5d)} tokens • {formatCurrency(propInvestmentRaised5d)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {propSellOutETA && (
                          <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-orange-600" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Sell-out ETA</p>
                                  <p className="text-sm font-semibold text-orange-600">
                                    {propSellOutETA}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Organization Info */}
                {selectedPropertyForPanel.organizationName && (
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Organization</p>
                    <p className="text-sm font-semibold text-card-foreground">
                      {selectedPropertyForPanel.organizationName}
                    </p>
                  </div>
                )}

                {/* Investor Count */}
                {selectedPropertyForPanel.investorCount !== undefined && (
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Investors</p>
                    <p className="text-sm font-semibold text-card-foreground">
                      {selectedPropertyForPanel.investorCount} {selectedPropertyForPanel.investorCount === 1 ? 'investor' : 'investors'}
                    </p>
                  </div>
                )}

                {/* Ownership Data */}
                {(() => {
                  const propertyId = selectedPropertyForPanel.id || selectedPropertyForPanel.propertyId;
                  
                  if (!investmentsData?.data) return null;
                  
                  const investments = Array.isArray(investmentsData.data)
                    ? investmentsData.data
                    : investmentsData.data?.data || investmentsData.data || [];
                  
                  // Filter investments up to activeDate or all
                  const filteredInvestments = investments.filter(inv => {
                    const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
                    if (invPropertyId !== propertyId && invPropertyId !== selectedPropertyForPanel.displayCode) {
                      return false;
                    }
                    if (inv.status !== 'confirmed' && inv.status !== 'active') {
                      return false;
                    }
                    if (activeDate) {
                      const invDate = new Date(inv.createdAt || inv.created_at || inv.date);
                      const activeDateObj = new Date(activeDate);
                      // Set to end of day (23:59:59.999) to include all investments on that date
                      activeDateObj.setHours(23, 59, 59, 999);
                      return invDate <= activeDateObj;
                    }
                    return true;
                  });
                  
                  // Generate ownership data from filtered investments
                  const ownershipMap = new Map();
                  filteredInvestments.forEach(inv => {
                    const userId = inv.userId || inv.user_id || inv.user?.id;
                    const userName = inv.user?.name || inv.user?.email || `User ${userId?.slice(0, 8)}` || 'Unknown';
                    const tokens = parseFloat(inv.tokensPurchased || inv.tokens || 0);
                    
                    if (ownershipMap.has(userId)) {
                      ownershipMap.get(userId).tokens += tokens;
                    } else {
                      ownershipMap.set(userId, {
                        userId,
                        userName,
                        tokens,
                        allocationDate: inv.createdAt || inv.created_at || new Date().toISOString()
                      });
                    }
                  });
                  
                  const ownershipData = Array.from(ownershipMap.values());
                  
                  if (ownershipData.length > 0) {
                    const totalSoldTokensAsOf = ownershipData.reduce((sum, holder) => sum + holder.tokens, 0);
                    const ownershipWithPercentages = ownershipData.map(inv => ({
                      ...inv,
                      percentage: selectedPropertyForPanel.totalTokens > 0 
                        ? (inv.tokens / selectedPropertyForPanel.totalTokens) * 100 
                        : 0,
                      percentageOfSold: totalSoldTokensAsOf > 0
                        ? (inv.tokens / totalSoldTokensAsOf) * 100
                        : 0
                    })).sort((a, b) => b.tokens - a.tokens).slice(0, 10);

                    return (
                      <div>
                        <h4 className="text-sm font-semibold text-card-foreground mb-4">Top Investors</h4>
                        <div className="space-y-2">
                          {ownershipWithPercentages.map((inv, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-card-foreground">{inv.userName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(inv.allocationDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-card-foreground">
                                  {formatNumber(inv.tokens)} tokens
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {inv.percentageOfSold ? `${inv.percentageOfSold.toFixed(2)}% of sold` : `${inv.percentage.toFixed(2)}%`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default TokensManagement;

