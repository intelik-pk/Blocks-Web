import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Coins, 
  Building2,
  TrendingUp,
  DollarSign,
  X,
  BarChart3,
  Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI, organizationsAPI, investmentsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import TokenFilters from '../../components/tokens/TokenFilters';

const TokensManagement = () => {
  const { isAuthenticated } = useAdminAuth();
  
  // Unified filters state
  const [filters, setFilters] = useState({
    search: '',
    sort_by: 'name',
    sort_order: 'asc'
  });

  // Panel state
  const [selectedTokenOrganization, setSelectedTokenOrganization] = useState(null);
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(false);
  const [propertySortBy, setPropertySortBy] = useState('tokensAllocated'); // 'tokensAllocated', 'fundingPercentage'
  const [propertySortOrder, setPropertySortOrder] = useState('desc');
  const [analyticsTab, setAnalyticsTab] = useState('allocation'); // 'allocation', 'funding', 'performance'

  // Handler for filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle opening property panel
  const handleOpenPropertyPanel = (token) => {
    setSelectedTokenOrganization(token);
    setIsPropertyPanelOpen(true);
  };

  // Handle closing property panel
  const handleClosePropertyPanel = () => {
    setIsPropertyPanelOpen(false);
    setSelectedTokenOrganization(null);
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isPropertyPanelOpen) {
        handleClosePropertyPanel();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isPropertyPanelOpen]);

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

  const formatNumberTwoDecimals = (num) => {
    if (num === 0) return '0.00';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Coins className="w-6 h-6" />
            Tokens
          </h2>
          <p className="text-muted-foreground">
            View organization tokens and their market statistics
            {filteredAndSortedTokens.length > 0 && (
              <span className="ml-2 text-blue-600 font-semibold">
                ({filteredAndSortedTokens.length} {filteredAndSortedTokens.length === 1 ? 'token' : 'tokens'} found)
              </span>
            )}
          </p>
        </div>
      </div>
      
       {/* Summary Statistics */}
       {filteredAndSortedTokens.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-shrink-0 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                <p className="text-lg font-bold text-card-foreground">
                  {formatNumber(filteredAndSortedTokens.reduce((sum, t) => sum + t.totalTokens, 0))}
                </p>
              </div>
              <Coins className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bought Tokens</p>
                <p className="text-lg font-bold text-green-600">
                  {formatNumber(filteredAndSortedTokens.reduce((sum, t) => sum + t.boughtTokens, 0))}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Available Tokens</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatNumber(filteredAndSortedTokens.reduce((sum, t) => sum + t.availableTokens, 0))}
                </p>
              </div>
              <Coins className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Investment</p>
                <p className="text-lg font-bold text-purple-600">
                  ${formatNumber(filteredAndSortedTokens.reduce((sum, t) => sum + t.totalInvestment, 0))}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Organizations</p>
                <p className="text-lg font-bold text-card-foreground">
                  {filteredAndSortedTokens.length}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Container - Flex Layout */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        {/* Left Content - Main Dashboard */}
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isPropertyPanelOpen ? 'xl:pr-6' : ''}`}>
      {/* Filters */}
          <div className="flex-shrink-0 mb-6">
            <TokenFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>

      {/* Tokens Table */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  Token Name
                </th>
                <th className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  Total
                </th>
                <th className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  Bought
                </th>
                <th className={`${isPropertyPanelOpen ? 'px-3 lg:px-4 hidden lg:table-cell' : 'px-6'} py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  Available
                </th>
                <th className={`${isPropertyPanelOpen ? 'px-3 lg:px-4 hidden xl:table-cell' : 'px-6'} py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  Investment
                </th>
                <th className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  Progress
                </th>
                <th className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`}>
                  Properties
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredAndSortedTokens.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No tokens found</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedTokens.map((token) => (
                  <tr key={token.id} className="hover:bg-accent transition-colors">
                    <td className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-4 ${isPropertyPanelOpen ? 'lg:whitespace-normal' : 'whitespace-nowrap'}`}>
                      <div>
                        <div className={`text-sm font-medium text-card-foreground ${isPropertyPanelOpen ? 'truncate max-w-[120px]' : ''}`}>
                          {token.name}
                        </div>
                        <div className={`text-xs text-muted-foreground ${isPropertyPanelOpen ? 'truncate max-w-[120px]' : ''}`}>
                          {token.displayCode}
                        </div>
                      </div>
                    </td>
                    <td className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-4 ${isPropertyPanelOpen ? 'lg:whitespace-normal' : 'whitespace-nowrap'}`}>
                      <div className="flex items-center text-sm text-card-foreground">
                        {!isPropertyPanelOpen && <Coins className="w-4 h-4 mr-1 text-blue-600 flex-shrink-0" />}
                        <span className="font-semibold truncate">{formatNumber(token.totalTokens)}</span>
                      </div>
                    </td>
                    <td className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-4 ${isPropertyPanelOpen ? 'lg:whitespace-normal' : 'whitespace-nowrap'}`}>
                      <div className="flex items-center text-sm text-card-foreground">
                        {!isPropertyPanelOpen && <TrendingUp className="w-4 h-4 mr-1 text-green-600 flex-shrink-0" />}
                        <span className="font-semibold text-green-600 truncate">{formatNumber(token.boughtTokens)}</span>
                      </div>
                    </td>
                    <td className={`${isPropertyPanelOpen ? 'px-3 lg:px-4 hidden lg:table-cell' : 'px-6'} py-4 ${isPropertyPanelOpen ? 'lg:whitespace-normal' : 'whitespace-nowrap'}`}>
                      <div className="flex items-center text-sm text-card-foreground">
                        {!isPropertyPanelOpen && <Coins className="w-4 h-4 mr-1 text-orange-600 flex-shrink-0" />}
                        <span className="font-semibold text-orange-600 truncate">{formatNumber(token.availableTokens)}</span>
                      </div>
                    </td>
                    <td className={`${isPropertyPanelOpen ? 'px-3 lg:px-4 hidden xl:table-cell' : 'px-6'} py-4 ${isPropertyPanelOpen ? 'lg:whitespace-normal' : 'whitespace-nowrap'}`}>
                      <div className="flex items-center text-sm text-card-foreground">
                        {!isPropertyPanelOpen && <DollarSign className="w-4 h-4 mr-1 text-purple-600 flex-shrink-0" />}
                        <span className="font-semibold text-purple-600 truncate">${formatNumber(token.totalInvestment)}</span>
                      </div>
                    </td>
                    <td className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-4 ${isPropertyPanelOpen ? 'lg:whitespace-normal' : 'whitespace-nowrap'}`}>
                      <div className="flex items-center gap-1.5">
                        <div className={`${isPropertyPanelOpen ? 'w-16 lg:w-20' : 'w-24'} bg-muted rounded-full h-2 flex-shrink-0`}>
                          <div
                            className={`h-2 rounded-full ${
                              token.fundingPercentage >= 50 ? 'bg-green-600' : 
                              token.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(token.fundingPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`${isPropertyPanelOpen ? 'text-xs' : 'text-sm'} font-medium text-card-foreground whitespace-nowrap`}>
                          {token.fundingPercentage.toFixed(isPropertyPanelOpen ? 0 : 2)}%
                        </span>
                      </div>
                    </td>
                    <td className={`${isPropertyPanelOpen ? 'px-3 lg:px-4' : 'px-6'} py-4 whitespace-nowrap`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPropertyPanel(token);
                        }}
                        className="cursor-pointer"
                      >
                        <Badge 
                          variant="info" 
                          className="cursor-pointer hover:bg-blue-600 transition-colors"
                        >
                        {token.propertyCount} {token.propertyCount === 1 ? 'property' : 'properties'}
                      </Badge>
                      </button>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Property Details Panel - Right Side */}
        {isPropertyPanelOpen && selectedTokenOrganization && (
          <>
            {/* Backdrop - Tablet and Mobile */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 xl:hidden"
              onClick={handleClosePropertyPanel}
            />
            
            {/* Side Panel */}
            <div 
              className="fixed right-0 top-0 bottom-0 w-full max-w-[90vw] sm:max-w-md xl:relative xl:top-auto xl:right-auto xl:bottom-auto xl:w-[40vw] xl:max-w-none z-[60] xl:z-auto flex flex-col flex-shrink-0"
              style={{
                animation: isPropertyPanelOpen ? 'slideInFromRight 0.3s ease-out' : 'none',
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
                @media (max-width: 767px) {
                  @keyframes slideInFromRight {
                    from {
                      transform: translateY(100%);
                      opacity: 0;
                    }
                    to {
                      transform: translateY(0);
                      opacity: 1;
                    }
                  }
                }
              `}</style>
              {/* Divider */}
              <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-px bg-border/50"></div>
              <Card className="h-full flex flex-col rounded-none xl:rounded-xl shadow-2xl xl:shadow-lg border-l border-border/50 xl:border-l-0 overflow-hidden">
                {/* Panel Header */}
                <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border/50 px-6 py-4 shadow-sm flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex-shrink-0 border border-blue-500/30">
                        <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-card-foreground truncate mb-1">
                          {selectedTokenOrganization.name}
                        </h3>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {selectedTokenOrganization.displayCode}
                          </span>
                          <Badge variant="info">
                            {selectedTokenOrganization.propertyCount} Properties
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleClosePropertyPanel}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 flex-shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-2 lg:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                      <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {selectedTokenOrganization.propertyCount}
                        </p>
                      </Card>
                      <Card className="p-3 lg:p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl border border-green-500/20">
                        <div className="flex items-center gap-1.5 lg:gap-2 mb-1.5 lg:mb-2">
                          <Coins className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-green-600 dark:text-green-400" />
                          <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide">Allocated</span>
                        </div>
                        <p className="text-lg lg:text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatNumberTwoDecimals(selectedTokenOrganization.totalTokens)}
                        </p>
                      </Card>
                      <Card className="p-3 lg:p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl border border-purple-500/20">
                        <div className="flex items-center gap-1.5 lg:gap-2 mb-1.5 lg:mb-2">
                          <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide">Sold</span>
                        </div>
                        <p className="text-lg lg:text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatNumberTwoDecimals(selectedTokenOrganization.boughtTokens)}
                        </p>
                      </Card>
                      <Card className="p-3 lg:p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl border border-orange-500/20">
                        <div className="flex items-center gap-1.5 lg:gap-2 mb-1.5 lg:mb-2">
                          <Coins className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-600 dark:text-orange-400" />
                          <span className="text-[10px] lg:text-xs font-medium text-muted-foreground uppercase tracking-wide">Available</span>
                        </div>
                        <p className="text-lg lg:text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {formatNumberTwoDecimals(selectedTokenOrganization.availableTokens)}
                        </p>
                      </Card>
                    </div>

                    {/* Property Breakdown Table */}
                    {selectedTokenOrganization.orgProperties && selectedTokenOrganization.orgProperties.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide flex items-center gap-2">
                              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                              Property Breakdown
                            </h4>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setPropertySortBy('tokensAllocated');
                                  setPropertySortOrder(propertySortBy === 'tokensAllocated' && propertySortOrder === 'asc' ? 'desc' : 'asc');
                                }}
                                className={`text-xs px-2 py-1 rounded ${propertySortBy === 'tokensAllocated' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                              >
                                Tokens {propertySortBy === 'tokensAllocated' && (propertySortOrder === 'asc' ? '↑' : '↓')}
                              </button>
                              <button
                                onClick={() => {
                                  setPropertySortBy('fundingPercentage');
                                  setPropertySortOrder(propertySortBy === 'fundingPercentage' && propertySortOrder === 'asc' ? 'desc' : 'asc');
                                }}
                                className={`text-xs px-2 py-1 rounded ${propertySortBy === 'fundingPercentage' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
                              >
                                Funding % {propertySortBy === 'fundingPercentage' && (propertySortOrder === 'asc' ? '↑' : '↓')}
                              </button>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Property</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Code</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Allocated</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Sold</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Available</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Progress</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {[...selectedTokenOrganization.orgProperties]
                                  .sort((a, b) => {
                                    const aValue = propertySortBy === 'tokensAllocated' ? a.tokensAllocated : a.fundingPercentage;
                                    const bValue = propertySortBy === 'tokensAllocated' ? b.tokensAllocated : b.fundingPercentage;
                                    return propertySortOrder === 'asc' 
                                      ? (aValue > bValue ? 1 : aValue < bValue ? -1 : 0)
                                      : (aValue < bValue ? 1 : aValue > bValue ? -1 : 0);
                                  })
                                  .map((property) => (
                                    <tr key={property.id} className="hover:bg-accent transition-colors cursor-pointer">
                                      <td className="px-2 lg:px-3 py-1.5 lg:py-2 font-medium text-card-foreground truncate max-w-[100px] lg:max-w-none">{property.name}</td>
                                      <td className="px-2 lg:px-3 py-1.5 lg:py-2 text-muted-foreground hidden sm:table-cell truncate">{property.displayCode}</td>
                                      <td className="px-2 lg:px-3 py-1.5 lg:py-2 truncate">{formatNumberTwoDecimals(property.tokensAllocated)}</td>
                                      <td className="px-2 lg:px-3 py-1.5 lg:py-2 text-green-600 truncate">{formatNumberTwoDecimals(property.tokensSold)}</td>
                                      <td className="px-2 lg:px-3 py-1.5 lg:py-2 text-orange-600 hidden md:table-cell truncate">{formatNumberTwoDecimals(property.availableTokens)}</td>
                                      <td className="px-2 lg:px-3 py-1.5 lg:py-2">
                                        <div className="flex items-center gap-1.5 lg:gap-2">
                                          <div className="w-12 lg:w-16 bg-muted rounded-full h-1.5 lg:h-2 flex-shrink-0">
                                            <div
                                              className={`h-1.5 lg:h-2 rounded-full ${
                                                property.fundingPercentage >= 50 ? 'bg-green-600' : 
                                                property.fundingPercentage >= 25 ? 'bg-yellow-600' : 'bg-blue-600'
                                              }`}
                                              style={{ width: `${Math.min(property.fundingPercentage, 100)}%` }}
                                            ></div>
                                          </div>
                                          <span className="text-[10px] lg:text-xs whitespace-nowrap">{property.fundingPercentage.toFixed(0)}%</span>
                                        </div>
                                      </td>
                                      <td className="px-2 lg:px-3 py-1.5 lg:py-2 hidden lg:table-cell">
                                        <Badge variant={property.status === 'active' ? 'success' : property.status === 'completed' ? 'info' : 'warning'} className="text-[10px]">
                                          {property.status || 'Active'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Analytics Section */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide flex items-center gap-2">
                            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                            Analytics
                          </h4>
                          
                          {/* Tabs */}
                          <div className="flex gap-1 lg:gap-2 border-b border-border overflow-x-auto">
                            {['allocation', 'funding', 'performance'].map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setAnalyticsTab(tab)}
                                className={`px-2 lg:px-4 py-1.5 lg:py-2 text-xs lg:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                                  analyticsTab === tab
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-muted-foreground hover:text-card-foreground'
                                }`}
                              >
                                {tab === 'allocation' ? 'Allocation' : tab === 'funding' ? 'Funding' : 'Performance'}
                              </button>
                            ))}
                          </div>

                          {/* Chart Content */}
                          <Card className="p-3 lg:p-4">
                            {analyticsTab === 'allocation' && (
                              <div className="space-y-3">
                                <h5 className="text-xs lg:text-sm font-semibold text-card-foreground">Token Allocation by Property</h5>
                                <div className="h-48 lg:h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={selectedTokenOrganization.orgProperties.map(p => ({
                                          name: p.name.length > 12 ? p.name.substring(0, 12) + '...' : p.name,
                                          value: p.tokensAllocated
                                        }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        outerRadius={60}
                                        fill="#8884d8"
                                        dataKey="value"
                                      >
                                        {selectedTokenOrganization.orgProperties.map((entry, index) => {
                                          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
                                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                        })}
                                      </Pie>
                                      <Tooltip />
                                      <Legend 
                                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                        iconSize={8}
                                      />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {analyticsTab === 'funding' && (
                              <div className="space-y-3">
                                <h5 className="text-xs lg:text-sm font-semibold text-card-foreground">Funding Progress by Property</h5>
                                <div className="h-48 lg:h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                      data={selectedTokenOrganization.orgProperties.map(p => ({
                                        name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
                                        percentage: parseFloat(p.fundingPercentage.toFixed(1))
                                      }))}
                                      margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis 
                                        dataKey="name" 
                                        angle={-45} 
                                        textAnchor="end" 
                                        height={60}
                                        tick={{ fontSize: 10 }}
                                      />
                                      <YAxis tick={{ fontSize: 10 }} />
                                      <Tooltip />
                                      <Bar dataKey="percentage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {analyticsTab === 'performance' && (
                              <div className="space-y-3">
                                <h5 className="text-xs lg:text-sm font-semibold text-card-foreground">Token Sales Over Time</h5>
                                <div className="h-48 lg:h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart 
                                      data={selectedTokenOrganization.orgProperties.map((p, idx) => ({
                                        name: `P${idx + 1}`,
                                        tokens: p.tokensSold,
                                        available: p.availableTokens
                                      }))}
                                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                      <YAxis tick={{ fontSize: 10 }} />
                                      <Tooltip />
                                      <Area type="monotone" dataKey="tokens" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                                      <Area type="monotone" dataKey="available" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </Card>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No properties linked to this token</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TokensManagement;

