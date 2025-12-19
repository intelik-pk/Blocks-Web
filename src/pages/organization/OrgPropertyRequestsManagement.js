import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, Search, Eye, Clock, CheckCircle, XCircle, Building2, MapPin, DollarSign, Calendar, X, FileText, Download, Image as ImageIcon, ExternalLink } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { propertyRequestsAPI } from '../../services/api';
import { useOrganizationAuth } from '../../components/organization/OrganizationAuth';
import PropertyRequestForm from '../../components/organization/PropertyRequestForm';
import { useToast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';
import { API_BASE_URL } from '../../config/api';

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

  // Helper function to ensure full URL for images and documents
  const getFullUrl = (url) => {
    if (!url) return '';
    if (typeof url !== 'string') return '';
    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If starts with /, it's a relative path - prepend API base URL
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    // Otherwise, assume it's a relative path and prepend API base URL with /
    return `${API_BASE_URL}/${url}`;
  };

  // Helper to get all image URLs from request
  const getImageUrls = (request) => {
    if (!request || !request.images) return [];
    
    // Handle different formats
    if (Array.isArray(request.images)) {
      return request.images.map(url => getFullUrl(url));
    }
    
    if (request.images.urls && Array.isArray(request.images.urls)) {
      return request.images.urls.map(url => getFullUrl(url));
    }
    
    if (typeof request.images === 'string') {
      try {
        const parsed = JSON.parse(request.images);
        if (Array.isArray(parsed)) {
          return parsed.map(url => getFullUrl(url));
        }
        if (parsed.urls && Array.isArray(parsed.urls)) {
          return parsed.urls.map(url => getFullUrl(url));
        }
      } catch (e) {
        // Not JSON, treat as single URL
        return [getFullUrl(request.images)];
      }
    }
    
    return [];
  };

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
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {showForm ? 'New Property Request' : selectedRequest ? 'Request Details' : 'Property Requests'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {showForm 
              ? 'Fill in the details to request a new property' 
              : selectedRequest
              ? `Viewing details for ${selectedRequest.title}`
              : 'Request new properties for your organization'}
          </p>
        </div>
        {showForm || selectedRequest ? (
          <Button variant="outline" onClick={() => {
            setShowForm(false);
            setSelectedRequest(null);
          }}>
            <X className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'Back to List'}
          </Button>
        ) : (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {showForm ? (
        /* Form replaces the list */
        <div className="space-y-6">
          <PropertyRequestForm
            onSave={handleFormSuccess}
            onCancel={() => setShowForm(false)}
            isLoading={false}
            inline={true}
          />
        </div>
      ) : selectedRequest ? (
        /* Request Details replace the list */
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            {getStatusBadge(selectedRequest.status)}
          </div>

          {/* Basic Information */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Basic Information
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <p className="text-base font-medium text-card-foreground mt-1">{selectedRequest.title}</p>
              </div>
              {selectedRequest.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm text-card-foreground mt-1 whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-sm font-medium text-card-foreground mt-1 capitalize">{selectedRequest.type || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Property Status</label>
                  <p className="text-sm font-medium text-card-foreground mt-1 capitalize">{selectedRequest.propertyStatus || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium text-card-foreground">
                  {selectedRequest.city || 'N/A'}, {selectedRequest.country || 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Financial Information */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Details
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Value</label>
                <p className="text-lg font-bold text-primary mt-1">
                  {parseFloat(selectedRequest.totalValueUSDT || 0).toLocaleString()} USDT
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Tokens</label>
                <p className="text-lg font-bold text-card-foreground mt-1">
                  {parseFloat(selectedRequest.totalTokens || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Expected ROI</label>
                <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                  {parseFloat(selectedRequest.expectedROI || 0)}%
                </p>
              </div>
            </div>
          </Card>

          {/* Property Images */}
          {(() => {
            const imageUrls = getImageUrls(selectedRequest);
            return imageUrls.length > 0 ? (
              <Card className="p-6">
                <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Property Images ({imageUrls.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Property ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-border hover:shadow-lg transition-shadow cursor-pointer"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                        onClick={() => window.open(url, '_blank')}
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ExternalLink className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null;
          })()}

          {/* Documents */}
          {selectedRequest.documents && (
            <Card className="p-6">
              <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </h4>
              <div className="space-y-3">
                {selectedRequest.documents.brochure && (() => {
                  const doc = selectedRequest.documents.brochure;
                  const docUrl = typeof doc === 'string' ? getFullUrl(doc) : getFullUrl(doc?.url || doc);
                  return (
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-card-foreground">Brochure</p>
                          <p className="text-xs text-muted-foreground">
                            {doc?.name || 'Brochure document'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(docUrl, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        View
                      </Button>
                    </div>
                  );
                })()}
                {selectedRequest.documents.floorPlan && (() => {
                  const doc = selectedRequest.documents.floorPlan;
                  const docUrl = typeof doc === 'string' ? getFullUrl(doc) : getFullUrl(doc?.url || doc);
                  return (
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-card-foreground">Floor Plan</p>
                          <p className="text-xs text-muted-foreground">
                            {doc?.name || 'Floor plan document'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(docUrl, '_blank')}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        View
                      </Button>
                    </div>
                  );
                })()}
                {selectedRequest.documents.compliance && Array.isArray(selectedRequest.documents.compliance) && selectedRequest.documents.compliance.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Compliance Documents</p>
                    <div className="space-y-2">
                      {selectedRequest.documents.compliance.map((doc, index) => {
                        const docUrl = typeof doc === 'string' ? getFullUrl(doc) : getFullUrl(doc?.url || doc);
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-primary" />
                              <div>
                                <p className="text-sm font-medium text-card-foreground">
                                  {doc?.name || `Compliance Document ${index + 1}`}
                                </p>
                                <p className="text-xs text-muted-foreground">Compliance document</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(docUrl, '_blank')}
                              className="flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              View
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {(!selectedRequest.documents.brochure && 
                  !selectedRequest.documents.floorPlan && 
                  (!selectedRequest.documents.compliance || selectedRequest.documents.compliance.length === 0)) && (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No documents uploaded</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Additional Information */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Additional Information
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Created At</span>
                <span className="text-sm text-card-foreground">
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>
              {selectedRequest.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                  <span className="text-sm text-card-foreground">
                    {new Date(selectedRequest.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Rejection Reason */}
          {selectedRequest.rejectionReason && (
            <Card className="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Rejection Reason</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default OrgPropertyRequestsManagement;

