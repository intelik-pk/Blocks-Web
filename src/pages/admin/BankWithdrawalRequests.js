import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import {
  ArrowDownCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  User,
  DollarSign,
  Building2,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import { formatExactPrice } from '../../utils/formatPrice';

const BankWithdrawalRequests = ({ initialFilters, onFiltersSet }) => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  
  const adminId = adminUser?.id || adminUser?.userId || adminUser?._id;
  
  useEffect(() => {
    if (adminUser) {
      console.log('BankWithdrawalRequests: adminUser:', adminUser);
      console.log('BankWithdrawalRequests: adminId:', adminId);
    }
  }, [adminUser, adminId]);

  const [filters, setFilters] = useState({
    search: initialFilters?.search || '',
    status: initialFilters?.status || 'pending',
  });

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [bankTransactionId, setBankTransactionId] = useState('');

  // Fetch withdrawal requests
  const { data: requestsData, isLoading, error, refetch } = useQuery(
    ['admin-bank-withdrawals', filters.status],
    async () => {
      const response = await adminAPI.getBankWithdrawals({
        status: filters.status === 'all' ? undefined : filters.status,
      });
      return response;
    },
    {
      enabled: isAuthenticated,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  );

  const requests = requestsData?.data?.data || [];

  // Statistics
  const stats = useMemo(() => {
    const allRequests = requestsData?.data?.data || [];
    return {
      pending: allRequests.filter((r) => r.status === 'pending').length,
      completed: allRequests.filter((r) => r.status === 'completed').length,
      rejected: allRequests.filter((r) => r.status === 'rejected').length,
      totalAmount: allRequests
        .filter((r) => r.status === 'pending')
        .reduce((sum, r) => sum + parseFloat(r.amountUSDT || 0), 0),
    };
  }, [requestsData]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.displayCode?.toLowerCase().includes(searchLower) ||
          r.user?.fullName?.toLowerCase().includes(searchLower) ||
          r.user?.email?.toLowerCase().includes(searchLower) ||
          r.userBankAccountNumber?.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [requests, filters.search]);

  // Complete withdrawal (admin confirms transfer)
  const handleComplete = async () => {
    if (!bankTransactionId.trim()) {
      alert('Please enter the bank transaction ID from your bank app');
      return;
    }

    if (!window.confirm(`Mark withdrawal ${selectedRequest.displayCode} as completed? This will debit ${formatExactPrice(selectedRequest.amountUSDT)} USDT from user's wallet.`)) {
      return;
    }

    setIsCompleting(true);
    try {
      await adminAPI.completeBankWithdrawal(selectedRequest.id, {
        adminId,
        bankTransactionId: bankTransactionId.trim(),
      });
      
      await refetch();
      setSelectedRequest(null);
      setBankTransactionId('');
      alert('Withdrawal marked as completed. User wallet has been debited.');
    } catch (error) {
      console.error('Complete error:', error);
      alert(`Failed to complete withdrawal: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsCompleting(false);
    }
  };

  // Reject withdrawal
  const handleReject = async () => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason || !reason.trim()) {
      return;
    }

    if (!window.confirm(`Reject withdrawal ${selectedRequest.displayCode}?`)) {
      return;
    }

    setIsCompleting(true);
    try {
      await adminAPI.rejectBankWithdrawal(selectedRequest.id, {
        adminId,
        rejectionReason: reason.trim(),
      });
      
      await refetch();
      setSelectedRequest(null);
      alert('Withdrawal rejected successfully');
    } catch (error) {
      console.error('Reject error:', error);
      alert(`Failed to reject withdrawal: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsCompleting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: 'warning', icon: Clock, label: 'Pending' },
      completed: { variant: 'success', icon: CheckCircle, label: 'Completed' },
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
            <p className="text-red-500">Error loading withdrawal requests</p>
            <p className="text-sm text-gray-500 mt-2">{error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowDownCircle className="w-6 h-6" />
            Bank Withdrawal Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and process bank withdrawal requests
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
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
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
            <option value="completed">Completed</option>
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
                  User Bank Details
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
                    No withdrawal requests found
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
                        <p className="font-medium">{request.userBankName}</p>
                        <p className="text-gray-500">{request.userBankAccountNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(request.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(request);
                        }}
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Withdrawal Request: {selectedRequest.displayCode}
                </h2>
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setBankTransactionId('');
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* User Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">User Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedRequest.user?.fullName || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">{selectedRequest.user?.email || 'N/A'}</p>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Withdrawal Amount</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatExactPrice(selectedRequest.amountUSDT)} USDT
                    </p>
                  </div>
                </div>

                {/* User's Bank Account Details */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <Building2 size={16} />
                    User's Bank Account Details (Transfer Money To)
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Account Name</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.userBankAccountName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Account Number</p>
                        <p className="font-mono font-medium text-gray-900 dark:text-white">
                          {selectedRequest.userBankAccountNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Bank Name</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.userBankName}
                        </p>
                      </div>
                      {selectedRequest.userBankIban && (
                        <div>
                          <p className="text-xs text-gray-500">IBAN</p>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">
                            {selectedRequest.userBankIban}
                          </p>
                        </div>
                      )}
                      {selectedRequest.userBankSwiftCode && (
                        <div>
                          <p className="text-xs text-gray-500">SWIFT Code</p>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">
                            {selectedRequest.userBankSwiftCode}
                          </p>
                        </div>
                      )}
                      {selectedRequest.userBankBranch && (
                        <div>
                          <p className="text-xs text-gray-500">Branch</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {selectedRequest.userBankBranch}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>

                {/* Bank Transaction ID (if completed) */}
                {selectedRequest.status === 'completed' && selectedRequest.bankTransactionId && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Bank Transaction ID</h3>
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <p className="font-mono text-sm text-gray-900 dark:text-white">
                        {selectedRequest.bankTransactionId}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions for Pending Requests */}
                {selectedRequest.status === 'pending' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bank Transaction ID *
                      </label>
                      <input
                        type="text"
                        placeholder="Enter transaction ID from your bank app"
                        value={bankTransactionId}
                        onChange={(e) => setBankTransactionId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the transaction ID from your bank app after transferring money
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleComplete}
                        disabled={isCompleting || !bankTransactionId.trim()}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isCompleting ? 'Processing...' : 'Mark as Transferred'}
                      </Button>
                      <Button
                        onClick={handleReject}
                        disabled={isCompleting}
                        variant="outline"
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rejection Reason (if rejected) */}
                {selectedRequest.status === 'rejected' && selectedRequest.rejectionReason && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Rejection Reason</h3>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedRequest.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="pt-4 border-t text-sm text-gray-500">
                  <p>Created: {formatDate(selectedRequest.createdAt)}</p>
                  {selectedRequest.reviewedAt && (
                    <p>Reviewed: {formatDate(selectedRequest.reviewedAt)}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BankWithdrawalRequests;


