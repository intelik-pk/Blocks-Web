import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { AlertTriangle, Search, Filter, Eye, CheckCircle, XCircle, Clock, TrendingUp, FileText, Shield, RefreshCw } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { complianceAPI } from '../../../services/complianceAPI';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';

const MonitoringAlerts = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  const adminId = adminUser?.id;
  const role = adminUser?.role;
  const isMlro = role === AdminRole.MLRO || role === AdminRole.SUPER_ADMIN;

  // Build filters
  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(severityFilter !== 'all' && { severity: severityFilter }),
    ...(categoryFilter !== 'all' && { category: categoryFilter }),
    limit: 100,
  };

  // Fetch alerts
  const { data: alertsData, isLoading, refetch, isRefetching } = useQuery(
    ['monitoring-alerts', filters],
    () => complianceAPI.getMonitoringAlerts(filters, adminId),
    {
      enabled: isAuthenticated && isMlro,
      retry: 1,
    }
  );

  const alerts = alertsData?.data?.data || alertsData?.data || [];

  // Filter by search term
  const filteredAlerts = alerts.filter(alert => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      alert.displayCode?.toLowerCase().includes(searchLower) ||
      alert.description?.toLowerCase().includes(searchLower) ||
      alert.user?.fullName?.toLowerCase().includes(searchLower) ||
      alert.user?.email?.toLowerCase().includes(searchLower)
    );
  });

  // Review mutation
  const reviewMutation = useMutation(
    ({ alertId, data }) => complianceAPI.reviewAlert(alertId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monitoring-alerts']);
        setShowReviewModal(false);
        setSelectedAlert(null);
      },
    }
  );

  // Escalate mutation
  const escalateMutation = useMutation(
    ({ alertId, data }) => complianceAPI.escalateAlert(alertId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monitoring-alerts']);
        setShowEscalateModal(false);
        setSelectedAlert(null);
      },
    }
  );

  if (!isMlro) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400">Only MLRO and Super Admin can access monitoring alerts.</p>
          </div>
        </Card>
      </div>
    );
  }

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'escalated': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'closed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'false_positive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      unusual_transaction_size: 'Unusual Transaction Size',
      rapid_movement: 'Rapid Movement',
      repeated_transfers: 'Repeated Transfers',
      structuring: 'Structuring',
      high_value: 'High Value',
      velocity: 'Velocity',
      wallet_risk: 'Wallet Risk',
      other: 'Other',
    };
    return labels[category] || category;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction Monitoring Alerts</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">View and manage alerts from the transaction monitoring system</p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          {isRefetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <InputTwo
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
              <option value="false_positive">False Positive</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="velocity">Velocity</option>
              <option value="high_value">High Value</option>
              <option value="structuring">Structuring</option>
              <option value="wallet_risk">Wallet Risk</option>
              <option value="rapid_movement">Rapid Movement</option>
              <option value="repeated_transfers">Repeated Transfers</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <Card>
        <div className="p-6">
          {isLoading ? (
            <Loader />
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Alerts Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No monitoring alerts match your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getSeverityBadgeColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge className={getStatusBadgeColor(alert.status)}>
                          {alert.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {alert.displayCode}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {getCategoryLabel(alert.alertCategory)}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {alert.user && (
                          <span>User: {alert.user.fullName || alert.user.email}</span>
                        )}
                        <span>
                          Transactions: {alert.transactionIds?.length || 0}
                        </span>
                        <span>
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {alert.status === 'open' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlert(alert);
                              setShowReviewModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAlert(alert);
                              setShowEscalateModal(true);
                            }}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Escalate
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Alert Detail Modal */}
      {selectedAlert && !showReviewModal && !showEscalateModal && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onReview={() => setShowReviewModal(true)}
          onEscalate={() => setShowEscalateModal(true)}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && selectedAlert && (
        <ReviewAlertModal
          alert={selectedAlert}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedAlert(null);
          }}
          onSave={(data) => reviewMutation.mutate({ alertId: selectedAlert.id, data })}
          isLoading={reviewMutation.isLoading}
        />
      )}

      {/* Escalate Modal */}
      {showEscalateModal && selectedAlert && (
        <EscalateAlertModal
          alert={selectedAlert}
          onClose={() => {
            setShowEscalateModal(false);
            setSelectedAlert(null);
          }}
          onSave={(data) => escalateMutation.mutate({ alertId: selectedAlert.id, data })}
          isLoading={escalateMutation.isLoading}
        />
      )}
    </div>
  );
};

// Alert Detail Modal
const AlertDetailModal = ({ alert, onClose, onReview, onEscalate }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alert Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Alert Code</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white">{alert.displayCode}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                <p className="text-sm text-gray-900 dark:text-white">{alert.alertCategory}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Severity</p>
                <Badge>{alert.severity}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <Badge>{alert.status}</Badge>
              </div>
              {alert.user && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">User</p>
                    <p className="text-sm text-gray-900 dark:text-white">{alert.user.fullName || alert.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">User Email</p>
                    <p className="text-sm text-gray-900 dark:text-white">{alert.user.email}</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Created At</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Description</p>
              <p className="text-sm text-gray-900 dark:text-white">{alert.description}</p>
            </div>

            {alert.alertData && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Alert Data</p>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <pre className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                    {JSON.stringify(alert.alertData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Related Transactions</p>
              <p className="text-sm text-gray-900 dark:text-white">
                {alert.transactionIds?.length || 0} transaction(s)
              </p>
            </div>

            {alert.status === 'open' && (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button variant="outline" onClick={onReview}>Review</Button>
                <Button onClick={onEscalate}>Escalate to Case</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Review Alert Modal
const ReviewAlertModal = ({ alert, onClose, onSave, isLoading }) => {
  const [status, setStatus] = useState('closed');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ status, notes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Alert</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="closed">Closed (No Action)</option>
                <option value="false_positive">False Positive</option>
                <option value="under_review">Under Review</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add review notes..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Review'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Escalate Alert Modal
const EscalateAlertModal = ({ alert, onClose, onSave, isLoading }) => {
  const [narrative, setNarrative] = useState('');
  const [isarId, setIsarId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!narrative.trim()) {
      alert('Narrative is required');
      return;
    }
    onSave({
      narrative: narrative.trim(),
      isarId: isarId.trim() || undefined,
      notes: additionalNotes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Escalate Alert to Case</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ISAR ID (Optional - leave empty to create new case)
              </label>
              <InputTwo
                type="text"
                value={isarId}
                onChange={(e) => setIsarId(e.target.value)}
                placeholder="ISAR-000001 (or leave empty)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Narrative * (Required)
              </label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe why this alert is being escalated to a case..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Escalating...' : 'Escalate to Case'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MonitoringAlerts;
