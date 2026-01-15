import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FileText, Plus, CheckCircle, XCircle, Clock, Eye, Edit, Send, Download, AlertCircle, RefreshCw } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { complianceAPI } from '../../../services/complianceAPI';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';

const STRReports = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filingStatusFilter, setFilingStatusFilter] = useState('all');

  const adminId = adminUser?.id;
  const role = adminUser?.role;
  const isMlro = role === AdminRole.MLRO || role === AdminRole.SUPER_ADMIN;

  // Build filters
  const filters = {
    ...(reportTypeFilter !== 'all' && { reportType: reportTypeFilter }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(filingStatusFilter !== 'all' && { filingStatus: filingStatusFilter }),
  };

  // Fetch reports
  const { data: reportsData, isLoading, refetch, isRefetching } = useQuery(
    ['str-reports', filters],
    () => complianceAPI.getReports(filters, adminId),
    {
      enabled: isAuthenticated && isMlro,
      retry: 1,
    }
  );

  const reports = reportsData?.data?.data || reportsData?.data || [];

  // Create report mutation
  const createMutation = useMutation(
    (data) => {
      console.log('[STRReports] Creating report with data:', data);
      console.log('[STRReports] Admin ID:', adminId);
      return complianceAPI.createReport(data, adminId);
    },
    {
      onSuccess: (response) => {
        console.log('[STRReports] Report created successfully:', response);
        queryClient.invalidateQueries(['str-reports']);
        setShowCreateModal(false);
        // Show success message
        const reportRef = response?.data?.data?.reportReference || response?.data?.reportReference || 'N/A';
        alert(`Report created successfully! Reference: ${reportRef}`);
      },
      onError: (error) => {
        console.error('[STRReports] Error creating report:', error);
        console.error('[STRReports] Error response:', error?.response);
        const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create report. Please check the console for details.';
        alert(`Error: ${errorMessage}`);
      },
    }
  );

  // Submit for approval mutation
  const submitMutation = useMutation(
    (id) => complianceAPI.submitReport(id, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['str-reports']);
      },
    }
  );

  // Approve mutation
  const approveMutation = useMutation(
    ({ reportId, data }) => complianceAPI.approveReport(reportId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['str-reports']);
        setShowApproveModal(false);
        setSelectedReport(null);
      },
    }
  );

  // Reject mutation
  const rejectMutation = useMutation(
    ({ reportId, data }) => complianceAPI.rejectReport(reportId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['str-reports']);
        setShowRejectModal(false);
        setSelectedReport(null);
      },
    }
  );

  // File report mutation
  const fileMutation = useMutation(
    ({ reportId, data }) => complianceAPI.fileReport(reportId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['str-reports']);
        setShowFileModal(false);
        setSelectedReport(null);
      },
    }
  );

  if (!isMlro) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400">Only MLRO and Super Admin can manage STR/CTR reports.</p>
          </div>
        </Card>
      </div>
    );
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'filed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getFilingStatusBadgeColor = (status) => {
    switch (status) {
      case 'not_filed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'acknowledged': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">STR/CTR Reports</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage Suspicious Transaction Reports and Currency Transaction Reports</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                value={reportTypeFilter}
                onChange={(e) => setReportTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="str">STR (Suspicious Transaction)</option>
                <option value="ctr">CTR (Currency Transaction)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="filed">Filed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filing Status
              </label>
              <select
                value={filingStatusFilter}
                onChange={(e) => setFilingStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Filing Status</option>
                <option value="not_filed">Not Filed</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Reports List */}
      <Card>
        <div className="p-6">
          {isLoading ? (
            <Loader />
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Reports Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first STR or CTR report.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Report
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{report.reportReference}</h3>
                        <Badge className={getStatusBadgeColor(report.status)}>
                          {report.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getFilingStatusBadgeColor(report.filingStatus)}>
                          {report.filingStatus.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {report.reportType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {report.narrative}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {report.subjectUser && (
                          <span>Subject: {report.subjectUser.fullName || report.subjectUser.email}</span>
                        )}
                        {report.approvedAt && (
                          <span>Approved: {new Date(report.approvedAt).toLocaleDateString()}</span>
                        )}
                        {report.filedAt && (
                          <span>Filed: {new Date(report.filedAt).toLocaleDateString()}</span>
                        )}
                        {report.goamlReference && (
                          <span>goAML Ref: {report.goamlReference}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowViewModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {report.status === 'draft' && isMlro && (
                        // MLRO can directly approve/reject draft reports (no need to submit for approval)
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowApproveModal(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowRejectModal(true);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {report.status === 'draft' && !isMlro && (
                        // Non-MLRO users (if any) need to submit for MLRO approval
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowSubmitConfirmModal(true);
                          }}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Submit
                        </Button>
                      )}
                      {report.status === 'pending_approval' && isMlro && (
                        // Legacy: Handle reports that were submitted before this change
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowApproveModal(true);
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowRejectModal(true);
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}
                      {report.status === 'approved' && isMlro && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowFileModal(true);
                          }}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          File
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create Report Modal */}
      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isLoading}
        />
      )}

      {/* View Report Modal */}
      {showViewModal && selectedReport && (
        <ViewReportModal
          report={selectedReport}
          onClose={() => {
            setShowViewModal(false);
            setSelectedReport(null);
          }}
          onRevise={(data) => {
            // Handle narrative revision
            complianceAPI.reviseNarrative(selectedReport.id, data, adminId)
              .then(() => {
                queryClient.invalidateQueries(['str-reports']);
                setShowViewModal(false);
                setSelectedReport(null);
              });
          }}
          isMlro={isMlro}
        />
      )}

      {/* Approve Report Modal */}
      {showApproveModal && selectedReport && (
        <ApproveReportModal
          report={selectedReport}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedReport(null);
          }}
          onSave={(data) => approveMutation.mutate({ reportId: selectedReport.id, data })}
          isLoading={approveMutation.isLoading}
        />
      )}

      {/* Reject Report Modal */}
      {showRejectModal && selectedReport && (
        <RejectReportModal
          report={selectedReport}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedReport(null);
          }}
          onSave={(data) => rejectMutation.mutate({ reportId: selectedReport.id, data })}
          isLoading={rejectMutation.isLoading}
        />
      )}

      {/* File Report Modal */}
      {showFileModal && selectedReport && (
        <FileReportModal
          report={selectedReport}
          onClose={() => {
            setShowFileModal(false);
            setSelectedReport(null);
          }}
          onSave={(data) => fileMutation.mutate({ reportId: selectedReport.id, data })}
          isLoading={fileMutation.isLoading}
        />
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirmModal && selectedReport && (
        <SubmitConfirmModal
          report={selectedReport}
          onClose={() => {
            setShowSubmitConfirmModal(false);
            setSelectedReport(null);
          }}
          onConfirm={() => {
            submitMutation.mutate(selectedReport.id);
            setShowSubmitConfirmModal(false);
            setSelectedReport(null);
          }}
          isLoading={submitMutation.isLoading}
        />
      )}
    </div>
  );
};

