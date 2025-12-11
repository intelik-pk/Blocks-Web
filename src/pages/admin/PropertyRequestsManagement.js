import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Eye, Clock, CheckCircle, XCircle, Building2, MapPin, DollarSign, Calendar, Check, X, FileText, TrendingUp } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { propertyRequestsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import { useToast } from '../../components/ui/Toast';
import PropertyRequestFilters from '../../components/propertyRequests/PropertyRequestFilters';

const PropertyRequestsManagement = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const adminId = adminUser?.id;
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: [], // Multi-select array
    sort_by: 'createdAt',
    sort_order: 'desc'
  });
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

  // Filter and sort requests
  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(req => {
      // Search filter
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          req.title?.toLowerCase().includes(searchLower) ||
          req.city?.toLowerCase().includes(searchLower) ||
          req.organization?.name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Status filter (multi-select)
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        const matchesStatus = filters.status.includes(req.status);
        if (!matchesStatus) return false;
      }
      
      return true;
    });

    // Apply sorting
    if (filters.sort_by) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (filters.sort_by) {
          case 'createdAt':
            aValue = new Date(a.createdAt || 0);
            bValue = new Date(b.createdAt || 0);
            break;
          case 'title':
            aValue = (a.title || '').toLowerCase();
            bValue = (b.title || '').toLowerCase();
            break;
          case 'status':
            const statusOrder = { 'pending': 1, 'approved': 2, 'rejected': 3 };
            aValue = statusOrder[a.status] || 0;
            bValue = statusOrder[b.status] || 0;
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
  }, [requests, filters]);

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
      <PropertyRequestFilters
        filters={filters}
        onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
      />

      {/* Requests List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
        </Card>
      ) : filteredRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {filters.search || (Array.isArray(filters.status) && filters.status.length > 0) ? 'No requests found matching your filters' : 'No property requests yet'}
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

      {/* Request Details Side Panel */}
      {selectedRequest && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 animate-in fade-in"
            style={{
              margin: '0px',
            }}
            onClick={() => {
              setSelectedRequest(null);
              setRejectionReason('');
            }}
          />
          
          {/* Side Panel - Slides in from right */}
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
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm flex-shrink-0">
              <div className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex-shrink-0 border border-blue-500/30">
                      <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-card-foreground truncate mb-1">{selectedRequest.title}</h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        {getStatusBadge(selectedRequest.status)}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(selectedRequest.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setRejectionReason('');
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200 flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              <div className="p-6 space-y-5">
                {/* Quick Info Bar */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-accent/30 to-accent/10 rounded-xl border border-border/30">
                  <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs block mb-0.5">Organization</span>
                      <span className="font-semibold text-card-foreground">{selectedRequest.organization?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block mb-0.5">Requested By</span>
                      <span className="font-semibold text-card-foreground truncate block">
                        {selectedRequest.requester?.fullName || selectedRequest.requester?.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Property Type & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
                    </div>
                    <p className="text-base font-bold text-card-foreground capitalize">{selectedRequest.type || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
                    </div>
                    <p className="text-base font-bold text-card-foreground capitalize">{selectedRequest.propertyStatus || 'N/A'}</p>
                  </div>
                </div>

                {/* Description */}
                {selectedRequest.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                      Description
                    </h4>
                    <div className="p-4 bg-card/50 rounded-xl border border-border/30">
                      <p className="text-sm text-card-foreground/90 leading-relaxed whitespace-pre-wrap">{selectedRequest.description}</p>
                    </div>
                  </div>
                )}

                {/* Financial Overview */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide flex items-center gap-2">
                    <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                    Financial Overview
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 bg-gradient-to-br from-green-500/15 to-emerald-500/5 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-500/20 rounded-lg">
                          <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Value</label>
                      </div>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400 leading-tight">
                        {parseFloat(selectedRequest.totalValueUSDT || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">USDT</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-500/15 to-cyan-500/5 rounded-xl border border-blue-500/30 hover:border-blue-500/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500/20 rounded-lg">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tokens</label>
                      </div>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-tight">
                        {parseFloat(selectedRequest.totalTokens || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Units</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500/15 to-pink-500/5 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500/20 rounded-lg">
                          <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">ROI</label>
                      </div>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400 leading-tight">
                        {parseFloat(selectedRequest.expectedROI || 0)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Expected</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-500/20 flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Location</span>
                    <p className="text-base font-bold text-card-foreground">
                      {selectedRequest.city}, {selectedRequest.country}
                    </p>
                  </div>
                </div>
                {/* Action Section for Pending Requests */}
                {selectedRequest.status === 'pending' && (
                  <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 p-5 bg-gradient-to-t from-card via-card/95 to-transparent backdrop-blur-xl border-t border-border/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide">
                          Review Actions
                        </h4>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                          Rejection Reason (Optional)
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-card-foreground text-sm placeholder:text-muted-foreground resize-none"
                          placeholder="Enter reason if rejecting..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleApprove(selectedRequest)}
                          disabled={approveMutation.isLoading}
                          className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all h-11 font-semibold"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(selectedRequest)}
                          disabled={rejectMutation.isLoading || !rejectionReason.trim()}
                          className="border-2 border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 h-11 font-semibold"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection Reason Display */}
                {selectedRequest.rejectionReason && (
                  <div className="p-4 bg-gradient-to-br from-red-500/15 to-pink-500/10 rounded-xl border-2 border-red-500/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-500/20 rounded-lg flex-shrink-0">
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-card-foreground mb-2 uppercase tracking-wide">
                          Rejection Reason
                        </h4>
                        <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
                          {selectedRequest.rejectionReason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              
                {/* Images Section */}
                {selectedRequest.images && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                      Property Images
                    </h4>
                    {selectedRequest.images?.urls && Array.isArray(selectedRequest.images.urls) && selectedRequest.images.urls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {selectedRequest.images.urls.map((url, index) => (
                          <div key={index} className="relative group overflow-hidden rounded-xl border border-border/50 hover:border-primary/50 transition-all aspect-video bg-accent/10">
                            <img 
                              src={url} 
                              alt={`Property ${index + 1}`} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                              {index + 1} of {selectedRequest.images.urls.length}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6 bg-accent/20 rounded-xl border border-dashed border-border">No images uploaded</p>
                    )}
                  </div>
                )}

                {/* Documents Section */}
                {selectedRequest.documents && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-card-foreground uppercase tracking-wide flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                      Documents
                    </h4>
                    <div className="space-y-2">
                      {selectedRequest.documents.brochure && (
                        <a 
                          href={selectedRequest.documents.brochure.url || selectedRequest.documents.brochure} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-500/10 to-transparent rounded-xl border border-blue-500/20 hover:border-blue-500/40 hover:from-blue-500/15 transition-all group"
                        >
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:scale-110 transition-transform">
                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="flex-1 text-sm font-medium text-card-foreground truncate">
                            {selectedRequest.documents.brochure.name || 'Brochure'}
                          </span>
                          <Eye className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors flex-shrink-0" />
                        </a>
                      )}
                      {selectedRequest.documents.floorPlan && (
                        <a 
                          href={selectedRequest.documents.floorPlan.url || selectedRequest.documents.floorPlan} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-500/10 to-transparent rounded-xl border border-green-500/20 hover:border-green-500/40 hover:from-green-500/15 transition-all group"
                        >
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                            <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="flex-1 text-sm font-medium text-card-foreground truncate">
                            {selectedRequest.documents.floorPlan.name || 'Floor Plan'}
                          </span>
                          <Eye className="w-4 h-4 text-muted-foreground group-hover:text-green-600 transition-colors flex-shrink-0" />
                        </a>
                      )}
                      {selectedRequest.documents.compliance && Array.isArray(selectedRequest.documents.compliance) && selectedRequest.documents.compliance.length > 0 && (
                        selectedRequest.documents.compliance.map((doc, index) => (
                          <a 
                            key={index}
                            href={doc.url || doc} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-transparent rounded-xl border border-purple-500/20 hover:border-purple-500/40 hover:from-purple-500/15 transition-all group"
                          >
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:scale-110 transition-transform">
                              <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="flex-1 text-sm font-medium text-card-foreground truncate">
                              {doc.name || `Compliance ${index + 1}`}
                            </span>
                            <Eye className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors flex-shrink-0" />
                          </a>
                        ))
                      )}
                      {(!selectedRequest.documents.brochure && !selectedRequest.documents.floorPlan && (!selectedRequest.documents.compliance || selectedRequest.documents.compliance.length === 0)) && (
                        <p className="text-xs text-muted-foreground text-center py-6 bg-accent/20 rounded-xl border border-dashed border-border">No documents uploaded</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Only show when not pending */}
            {selectedRequest.status !== 'pending' && (
              <div className="sticky bottom-0 z-10 bg-card/95 backdrop-blur-xl border-t border-border/50 px-6 py-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="w-full"
                >
                  Close Panel
                </Button>
              </div>
            )}
          </Card>
        </div>
        </>
      )}
    </div>
  );
};

export default PropertyRequestsManagement;

