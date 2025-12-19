import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  Download,
  User,
  DollarSign,
  Calendar,
  Building2,
  FileImage,
  Edit,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import { formatExactPrice, formatFullPrice } from '../../utils/formatPrice';
import { API_BASE_URL } from '../../config/api';

const BankTransferRequests = ({ initialFilters, onFiltersSet }) => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  
  // Get admin ID from adminUser (login stores both id and userId)
  const adminId = adminUser?.id || adminUser?.userId || adminUser?._id;
  
  // Debug: Log admin user info
  useEffect(() => {
    if (adminUser) {
      console.log('BankTransferRequests: adminUser:', adminUser);
      console.log('BankTransferRequests: adminId:', adminId);
    } else {
      console.warn('BankTransferRequests: adminUser is null/undefined');
    }
  }, [adminUser, adminId]);

  const [filters, setFilters] = useState({
    search: initialFilters?.search || '',
    status: initialFilters?.status || 'pending',
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Bank Account Details State (must be before any early returns)
  const [bankAccountDetails, setBankAccountDetails] = useState(null);
  const [isEditingBankDetails, setIsEditingBankDetails] = useState(false);
  const [editedBankDetails, setEditedBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    iban: '',
    bankName: '',
    swiftCode: '',
    branch: '',
  });
  const [isSavingBankDetails, setIsSavingBankDetails] = useState(false);

  // Fetch bank account details
  const { data: bankDetailsData, refetch: refetchBankDetails } = useQuery(
    'bank-account-settings',
    () => adminAPI.getBankAccountSettings(),
    {
      enabled: isAuthenticated,
      retry: 1,
      onSuccess: (data) => {
        if (data?.data?.data) {
          setBankAccountDetails(data.data.data);
          setEditedBankDetails(data.data.data);
        }
      },
    },
  );

  // Fetch bank transfer requests
  const { data: requestsData, isLoading, error, refetch } = useQuery(
    ['admin-bank-transfers', filters.status],
    async () => {
      const response = await adminAPI.getBankTransfers({
        status: filters.status === 'all' ? undefined : filters.status,
        limit: 1000,
      });
      return response;
    },
    {
      enabled: isAuthenticated,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  );

  const allRequests = requestsData?.data?.data || requestsData?.data || (Array.isArray(requestsData) ? requestsData : []);

  // Filter requests by search
  const filteredRequests = useMemo(() => {
    if (!filters.search) return allRequests;

    const searchLower = filters.search.toLowerCase();
    return allRequests.filter((request) => {
      return (
        request.displayCode?.toLowerCase().includes(searchLower) ||
        request.user?.fullName?.toLowerCase().includes(searchLower) ||
        request.user?.email?.toLowerCase().includes(searchLower) ||
        request.bankAccountNumber?.toLowerCase().includes(searchLower)
      );
    });
  }, [allRequests, filters.search]);

  // Statistics
  const stats = useMemo(() => {
    const pending = allRequests.filter((r) => r.status === 'pending').length;
    const approved = allRequests.filter((r) => r.status === 'approved').length;
    const rejected = allRequests.filter((r) => r.status === 'rejected').length;
    const totalAmount = allRequests
      .filter((r) => r.status === 'pending')
      .reduce((sum, r) => sum + parseFloat(r.amountUSDT || 0), 0);

    return { pending, approved, rejected, totalAmount };
  }, [allRequests]);

  // View proof image
  const handleViewProof = async (request) => {
    if (!request.proofImageUrl) {
      alert('Proof image not available');
      return;
    }

    // If it's a base64 data URL, use it directly
    if (request.proofImageUrl.startsWith('data:image/')) {
      setImageUrl(request.proofImageUrl);
      setShowImageModal(true);
      return;
    }

    try {
      // Try to get signed URL if it's a private bucket
      const response = await adminAPI.getBankTransferProofUrl(request.id);
      console.log('Proof URL response:', response);
      
      // Handle different response structures
      const signedUrl = response?.data?.data?.signedUrl || 
                       response?.data?.signedUrl || 
                       response?.signedUrl;
      
      if (signedUrl) {
        setImageUrl(signedUrl);
      } else {
        // Fallback to direct URL (for public buckets)
        console.log('Using direct URL:', request.proofImageUrl);
        setImageUrl(request.proofImageUrl);
      }
    } catch (error) {
      console.error('Error getting signed URL:', error);
      console.log('Falling back to direct URL:', request.proofImageUrl);
      // Fallback to direct URL (might be public bucket)
      setImageUrl(request.proofImageUrl);
    }
    setShowImageModal(true);
  };

  // Review request (approve/reject)
  const handleReview = async (requestId, status, rejectionReason = '') => {
    if (!adminId) {
      alert('Admin ID not found. Please log in again.');
      console.error('Admin ID not found. adminUser:', adminUser);
      return;
    }

    if (status === 'rejected' && !rejectionReason) {
      const reason = window.prompt('Please provide a reason for rejection:');
      if (!reason) return;
      rejectionReason = reason;
    }

    setIsReviewing(true);
    try {
      await adminAPI.reviewBankTransfer(requestId, {
        adminId: adminId,
        status,
        rejectionReason,
      });

      // Refetch data
      await refetch();
      queryClient.invalidateQueries(['admin-transactions']);
      queryClient.invalidateQueries(['admin-dashboard']);

      alert(`Request ${status} successfully!`);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Review error:', error);
      alert(`Failed to ${status} request: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: 'warning', icon: Clock, label: 'Pending' },
      approved: { variant: 'success', icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'danger', icon: XCircle, label: 'Rejected' },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon size={14} />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading bank transfer requests</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Save bank account details
  const handleSaveBankDetails = async () => {
    setIsSavingBankDetails(true);
    try {
      await adminAPI.updateBankAccountSettings(editedBankDetails);
      await refetchBankDetails();
      setIsEditingBankDetails(false);
      alert('Bank account details updated successfully!');
    } catch (error) {
      console.error('Error updating bank details:', error);
      alert(`Failed to update: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSavingBankDetails(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Bank Account Details Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Bank Account Details for Deposits
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              These details are shown to users when they make bank transfer deposits
            </p>
          </div>
          {!isEditingBankDetails ? (
            <Button
              onClick={() => setIsEditingBankDetails(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsEditingBankDetails(false);
                  setEditedBankDetails(bankAccountDetails || {});
                }}
                variant="outline"
                disabled={isSavingBankDetails}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveBankDetails}
                disabled={isSavingBankDetails}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSavingBankDetails ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        {bankAccountDetails ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isEditingBankDetails ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    value={editedBankDetails.accountName}
                    onChange={(e) =>
                      setEditedBankDetails({ ...editedBankDetails, accountName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={editedBankDetails.accountNumber}
                    onChange={(e) =>
                      setEditedBankDetails({ ...editedBankDetails, accountNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={editedBankDetails.iban || ''}
                    onChange={(e) =>
                      setEditedBankDetails({ ...editedBankDetails, iban: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={editedBankDetails.bankName}
                    onChange={(e) =>
                      setEditedBankDetails({ ...editedBankDetails, bankName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SWIFT Code
                  </label>
                  <input
                    type="text"
                    value={editedBankDetails.swiftCode || ''}
                    onChange={(e) =>
                      setEditedBankDetails({ ...editedBankDetails, swiftCode: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={editedBankDetails.branch || ''}
                    onChange={(e) =>
                      setEditedBankDetails({ ...editedBankDetails, branch: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-500">Account Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {bankAccountDetails.accountName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    {bankAccountDetails.accountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IBAN</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    {bankAccountDetails.iban || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bank Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {bankAccountDetails.bankName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">SWIFT Code</p>
                  <p className="font-mono font-semibold text-gray-900 dark:text-white">
                    {bankAccountDetails.swiftCode || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Branch</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {bankAccountDetails.branch || 'N/A'}
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Loader />
          </div>
        )}
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Bank Transfer Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve bank transfer deposit requests
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatExactPrice(stats.totalAmount)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by code, user name, email, or account number..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </Card>

      {/* Requests Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No bank transfer requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium">{request.displayCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {request.user?.fullName || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">{request.user?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatExactPrice(request.amountUSDT)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="font-medium">{request.bankName}</p>
                        <p className="text-gray-500">{request.bankAccountNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(request.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProof(request);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View Proof"
                        >
                          <Eye size={18} />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Approve request ${request.displayCode}?`)) {
                                  handleReview(request.id, 'approved');
                                }
                              }}
                              disabled={isReviewing}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const reason = window.prompt('Rejection reason:');
                                if (reason) {
                                  handleReview(request.id, 'rejected', reason);
                                }
                              }}
                              disabled={isReviewing}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Request Details</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Request Code</p>
                  <p className="font-mono font-medium">{selectedRequest.displayCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-semibold text-lg">{formatExactPrice(selectedRequest.amountUSDT)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-sm">{formatDate(selectedRequest.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">User Information</p>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="font-medium">{selectedRequest.user?.fullName || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.user?.email || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedRequest.user?.phone || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Bank Account Details</p>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-1">
                  <p>
                    <span className="font-medium">Account Name:</span> {selectedRequest.bankAccountName}
                  </p>
                  <p>
                    <span className="font-medium">Account Number:</span> {selectedRequest.bankAccountNumber}
                  </p>
                  {selectedRequest.bankIban && (
                    <p>
                      <span className="font-medium">IBAN:</span> {selectedRequest.bankIban}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Bank:</span> {selectedRequest.bankName}
                  </p>
                  {selectedRequest.bankSwiftCode && (
                    <p>
                      <span className="font-medium">SWIFT:</span> {selectedRequest.bankSwiftCode}
                    </p>
                  )}
                  {selectedRequest.bankBranch && (
                    <p>
                      <span className="font-medium">Branch:</span> {selectedRequest.bankBranch}
                    </p>
                  )}
                </div>
              </div>

              {selectedRequest.proofImageUrl && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Proof of Transfer</p>
                  <button
                    onClick={() => handleViewProof(selectedRequest)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                  >
                    <FileImage size={18} />
                    View Receipt/Screenshot
                  </button>
                </div>
              )}

              {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Rejection Reason</p>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <p className="text-sm">{selectedRequest.rejectionReason}</p>
                  </div>
                </div>
              )}

              {selectedRequest.reviewer && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Review Information</p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p>
                      <span className="font-medium">Reviewed by:</span> {selectedRequest.reviewer?.fullName || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(selectedRequest.reviewedAt)}
                    </p>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      if (window.confirm(`Approve request ${selectedRequest.displayCode}?`)) {
                        handleReview(selectedRequest.id, 'approved');
                        setSelectedRequest(null);
                      }
                    }}
                    disabled={isReviewing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = window.prompt('Rejection reason:');
                      if (reason) {
                        handleReview(selectedRequest.id, 'rejected', reason);
                        setSelectedRequest(null);
                      }
                    }}
                    disabled={isReviewing}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <XCircle size={18} className="mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Proof of Transfer</h2>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrl(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold"
              >
                ✕
              </button>
            </div>
            {imageUrl ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Proof of Transfer"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg mx-auto"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    console.error('Failed URL:', imageUrl);
                    const errorDiv = e.target.nextElementSibling;
                    if (errorDiv) {
                      e.target.style.display = 'none';
                      errorDiv.style.display = 'block';
                    }
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', imageUrl);
                  }}
                />
                <div className="hidden text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-lg font-medium mb-2">Failed to load image</p>
                  <p className="text-sm break-all mb-4">URL: {imageUrl.substring(0, 100)}...</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => window.open(imageUrl, '_blank')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Open in New Tab
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(imageUrl);
                        alert('URL copied to clipboard');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Copy URL
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Loading image...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BankTransferRequests;