// Create Report Modal
const CreateReportModal = ({ onClose, onSave, isLoading }) => {
  const [reportType, setReportType] = useState('str');
  const [subjectUserId, setSubjectUserId] = useState('');
  const [narrative, setNarrative] = useState('');
  const [isarId, setIsarId] = useState('');
  const [alertIds, setAlertIds] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('[CreateReportModal] Form submitted');
    console.log('[CreateReportModal] Form values:', {
      reportType,
      subjectUserId: subjectUserId.trim(),
      narrative: narrative.trim(),
      isarId: isarId.trim() || undefined,
      alertIds: alertIds.trim() ? alertIds.split(',').map(id => id.trim()) : undefined,
    });
    
    // Validate required fields
    if (!subjectUserId.trim()) {
      alert('Subject User ID is required');
      return;
    }
    if (!narrative.trim()) {
      alert('Narrative is required');
      return;
    }
    
    const formData = {
      reportType,
      subjectUserId: subjectUserId.trim(),
      narrative: narrative.trim(),
      isarId: isarId.trim() || undefined,
      alertIds: alertIds.trim() ? alertIds.split(',').map(id => id.trim()) : undefined,
    };
    
    console.log('[CreateReportModal] Calling onSave with:', formData);
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Report</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type *
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="str">STR (Suspicious Transaction Report)</option>
                <option value="ctr">CTR (Currency Transaction Report)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject User ID *
              </label>
              <InputTwo
                type="text"
                value={subjectUserId}
                onChange={(e) => setSubjectUserId(e.target.value)}
                placeholder="User UUID or Display Code"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Narrative * (Formal, factual description)
              </label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Write a formal, factual narrative describing the suspicious activity or currency transaction..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use formal language. Describe facts, dates, amounts, and suspicious patterns clearly.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Related ISAR Case ID (Optional)
              </label>
              <InputTwo
                type="text"
                value={isarId}
                onChange={(e) => setIsarId(e.target.value)}
                placeholder="ISAR UUID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Related Alert IDs (Optional, comma-separated)
              </label>
              <InputTwo
                type="text"
                value={alertIds}
                onChange={(e) => setAlertIds(e.target.value)}
                placeholder="ALERT-000001, ALERT-000002"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Report'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// View Report Modal
const ViewReportModal = ({ report, onClose, onRevise, isMlro }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [narrative, setNarrative] = useState(report.narrative);
  const [revisionNotes, setRevisionNotes] = useState('');

  const handleRevise = () => {
    onRevise({ narrative, revisionNotes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Report: {report.reportReference}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Report Type</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase">{report.reportType}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <Badge>{report.status}</Badge>
              </div>
              {report.subjectUser && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Subject</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {report.subjectUser.fullName || report.subjectUser.email}
                  </p>
                </div>
              )}
              {report.narrativeVersion && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Narrative Version</p>
                  <p className="text-sm text-gray-900 dark:text-white">v{report.narrativeVersion}</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Narrative
                </label>
                {isMlro && report.status !== 'filed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isEditing ? 'Cancel Edit' : 'Edit'}
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Revision Notes
                    </label>
                    <InputTwo
                      type="text"
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      placeholder="Explain why you're revising..."
                    />
                  </div>
                  <Button onClick={handleRevise}>
                    Save Revision
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{report.narrative}</p>
                </div>
              )}
            </div>

            {report.narrativeHistory && report.narrativeHistory.length > 1 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Narrative History</p>
                <div className="space-y-2">
                  {report.narrativeHistory.map((entry, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold">Version {entry.version}</span>
                        <span>{new Date(entry.revisedAt).toLocaleString()}</span>
                      </div>
                      {entry.revisionNotes && (
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{entry.revisionNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.filingDataPacket && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filing Data Packet</p>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <pre className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">
                    {JSON.stringify(report.filingDataPacket, null, 2)}
                  </pre>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  <Download className="w-4 h-4 mr-2" />
                  Download Data Packet
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Approve Report Modal
const ApproveReportModal = ({ report, onClose, onSave, isLoading }) => {
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ approvalNotes: notes.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Approve Report</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Approve report <strong>{report.reportReference}</strong> for filing?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Approval Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add approval notes..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Approving...' : 'Approve Report'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Reject Report Modal
const RejectReportModal = ({ report, onClose, onSave, isLoading }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Rejection reason is required');
      return;
    }
    onSave({ rejectionReason: reason.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Report</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Reject report <strong>{report.reportReference}</strong>?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Explain why this report is being rejected..."
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="outline" className="bg-red-600 hover:bg-red-700 text-white border-red-600" disabled={isLoading}>
                {isLoading ? 'Rejecting...' : 'Reject Report'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Submit Confirmation Modal
const SubmitConfirmModal = ({ report, onClose, onConfirm, isLoading }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Submit Report for Approval</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Submit report <strong>{report.reportReference}</strong> for MLRO approval?
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Once submitted, the report will be pending MLRO review and cannot be edited until approved or rejected.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// File Report Modal
const FileReportModal = ({ report, onClose, onSave, isLoading }) => {
  const [manualFiling, setManualFiling] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      manualFiling,
      filingNotes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Report to goAML</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              File report <strong>{report.reportReference}</strong> to the Financial Monitoring Unit (goAML)?
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualFiling}
                  onChange={(e) => setManualFiling(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Manual Filing (Generate data packet for manual submission)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                If checked, the system will generate a data packet that you can submit manually to goAML.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filing Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add filing notes..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Filing...' : manualFiling ? 'Generate Data Packet' : 'File to goAML'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default STRReports;
