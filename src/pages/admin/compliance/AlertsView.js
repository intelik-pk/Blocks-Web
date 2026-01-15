import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { AlertTriangle, Search, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { complianceAPI } from '../../../services/complianceAPI';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';

const AlertsView = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);

  const role = adminUser?.role;
  const isReadOnly = role === AdminRole.AUDIT_MANAGER;

  // Build filters for monitoring alerts
  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(severityFilter !== 'all' && { severity: severityFilter }),
    limit: 1000,
  };

  // Fetch monitoring alerts (same as MLRO sees)
  const { data: alertsData, isLoading } = useQuery(
    ['compliance-monitoring-alerts-view', filters, adminUser?.id],
    () => complianceAPI.getMonitoringAlerts(filters, adminUser?.id),
    {
      enabled: isAuthenticated && !!adminUser?.id,
      retry: 1,
    }
  );

  const alerts = alertsData?.data?.data || alertsData?.data || [];

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      (alert.displayCode || alert.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.alertCategory || alert.alertType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.user?.fullName || alert.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'low': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'under_review': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'escalated': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'false_positive': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view alerts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Manual Alerts {isReadOnly && '(View Only)'}
          </h2>
          <p className="text-muted-foreground">
            Monitoring alerts created by MLRO/system (same as MLRO portal)
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
                placeholder="Search alerts..."
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
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No alerts found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {alert.displayCode || alert.id}
                      </span>
                      <Badge className={cn(getSeverityBadgeColor(alert.severity))}>
                        {alert.severity}
                      </Badge>
                      <Badge className={cn(getStatusBadgeColor(alert.status))}>
                        {alert.status}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {alert.alertCategory || alert.alertType || 'N/A'}
                      </Badge>
                      {alert.user && (
                        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {alert.user.fullName || alert.user.email || 'User'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <span>Created: {new Date(alert.createdAt).toLocaleDateString()}</span>
                      {alert.reviewedAt && (
                        <span>Reviewed: {new Date(alert.reviewedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlert(alert);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Alert Details: {selectedAlert.displayCode}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity</label>
                  <Badge className={cn(getSeverityBadgeColor(selectedAlert.severity), "mt-1")}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge className={cn(getStatusBadgeColor(selectedAlert.status), "mt-1")}>
                    {selectedAlert.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Alert Category</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedAlert.alertCategory || selectedAlert.alertType || 'N/A'}</p>
                </div>
                {selectedAlert.rule && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monitoring Rule</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedAlert.rule.name || 'N/A'}</p>
                  </div>
                )}
                {selectedAlert.user && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Related User</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedAlert.user.fullName || selectedAlert.user.email || 'N/A'}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created At</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {new Date(selectedAlert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedAlert.description}
                </p>
              </div>

              {selectedAlert.alertData && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Alert Detection Data</label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                    {selectedAlert.alertData.thresholdValue !== undefined && (
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">Threshold:</span> {selectedAlert.alertData.thresholdValue}
                      </p>
                    )}
                    {selectedAlert.alertData.actualValue !== undefined && (
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">Actual Value:</span> {selectedAlert.alertData.actualValue}
                      </p>
                    )}
                    {selectedAlert.alertData.transactionCount !== undefined && (
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">Transaction Count:</span> {selectedAlert.alertData.transactionCount}
                      </p>
                    )}
                    {selectedAlert.alertData.totalAmount !== undefined && (
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">Total Amount:</span> ${parseFloat(selectedAlert.alertData.totalAmount).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedAlert.transactionIds && selectedAlert.transactionIds.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Related Transactions</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedAlert.transactionIds.length} transaction(s)
                  </p>
                </div>
              )}

              {selectedAlert.isar && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Escalated to ISAR</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedAlert.isar.displayCode || selectedAlert.isarId || 'N/A'}
                  </p>
                </div>
              )}

              {selectedAlert.reviewNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Review Notes</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {selectedAlert.reviewNotes}
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

export default AlertsView;
