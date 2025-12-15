import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Coins, 
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
  X
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI, organizationsAPI, investmentsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import TokenFilters from '../../components/tokens/TokenFilters';

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
  
  // Level 2 filters
  const [propertySearchTerm, setPropertySearchTerm] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState('all');

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

  // Get properties for selected organization
  const orgProperties = useMemo(() => {
    if (!selectedOrgId || !propertiesData?.data) return [];
    
    const properties = Array.isArray(propertiesData.data)
      ? propertiesData.data
      : propertiesData.data?.data?.properties || propertiesData.data?.properties || [];

    return properties
      .filter(prop => {
        const orgId = prop.organizationId || prop.organization?.id || prop.organization?.displayCode;
        return orgId === selectedOrgId;
      })
      .map(prop => {
        const totalTokens = parseFloat(prop.totalTokens || prop.tokenization_total_tokens || 0);
        const availableTokens = parseFloat(prop.availableTokens || prop.tokenization_available_tokens || 0);
        const pricePerToken = parseFloat(prop.pricePerTokenUSDT || prop.price_per_token_usdt || 0);
        const totalValue = parseFloat(prop.totalValueUSDT || prop.total_value_usdt || 0);
        const soldTokens = totalTokens - availableTokens;
        
        // Get investments for this property
        const investments = Array.isArray(investmentsData?.data)
          ? investmentsData.data
          : investmentsData?.data?.data || investmentsData?.data || [];
        
        const propInvestments = investments.filter(inv => {
          const invPropertyId = inv.propertyId || inv.property?.id || inv.property?.displayCode;
          return (prop.id === invPropertyId || prop.displayCode === invPropertyId) &&
                 (inv.status === 'confirmed' || inv.status === 'active');
        });

        const totalInvestment = propInvestments.reduce((sum, inv) => {
          return sum + parseFloat(inv.amountUSDT || inv.amount || 0);
        }, 0);

        return {
          id: prop.id,
          displayCode: prop.displayCode,
          name: prop.title || 'Unknown Property',
          status: prop.status || 'active',
          pricePerToken: pricePerToken || (totalTokens > 0 ? totalValue / totalTokens : 0),
          totalTokens: totalTokens,
          soldTokens: soldTokens,
          availableTokens: availableTokens,
          totalValue: totalValue || (pricePerToken * totalTokens),
          totalInvestment: totalInvestment,
          fundingPercentage: totalTokens > 0 ? (soldTokens / totalTokens) * 100 : 0
        };
      });
  }, [selectedOrgId, propertiesData, investmentsData]);

  // Filtered properties for Level 2
  const filteredOrgProperties = useMemo(() => {
    let filtered = orgProperties.filter(prop => {
      const matchesSearch = prop.name.toLowerCase().includes(propertySearchTerm.toLowerCase()) ||
                           (prop.displayCode || '').toLowerCase().includes(propertySearchTerm.toLowerCase());
      const matchesStatus = propertyStatusFilter === 'all' || prop.status === propertyStatusFilter;
      return matchesSearch && matchesStatus;
    });
    return filtered;
  }, [orgProperties, propertySearchTerm, propertyStatusFilter]);

  // Get selected property details
  const selectedProperty = useMemo(() => {
    if (!selectedPropertyId) return null;
    return individualTokens.find(t => t.id === selectedPropertyId);
  }, [selectedPropertyId, individualTokens]);

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    let filtered = tokensData.filter(token => {
      const search = (filters.search || '').toLowerCase();
      if (!search) return true;
      
      return (
        token.name.toLowerCase().includes(search) ||
        (token.displayCode || '').toLowerCase().includes(search)
      );
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sort_by) {
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

      if (filters.sort_order === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [tokensData, filters]);

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

  // Generate mock data for charts and missing data
  const generateMockPriceHistory = (basePrice, days = 30) => {
    const data = [];
    const today = new Date();
    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      data.push({
        date: date.toISOString().split('T')[0],
        price: basePrice * (1 + variation),
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    return data;
  };

  const generateMockOwnershipData = (investmentsData, propertyId) => {
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

  // Navigation helpers
  const navigateToProperties = (orgId) => {
    setSelectedOrgId(orgId);
    setViewLevel('PROPERTIES');
    setSelectedPropertyId(null);
  };

  const navigateToProperty = (propertyId) => {
    setSelectedPropertyId(propertyId);
    setViewLevel('PROPERTY');
  };

  const navigateToOrg = () => {
    setViewLevel('ORG');
    setSelectedOrgId(null);
    setSelectedPropertyId(null);
  };

  const navigateBackToProperties = () => {
    setViewLevel('PROPERTIES');
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
              <p className="text-muted-foreground mt-1">
                Aggregate view of all organization tokens
          </p>
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

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <p className="text-xs text-muted-foreground mb-1">Avg Token Price</p>
                <p className="text-lg font-bold text-card-foreground">
                  {formatCurrency(avgTokenPrice)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                  placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-lg bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
            >
                <option value="name">Organization Name</option>
              <option value="totalTokens">Total Tokens</option>
              <option value="boughtTokens">Bought Tokens</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-card text-card-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
            >
              <option value="asc">Ascending ↑</option>
              <option value="desc">Descending ↓</option>
            </select>
          </div>
        </div>
      </Card>

        {/* Organizations Table with Properties */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Properties
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sold Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Available Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredAndSortedTokens.length === 0 ? (
                <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
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

                    return (
                      <React.Fragment key={org.id}>
                        {/* Organization Row */}
                        <tr className="hover:bg-accent transition-colors bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                              <div className="text-sm font-semibold text-card-foreground">
                                {org.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                                {org.displayCode}
                        </div>
                      </div>
                    </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="info">
                              {org.propertyCount} {org.propertyCount === 1 ? 'property' : 'properties'}
                            </Badge>
                          </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-card-foreground">
                        <Coins className="w-4 h-4 mr-1 text-blue-600" />
                              <span className="font-semibold">{formatNumber(org.totalTokens)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-card-foreground">
                        <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                              <span className="font-semibold text-green-600">{formatNumber(org.boughtTokens)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-card-foreground">
                        <Coins className="w-4 h-4 mr-1 text-orange-600" />
                              <span className="font-semibold">{formatNumber(org.availableTokens)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-card-foreground">
                        <DollarSign className="w-4 h-4 mr-1 text-purple-600" />
                              <span className="font-semibold text-purple-600">{formatCurrency(org.totalInvestment)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigateToProperties(org.id)}
                            >
                              View Properties
                            </Button>
                    </td>
                  </tr>
                        
                        {/* Properties Rows (expandable or visible) */}
                        {orgProps.map((prop) => (
                          <tr 
                            key={prop.id} 
                            className="hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => navigateToProperty(prop.id)}
                          >
                            <td className="px-6 py-3 pl-12 text-sm text-muted-foreground">
                              <ChevronRight className="w-4 h-4 inline mr-2" />
                              {prop.propertyName}
                            </td>
                            <td className="px-6 py-3">
                              {getStatusBadge(prop.status)}
                            </td>
                            <td className="px-6 py-3 text-sm text-card-foreground">
                              {formatCurrency(prop.pricePerToken)}
                            </td>
                            <td className="px-6 py-3 text-sm text-card-foreground">
                              {formatNumber(prop.totalTokens)}
                            </td>
                            <td className="px-6 py-3 text-sm text-green-600">
                              {formatNumber(prop.soldTokens)}
                            </td>
                            <td className="px-6 py-3 text-sm text-orange-600">
                              {formatNumber(prop.availableTokens)}
                            </td>
                            <td className="px-6 py-3 text-sm text-card-foreground">
                              {formatCurrency(prop.totalTokenValue)}
                            </td>
                            <td className="px-6 py-3">
                              <div className="w-24 bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    prop.fundingPercentage >= 50 ? 'bg-green-600' : 
                                    prop.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${Math.min(prop.fundingPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToProperty(prop.id);
                                }}
                              >
                                Details
                              </Button>
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
    if (!selectedToken) {
      return (
        <div className="text-center py-12">
          <Coins className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Please select a token to view details</p>
        </div>
      );
    }

    const token = selectedToken;
    const ownershipData = generateMockOwnershipData(investmentsData, token.propertyId);
    const totalOwnership = ownershipData.reduce((sum, inv) => sum + inv.tokens, 0);
    const priceHistory = generateMockPriceHistory(token.pricePerToken, 30);
    
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

    // Mock yield data
    const yieldData = [
      { period: 'Q1 2024', payout: 12500, yield: 8.5 },
      { period: 'Q2 2024', payout: 13200, yield: 8.7 },
      { period: 'Q3 2024', payout: 14100, yield: 9.0 },
      { period: 'Q4 2024', payout: 13800, yield: 8.9 }
    ];

    // Mock sales velocity data
    const salesVelocityData = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        unitsSold: Math.floor(Math.random() * 500) + 100,
        investors: Math.floor(Math.random() * 20) + 5
      };
    });

    // Mock audit log
    const auditLog = [
      { action: 'Price Update', field: 'Price Per Token', oldValue: '$45.20', newValue: '$46.50', by: 'Admin User', date: '2024-01-15' },
      { action: 'Status Change', field: 'Status', oldValue: 'Draft', newValue: 'Active', by: 'Admin User', date: '2024-01-10' },
      { action: 'Token Allocation', field: 'Available Tokens', oldValue: '10,000', newValue: '9,500', by: 'System', date: '2024-01-08' }
    ];

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
                value={selectedTokenId || ''}
                onChange={(e) => setSelectedTokenId(e.target.value || null)}
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
              onClick={() => setViewMode('overview')}
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

        {/* P1: Valuation & Pricing */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground mb-1">Current Price</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(token.pricePerToken)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Min Price (30d)</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(Math.min(...priceHistory.map(p => p.price)))}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Max Price (30d)</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(Math.max(...priceHistory.map(p => p.price)))}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Last Valuation: {formatDate(new Date().toISOString())}
              </p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Price per Token"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
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

        {/* P2: Yield & Returns */}
        {expandedSections.yield ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Yield & Returns
              </h3>
              <button onClick={() => toggleSection('yield')}>
                {expandedSections.yield ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-muted-foreground mb-1">Expected Annual Yield</p>
                <p className="text-2xl font-bold text-green-600">8.5%</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Distribution Frequency</p>
                <p className="text-xl font-semibold text-card-foreground">Quarterly</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Last Payout</p>
                <p className="text-xl font-semibold text-card-foreground">{formatDate('2024-01-15')}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Next Payout</p>
                <p className="text-xl font-semibold text-card-foreground">{formatDate('2024-04-15')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Payouts per Period</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yieldData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="payout" fill="#10b981" name="Payout (USD)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Yield Over Time</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yieldData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="yield" stroke="#3b82f6" strokeWidth={2} name="Yield %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Yield & Returns
              </h3>
              <button onClick={() => toggleSection('yield')}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

        {/* P2: Performance Analytics */}
        {expandedSections.performance ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Performance Analytics
              </h3>
              <button onClick={() => toggleSection('performance')}>
                {expandedSections.performance ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Sales Velocity (Units Sold)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesVelocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="unitsSold" stroke="#3b82f6" strokeWidth={2} name="Units Sold" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Investor Growth</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesVelocityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="investors" stroke="#10b981" strokeWidth={2} name="Investor Count" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Top 10 Concentration:</strong> {
                  ownershipWithPercentages.slice(0, 10).reduce((sum, inv) => sum + inv.percentage, 0).toFixed(2)
                }% of total tokens
                </p>
              </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Performance Analytics
              </h3>
              <button onClick={() => toggleSection('performance')}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}

        {/* P3: Audit & Reporting */}
        {expandedSections.audit ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit & Reporting
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV([token], `token-summary-${token.displayCode || token.id}.csv`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Summary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(ownershipWithPercentages, `token-ownership-${token.displayCode || token.id}.csv`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Ownership
                </Button>
                <button onClick={() => toggleSection('audit')}>
                  {expandedSections.audit ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-card-foreground mb-4">Change Log</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Field</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Old → New</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLog.map((log, idx) => (
                      <tr key={idx} className="hover:bg-accent">
                        <td className="px-4 py-3 text-sm text-card-foreground">{log.action}</td>
                        <td className="px-4 py-3 text-sm text-card-foreground">{log.field}</td>
                        <td className="px-4 py-3 text-sm text-card-foreground">
                          <span className="text-muted-foreground">{log.oldValue}</span>
                          <span className="mx-2">→</span>
                          <span className="font-semibold">{log.newValue}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{log.by}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(log.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit & Reporting
              </h3>
              <button onClick={() => toggleSection('audit')}>
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // Render Level 2: Properties Breakdown Panel
  const renderLevel2PropertiesPanel = () => {
    if (!selectedOrg) return null;

    const orgTotalValue = filteredOrgProperties.reduce((sum, p) => sum + p.totalValue, 0);
    const orgTotalTokens = filteredOrgProperties.reduce((sum, p) => sum + p.totalTokens, 0);
    const orgSoldTokens = filteredOrgProperties.reduce((sum, p) => sum + p.soldTokens, 0);

    return (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
          onClick={() => navigateToOrg()}
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
                <h3 className="text-xl font-bold text-card-foreground">{selectedOrg.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredOrgProperties.length} {filteredOrgProperties.length === 1 ? 'property' : 'properties'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateToOrg()}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Summary */}
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                  <p className="text-lg font-bold text-card-foreground">{formatCurrency(orgTotalValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                  <p className="text-lg font-bold text-blue-600">{formatNumber(orgTotalTokens)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sold Tokens</p>
                  <p className="text-lg font-bold text-green-600">{formatNumber(orgSoldTokens)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Available</p>
                  <p className="text-lg font-bold text-orange-600">{formatNumber(orgTotalTokens - orgSoldTokens)}</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-6 border-b border-border space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Search Properties</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={propertySearchTerm}
                    onChange={(e) => setPropertySearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg bg-card text-card-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status Filter</label>
                <select
                  value={propertyStatusFilter}
                  onChange={(e) => setPropertyStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-card text-card-foreground rounded-lg"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                  <option value="distribution">Distribution</option>
                </select>
              </div>
            </div>

            {/* Properties List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredOrgProperties.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No properties found</p>
                </div>
              ) : (
                filteredOrgProperties.map((prop) => (
                  <Card key={prop.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToProperty(prop.id)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-card-foreground mb-1">{prop.name}</h4>
                        <p className="text-xs text-muted-foreground">{prop.displayCode}</p>
                      </div>
                      {getStatusBadge(prop.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Token Price</p>
                        <p className="text-sm font-semibold text-card-foreground">{formatCurrency(prop.pricePerToken)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                        <p className="text-sm font-semibold text-purple-600">{formatCurrency(prop.totalValue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sold</p>
                        <p className="text-sm font-semibold text-green-600">{formatNumber(prop.soldTokens)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Available</p>
                        <p className="text-sm font-semibold text-orange-600">{formatNumber(prop.availableTokens)}</p>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            prop.fundingPercentage >= 50 ? 'bg-green-600' : 
                            prop.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(prop.fundingPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{prop.fundingPercentage.toFixed(1)}% funded</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToProperty(prop.id);
                      }}
                    >
                      View Property Details
                    </Button>
          </Card>
                ))
              )}
        </div>
          </Card>
        </div>
      </>
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
    const ownershipData = generateMockOwnershipData(investmentsData, token.propertyId);
    const priceHistory = generateMockPriceHistory(token.pricePerToken, 30);
    
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
    const yieldData = [
      { period: 'Q1 2024', payout: 12500, yield: 8.5 },
      { period: 'Q2 2024', payout: 13200, yield: 8.7 },
      { period: 'Q3 2024', payout: 14100, yield: 9.0 },
      { period: 'Q4 2024', payout: 13800, yield: 8.9 }
    ];

    const auditLog = [
      { action: 'Price Update', field: 'Price Per Token', oldValue: '$45.20', newValue: '$46.50', by: 'Admin User', date: '2024-01-15' },
      { action: 'Status Change', field: 'Status', oldValue: 'Draft', newValue: 'Active', by: 'Admin User', date: '2024-01-10' },
      { action: 'Token Allocation', field: 'Available Tokens', oldValue: '10,000', newValue: '9,500', by: 'System', date: '2024-01-08' }
    ];

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
              <div className="flex items-center gap-4">
                {getStatusBadge(token.status)}
                <div>
                  <p className="text-xs text-muted-foreground">Token Price</p>
                  <p className="text-lg font-bold text-card-foreground">{formatCurrency(token.pricePerToken)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="text-sm text-card-foreground">{formatDate(new Date().toISOString())}</p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigateBackToProperties()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Properties
            </Button>
          </div>
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
                <p className="text-sm text-muted-foreground mb-1">Min Price (30d)</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(Math.min(...priceHistory.map(p => p.price)))}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Max Price (30d)</p>
                <p className="text-xl font-semibold text-card-foreground">
                  {formatCurrency(Math.max(...priceHistory.map(p => p.price)))}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                Last Valuation: {formatDate(new Date().toISOString())}
              </p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Price per Token"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
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

        {/* Yield & Returns */}
        {expandedSections.yield && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Yield & Returns
              </h3>
              <button onClick={() => toggleSection('yield')}>
                {expandedSections.yield ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-muted-foreground mb-1">Expected Annual Yield</p>
                <p className="text-2xl font-bold text-green-600">8.5%</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Distribution Frequency</p>
                <p className="text-xl font-semibold text-card-foreground">Quarterly</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Last Payout</p>
                <p className="text-xl font-semibold text-card-foreground">{formatDate('2024-01-15')}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Next Payout</p>
                <p className="text-xl font-semibold text-card-foreground">{formatDate('2024-04-15')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Payouts per Period</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yieldData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="payout" fill="#10b981" name="Payout (USD)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-4">Yield Over Time</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yieldData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="yield" stroke="#3b82f6" strokeWidth={2} name="Yield %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Audit & Reporting */}
        {expandedSections.audit && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit & Reporting
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV([token], `token-summary-${token.displayCode || token.id}.csv`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Summary
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(ownershipWithPercentages, `token-ownership-${token.displayCode || token.id}.csv`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Ownership
                </Button>
                <button onClick={() => toggleSection('audit')}>
                  {expandedSections.audit ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Field</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Old → New</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLog.map((log, idx) => (
                    <tr key={idx} className="hover:bg-accent">
                      <td className="px-4 py-3 text-sm text-card-foreground">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-card-foreground">{log.field}</td>
                      <td className="px-4 py-3 text-sm text-card-foreground">
                        <span className="text-muted-foreground">{log.oldValue}</span>
                        <span className="mx-2">→</span>
                        <span className="font-semibold">{log.newValue}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{log.by}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(log.date)}</td>
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
      {/* Breadcrumbs (only show for Level 2 and 3) */}
      {(viewLevel === 'PROPERTIES' || viewLevel === 'PROPERTY') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigateToOrg()} className="hover:text-card-foreground transition-colors">
            Organizations
          </button>
          {viewLevel === 'PROPERTY' && (
            <>
              <ChevronRight className="w-4 h-4" />
              <button onClick={() => navigateBackToProperties()} className="hover:text-card-foreground transition-colors">
                {selectedOrg?.name || 'Properties'}
              </button>
            </>
          )}
          {viewLevel === 'PROPERTY' && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-card-foreground font-medium">{selectedProperty?.propertyName || 'Property'}</span>
            </>
          )}
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
            {viewLevel === 'PROPERTIES' && `Properties under ${selectedOrg?.name || 'Organization'}`}
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
      {viewLevel === 'PROPERTIES' && (
        <>
          {renderLevel1OrgView()}
          {renderLevel2PropertiesPanel()}
        </>
      )}
      {viewLevel === 'PROPERTY' && renderLevel3PropertyDetails()}
    </div>
  );
};

export default TokensManagement;

