import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Eye, Clock, CheckCircle, XCircle, Building2, MapPin, DollarSign, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { propertyRequestsAPI } from '../../services/api';
import { useOrganizationAuth } from '../../components/organization/OrganizationAuth';
import PropertyRequestForm from '../../components/organization/PropertyRequestForm';
import { useToast } from '../../components/ui/Toast';

const OrgPropertyRequestsManagement = ({ organizationId }) => {
  const { organizationUser, isAuthenticated, adminId } = useOrganizationAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const orgAdminId = adminId || organizationUser?.adminId || organizationUser?.id;
  
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch property requests for this organization
  const { data: requestsData, isLoading } = useQuery(
    ['org-property-requests', orgAdminId],
    () => propertyRequestsAPI.getAll(orgAdminId),
    {
      enabled: isAuthenticated && !!orgAdminId,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  const requests = requestsData?.data?.data || requestsData?.data || (Array.isArray(requestsData) ? requestsData : []);

  const filteredRequests = requests.filter(req => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      req.title?.toLowerCase().includes(search) ||
      req.city?.toLowerCase().includes(search) ||
      req.status?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'yellow', icon: Clock, label: 'Pending' },
      approved: { color: 'green', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'red', icon: XCircle, label: 'Rejected' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge color={config.color} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    queryClient.invalidateQueries(['org-property-requests', orgAdminId]);
    toast.success('Property request submitted successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Property Requests</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Request new properties for your organization
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search requests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Requests List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm ? 'No requests found matching your search' : 'No property requests yet'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Request
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {request.title}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {request.description || 'No description provided'}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      <span>{request.city}, {request.country}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Building2 className="w-4 h-4" />
                      <span className="capitalize">{request.type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4" />
                      <span>{parseFloat(request.totalValueUSDT || 0).toLocaleString()} USDT</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {request.rejectionReason && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        <strong>Rejection Reason:</strong> {request.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(request)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Request Form Modal */}
      {showForm && (
        <PropertyRequestForm
          onSave={handleFormSuccess}
          onCancel={() => setShowForm(false)}
          isLoading={false}
        />
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Request Details</h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <p className="text-gray-900 dark:text-white">{selectedRequest.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p className="text-gray-900 dark:text-white">{selectedRequest.description || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedRequest.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Property Status</label>
                  <p className="text-gray-900 dark:text-white capitalize">{selectedRequest.propertyStatus}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Value</label>
                  <p className="text-gray-900 dark:text-white">{parseFloat(selectedRequest.totalValueUSDT || 0).toLocaleString()} USDT</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Tokens</label>
                  <p className="text-gray-900 dark:text-white">{parseFloat(selectedRequest.totalTokens || 0).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected ROI</label>
                  <p className="text-gray-900 dark:text-white">{parseFloat(selectedRequest.expectedROI || 0)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                  <p className="text-gray-900 dark:text-white">{selectedRequest.city}, {selectedRequest.country}</p>
                </div>
              </div>
              {selectedRequest.rejectionReason && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrgPropertyRequestsManagement;

