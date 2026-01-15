import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Building2, Search, Eye } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { adminAPI } from '../../../services/api';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';
import { formatExactPrice } from '../../../utils/formatPrice';

const PropertiesView = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);

  const role = adminUser?.role;
  const isReadOnly = role === AdminRole.AUDIT_MANAGER;

  // Fetch all properties
  const { data: propertiesData, isLoading } = useQuery(
    ['compliance-properties-view'],
    () => adminAPI.getProperties({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: 1,
    }
  );

  const properties = propertiesData?.data?.data?.properties || 
                    propertiesData?.data?.properties || 
                    propertiesData?.data || 
                    (Array.isArray(propertiesData) ? propertiesData : []);

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter(prop => {
      const matchesSearch = 
        (prop.title || prop.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prop.displayCode || prop.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prop.location_city || prop.city || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const propStatus = prop.status || 'active';
      const matchesStatus = statusFilter === 'all' || propStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, statusFilter]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view properties.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Properties {isReadOnly && '(View Only)'}
          </h2>
          <p className="text-muted-foreground">
            All platform properties
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
                placeholder="Search by name, code, or location..."
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
              <option value="funded">Funded</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Properties Grid */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No properties found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((property) => {
              const totalValue = parseFloat(property.pricing_total_value || property.totalValueUSDT || property.purchasePriceUSDT || 0);
              const expectedROI = parseFloat(property.pricing_expected_roi || property.expectedROI || 0);
              const totalTokens = parseFloat(property.tokenization_total_tokens || property.totalTokens || 0);
              const availableTokens = parseFloat(property.tokenization_available_tokens || property.availableTokens || 0);
              const boughtTokens = totalTokens - availableTokens;
              const fundingPercentage = totalTokens > 0 ? (boughtTokens / totalTokens) * 100 : 0;
              
              return (
                <div
                  key={property.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {property.title || property.name || 'N/A'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {property.displayCode || property.id}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProperty(property)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Location:</span>
                      <span className="text-gray-900 dark:text-white">{property.location_city || property.city || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{formatExactPrice(totalValue, '$')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Expected ROI:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{expectedROI}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Funding:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{fundingPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="pt-2">
                      <Badge className={cn(
                        (property.status || 'active') === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : (property.status || 'active') === 'funded'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      )}>
                        {property.status || 'active'}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Property Detail Modal */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Property Details: {selectedProperty.title || selectedProperty.name}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProperty(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Property Name</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedProperty.title || selectedProperty.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Code</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedProperty.displayCode || selectedProperty.id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedProperty.location_city || selectedProperty.city || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {(selectedProperty.property_type || selectedProperty.propertyType || selectedProperty.type || 'N/A').toUpperCase()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Value</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatExactPrice(parseFloat(selectedProperty.pricing_total_value || selectedProperty.totalValueUSDT || selectedProperty.purchasePriceUSDT || 0), '$')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected ROI</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {parseFloat(selectedProperty.pricing_expected_roi || selectedProperty.expectedROI || 0)}%
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Tokens</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {parseFloat(selectedProperty.tokenization_total_tokens || selectedProperty.totalTokens || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge className={cn(
                    (selectedProperty.status || 'active') === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : (selectedProperty.status || 'active') === 'funded'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
                    "mt-1"
                  )}>
                    {selectedProperty.status || 'active'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PropertiesView;
