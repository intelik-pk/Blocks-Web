import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Search, Eye, Clock, CheckCircle, XCircle, Building2, MapPin, DollarSign, Calendar, Check, X, FileText } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { propertyRequestsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { useToast } from '../../components/ui/Toast';

const PropertyRequestsManagement = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const adminId = adminUser?.id;
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch all property requests (Blocks Admin sees all)
  const { data: requestsData, isLoading } = useQuery(
    'property-requests',
    () => propertyRequestsAPI.getAll(),
    {
      enabled: isAuthenticated,
      retry: 1,
      refetchOnWindowFocus: false
    }
  );

  const requests = requestsData?.data?.data || requestsData?.data || (Array.isArray(requestsData) ? requestsData : []);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = !searchTerm || 
      req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const approveMutation = useMutation(
    (id) => propertyRequestsAPI.approve(id, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('property-requests');
        toast.success('Property request approved! Property has been created.');
        setSelectedRequest(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve request');
      }
    }
  );

  const rejectMutation = useMutation(
    ({ id, reason }) => propertyRequestsAPI.reject(id, adminId, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('property-requests');
        toast.success('Property request rejected.');
        setSelectedRequest(null);
        setRejectionReason('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject request');
      }
    }
  );

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

  const handleApprove = (request) => {
    if (window.confirm(`Approve property request: "${request.title}"? This will create the property.`)) {
      approveMutation.mutate(request.id);
    }
  };

  const handleReject = (request) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    if (window.confirm(`Reject property request: "${request.title}"?`)) {
      rejectMutation.mutate({ id: request.id, reason: rejectionReason });
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Property Requests</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Review and approve/reject property requests from ORG Admins
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{requests.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' ? 'No requests found matching your filters' : 'No property requests yet'}
          </p>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Organization:</strong> {request.organization?.name || 'N/A'}
                  </p>
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
                <div className="flex flex-col gap-2 ml-4">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request)}
                        disabled={approveMutation.isLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setRejectionReason('');
                        }}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Request Details</h3>
              <Button variant="outline" size="sm" onClick={() => {
                setSelectedRequest(null);
                setRejectionReason('');
              }}>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization</label>
                <p className="text-gray-900 dark:text-white">{selectedRequest.organization?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Requested By</label>
                <p className="text-gray-900 dark:text-white">
                  {selectedRequest.requester?.fullName || selectedRequest.requester?.email || 'N/A'}
                </p>
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
              {selectedRequest.status === 'pending' && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Enter reason for rejection..."
                  />
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleApprove(selectedRequest)}
                      disabled={approveMutation.isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Request
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(selectedRequest)}
                      disabled={rejectMutation.isLoading || !rejectionReason.trim()}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject Request
                    </Button>
                  </div>
                </div>
              )}
              {selectedRequest.rejectionReason && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}
              
              {/* Images Section */}
              {selectedRequest.images && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Property Images
                  </label>
                  {selectedRequest.images?.urls && Array.isArray(selectedRequest.images.urls) && selectedRequest.images.urls.length > 0 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {selectedRequest.images.urls.map((url, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={url} 
                            alt={`Property ${index + 1}`} 
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No images uploaded</p>
                  )}
                </div>
              )}

              {/* Documents Section */}
              {selectedRequest.documents && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Documents
                  </label>
                  <div className="space-y-2">
                    {selectedRequest.documents.brochure && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <a 
                          href={selectedRequest.documents.brochure.url || selectedRequest.documents.brochure} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {selectedRequest.documents.brochure.name || 'Brochure'}
                        </a>
                      </div>
                    )}
                    {selectedRequest.documents.floorPlan && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <a 
                          href={selectedRequest.documents.floorPlan.url || selectedRequest.documents.floorPlan} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {selectedRequest.documents.floorPlan.name || 'Floor Plan'}
                        </a>
                      </div>
                    )}
                    {selectedRequest.documents.compliance && Array.isArray(selectedRequest.documents.compliance) && selectedRequest.documents.compliance.length > 0 && (
                      <div className="space-y-2">
                        {selectedRequest.documents.compliance.map((doc, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <a 
                              href={doc.url || doc} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {doc.name || `Compliance Document ${index + 1}`}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!selectedRequest.documents.brochure && !selectedRequest.documents.floorPlan && (!selectedRequest.documents.compliance || selectedRequest.documents.compliance.length === 0)) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No documents uploaded</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PropertyRequestsManagement;

