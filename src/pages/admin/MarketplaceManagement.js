import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  Store,
  TrendingUp,
  TrendingDown,
  Eye,
  XCircle,
  Search,
  DollarSign,
  Building2,
  Users,
  Filter,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import { formatExactPrice } from '../../utils/formatPrice';

const MarketplaceManagement = ({ initialFilters, onFiltersSet }) => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: initialFilters?.search || '',
    status: initialFilters?.status || 'active',
    sortBy: initialFilters?.sortBy || 'created_at_desc',
  });

  const [selectedListing, setSelectedListing] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch marketplace listings
  const { data: listingsData, isLoading, error, refetch } = useQuery(
    ['admin-marketplace-listings', filters.status, filters.sortBy],
    async () => {
      const response = await adminAPI.getMarketplaceListings({
        status: filters.status === 'all' ? undefined : filters.status,
        sortBy: filters.sortBy,
      });
      return response;
    },
    {
      enabled: isAuthenticated,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  );

  const listings = listingsData?.data?.listings || listingsData?.data || listingsData?.listings || listingsData || [];

  // Statistics
  const stats = useMemo(() => {
    const allListings = listingsData?.data?.listings || listingsData?.data || listingsData?.listings || listingsData || [];
    return {
      active: allListings.filter((l) => l.status === 'active').length,
      sold: allListings.filter((l) => l.status === 'sold').length,
      cancelled: allListings.filter((l) => l.status === 'cancelled').length,
      totalValue: allListings
        .filter((l) => l.status === 'active')
        .reduce((sum, l) => sum + parseFloat(l.remainingTokens || 0) * parseFloat(l.pricePerToken || 0), 0),
      totalTokens: allListings
        .filter((l) => l.status === 'active')
        .reduce((sum, l) => sum + parseFloat(l.remainingTokens || 0), 0),
    };
  }, [listingsData]);

  // Filter listings
  const filteredListings = useMemo(() => {
    let filtered = listings;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.displayCode?.toLowerCase().includes(searchLower) ||
          l.property?.title?.toLowerCase().includes(searchLower) ||
          l.seller?.displayCode?.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [listings, filters.search]);

  // Cancel listing
  const handleCancel = async () => {
    if (!window.confirm(`Cancel listing ${selectedListing.displayCode}? Tokens will be unlocked.`)) {
      return;
    }

    setIsCancelling(true);
    try {
      // Note: Cancel endpoint requires authentication, but admin can cancel any listing
      // The backend should allow admin to cancel listings via the same endpoint
      await adminAPI.cancelMarketplaceListing(selectedListing.id);
      await refetch();
      setSelectedListing(null);
      alert('Listing cancelled successfully. Tokens have been unlocked.');
    } catch (error) {
      console.error('Cancel error:', error);
      alert(`Failed to cancel listing: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Store className="w-8 h-8" />
            Marketplace Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage peer-to-peer token listings and trades
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Listings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tokens Listed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalTokens.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatExactPrice(stats.totalValue)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sold</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.sold}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <TrendingDown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by listing code, property, seller..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="roi_desc">Best ROI</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Listings Table */}
      <Card>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader />
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 dark:text-red-400">
              Error loading listings: {error.message}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-12 text-center text-gray-600 dark:text-gray-400">
              No listings found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Listing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Seller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price/Token
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Available
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredListings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {listing.displayCode}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {listing.property?.title || 'Property'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {listing.property?.displayCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {listing.seller?.displayCode || 'Seller'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatExactPrice(listing.pricePerToken)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ROI: {listing.property?.expectedROI || 0}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {parseFloat(listing.remainingTokens).toFixed(2)} tokens
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        of {parseFloat(listing.totalTokens).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {formatExactPrice(listing.minOrderUSDT)} - {formatExactPrice(listing.maxOrderUSDT)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          listing.status === 'active'
                            ? 'success'
                            : listing.status === 'sold'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {listing.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedListing(listing)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {listing.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedListing(listing);
                              handleCancel();
                            }}
                            disabled={isCancelling}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Listing Details: {selectedListing.displayCode}
                </h3>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Property</label>
                <p className="text-gray-900 dark:text-white">{selectedListing.property?.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Seller</label>
                <p className="text-gray-900 dark:text-white">{selectedListing.seller?.displayCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Price per Token
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatExactPrice(selectedListing.pricePerToken)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expected ROI
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedListing.property?.expectedROI || 0}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total Tokens
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {parseFloat(selectedListing.totalTokens).toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Remaining
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {parseFloat(selectedListing.remainingTokens).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Min Order
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatExactPrice(selectedListing.minOrderUSDT)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Max Order
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatExactPrice(selectedListing.maxOrderUSDT)}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <Badge
                  variant={
                    selectedListing.status === 'active'
                      ? 'success'
                      : selectedListing.status === 'sold'
                      ? 'info'
                      : 'warning'
                  }
                >
                  {selectedListing.status}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created</label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedListing.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceManagement;

