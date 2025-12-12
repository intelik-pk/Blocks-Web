import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Eye, 
  Building2,
  MapPin,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  Calendar,
  FileText
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { organizationsAPI, adminAPI } from '../../services/api';
import { useOrganizationAuth } from '../../components/organization/OrganizationAuth';
import OrgPropertyRequestsManagement from './OrgPropertyRequestsManagement';
import { cn } from '../../utils/cn';

const OrgPropertiesManagement = ({ organizationId }) => {
  const { isAuthenticated } = useOrganizationAuth();
  const navigate = useNavigate();
  
  // Sub-tab state: 'properties' or 'property-requests'
  const [activeSubTab, setActiveSubTab] = useState('properties');
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    property_type: '',
    startDate: '',
    endDate: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    property_type: '',
    startDate: '',
    endDate: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch properties using organization API (with fallback)
  const { data: propertiesData, isLoading, error } = useQuery(
    ['org-properties', organizationId],
    async () => {
      try {
        console.log('🔄 Fetching properties for organization:', organizationId);
        // Try organization-specific endpoint first
        const response = await organizationsAPI.getProperties(organizationId);
        console.log('✅ Properties API Response (org endpoint):', response);
        return response;
      } catch (error) {
        console.log('ℹ️ Organization properties endpoint not available, using fallback with filter');
        // Fallback to filtered admin endpoint
        const response = await adminAPI.getProperties({
          limit: 1000,
          organizationId: organizationId
        });
        console.log('✅ Properties API Response (admin endpoint):', response);
        return response;
      }
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated && !!organizationId
    }
  );

  const allProperties = propertiesData?.data?.data?.properties || 
                       propertiesData?.data?.properties || 
                       propertiesData?.data || 
                       (Array.isArray(propertiesData) ? propertiesData : []);

  // Debug: Log property data structure
  React.useEffect(() => {
    if (allProperties.length > 0) {
      console.log('📋 Properties Data Sample:', {
        count: allProperties.length,
        firstProperty: allProperties[0],
        fields: Object.keys(allProperties[0] || {})
      });
    }
  }, [allProperties]);

  // Frontend filtering with date range and sorting
  const filteredProperties = useMemo(() => {
    let filtered = [...allProperties];
    
    if (appliedFilters.search) {
      const searchLower = appliedFilters.search.toLowerCase();
      filtered = filtered.filter(property =>
        (property.title || property.name || '').toLowerCase().includes(searchLower) ||
        (property.city || property.location || '').toLowerCase().includes(searchLower) ||
        (property.country || '').toLowerCase().includes(searchLower) ||
        (property.displayCode || '').toLowerCase().includes(searchLower)
      );
    }
    
    if (appliedFilters.status) {
      filtered = filtered.filter(property =>
        (property.status || '').toLowerCase() === appliedFilters.status.toLowerCase()
      );
    }
    
    if (appliedFilters.property_type) {
      filtered = filtered.filter(property =>
        (property.type || property.propertyType || property.property_type || '').toLowerCase() === appliedFilters.property_type.toLowerCase()
      );
    }
    
    // Date range filtering
    if (appliedFilters.startDate) {
      const startDate = new Date(appliedFilters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(property => {
        const propDate = new Date(property.created_at || property.createdAt || property.date);
        propDate.setHours(0, 0, 0, 0);
        return propDate >= startDate;
      });
    }
    
    if (appliedFilters.endDate) {
      const endDate = new Date(appliedFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(property => {
        const propDate = new Date(property.created_at || property.createdAt || property.date);
        return propDate <= endDate;
      });
    }
    
    // Sorting
    filtered.sort((a, b) => {
      if (appliedFilters.sort_by === 'created_at' || appliedFilters.sort_by === 'date') {
        const dateA = new Date(a.created_at || a.createdAt || a.date || 0);
        const dateB = new Date(b.created_at || b.createdAt || b.date || 0);
        return appliedFilters.sort_order === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (appliedFilters.sort_by === 'name') {
        const nameA = (a.title || a.name || '').toLowerCase();
        const nameB = (b.title || b.name || '').toLowerCase();
        return appliedFilters.sort_order === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      } else if (appliedFilters.sort_by === 'price') {
        const priceA = parseFloat(a.pricePerTokenUSDT || a.pricePerToken || a.price_per_token || 0);
        const priceB = parseFloat(b.pricePerTokenUSDT || b.pricePerToken || b.price_per_token || 0);
        return appliedFilters.sort_order === 'desc' ? priceB - priceA : priceA - priceB;
      }
      return 0;
    });
    
    return filtered;
  }, [allProperties, appliedFilters]);
  
  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const paginatedProperties = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredProperties.slice(startIdx, endIdx);
  }, [filteredProperties, currentPage]);
  
  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setCurrentPage(1);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyFilters();
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'USD 0';
    return `USD ${parseFloat(amount).toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'available':
        return <Badge variant="green">Available</Badge>;
      case 'sold':
        return <Badge variant="gray">Sold</Badge>;
      case 'pending':
        return <Badge variant="yellow">Pending</Badge>;
      default:
        return <Badge variant="gray">{status || 'Unknown'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load properties</p>
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
          <h2 className="text-2xl font-bold text-card-foreground">Properties Management</h2>
          <p className="text-muted-foreground">
            Manage your organization's properties
            {activeSubTab === 'properties' && (
              <span className="ml-2 text-primary font-medium">
                ({filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveSubTab('properties')}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
            activeSubTab === 'properties'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-card-foreground"
          )}
        >
          <Building2 className="w-4 h-4" />
          Properties
        </button>
        <button
          onClick={() => setActiveSubTab('property-requests')}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2",
            activeSubTab === 'property-requests'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-card-foreground"
          )}
        >
          <FileText className="w-4 h-4" />
          Property Requests
        </button>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'property-requests' ? (
        <OrgPropertyRequestsManagement organizationId={organizationId} />
      ) : (
        <>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyPress={handleKeyPress}
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
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <select
              value={filters.property_type}
              onChange={(e) => handleFilterChange('property_type', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
            >
              <option value="">All Types</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="plot">Plot</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-primary"
            >
              <option value="created_at">Date Created</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button onClick={handleApplyFilters} className="w-full flex items-center justify-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Apply Filters</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Properties Grid */}
      {paginatedProperties.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground mb-2">No properties found</h3>
          <p className="text-muted-foreground">
            {appliedFilters.search || appliedFilters.status || appliedFilters.property_type
              ? 'Try adjusting your filters'
              : 'No properties have been added yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-card-foreground mb-1">
                      {property.title || property.name || 'Unnamed Property'}
                    </h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.city || property.location || 'No location'}
                      {property.country && `, ${property.country}`}
                    </div>
                  </div>
                  {getStatusBadge(property.status)}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Price per Token</span>
                    <span className="font-semibold text-card-foreground">
                      {formatCurrency(property.pricePerTokenUSDT || property.pricePerToken || property.price_per_token || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Tokens</span>
                    <span className="font-semibold text-card-foreground">
                      {parseFloat(property.totalTokens || property.total_tokens || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available Tokens</span>
                    <span className="font-semibold text-green-600">
                      {parseFloat(property.availableTokens || property.available_tokens || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="blue">
                        {property.type || property.propertyType || property.property_type || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex items-center justify-center space-x-2"
                    onClick={() => navigate(`/orgdashboard/property/${property.id || property.displayCode}`)}
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredProperties.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredProperties.length}</span> results
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm text-gray-700">
                  Page <span className="font-medium mx-1">{currentPage}</span> of{' '}
                  <span className="font-medium mx-1">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
        </>
      )}
    </div>
  );
};

export default OrgPropertiesManagement;

