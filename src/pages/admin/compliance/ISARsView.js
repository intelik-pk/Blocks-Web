import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FileText, Search, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Plus } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { complianceAPI } from '../../../services/complianceAPI';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';
import { adminAPI } from '../../../services/api';

const ISARsView = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'draft', 'submitted_to_mlro', 'escalate_to_str', 'closed', 'request_further_info'
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'low', 'medium', 'high', 'critical'
  const [selectedIsar, setSelectedIsar] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const role = adminUser?.role;
  const adminId = adminUser?.id;
  const isMLRO = role === AdminRole.MLRO;
  const isComplianceOfficer = role === AdminRole.COMPLIANCE_OFFICER;
  const isReadOnly = role === AdminRole.AUDIT_MANAGER;
  const canCreateIsar = isComplianceOfficer || isMLRO || role === AdminRole.SUPER_ADMIN;

  // Fetch all ISARs
  const { data: isarsData, isLoading } = useQuery(
    ['compliance-isars-view', adminUser?.id],
    () => complianceAPI.getIsars({ limit: 1000 }, adminUser?.id),
    {
      enabled: isAuthenticated && !!adminUser?.id,
      retry: 1,
    }
  );

  const isars = isarsData?.data?.data || isarsData?.data || [];

  // Filter ISARs
  const filteredIsars = isars.filter(isar => {
    const matchesSearch = 
      (isar.displayCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (isar.narrative || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (isar.suspicionType || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || isar.mlroDecision === statusFilter;
    const matchesRisk = riskFilter === 'all' || isar.riskLevel === riskFilter;
    
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const getRiskBadgeColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Create ISAR mutation
  const createMutation = useMutation(
    (data) => {
      console.log('[ISARsView] Creating ISAR with data:', data);
      console.log('[ISARsView] Admin ID:', adminId);
      console.log('[ISARsView] API endpoint:', '/admin/compliance/isars');
      return complianceAPI.createIsar(data, adminId);
    },
    {
      onSuccess: (response) => {
        console.log('[ISARsView] ISAR created successfully:', response);
        queryClient.invalidateQueries(['compliance-isars-view']);
        setShowCreateModal(false);
        alert('ISAR created successfully');
      },
      onError: (error) => {
        console.error('[ISARsView] Error creating ISAR:', error);
        console.error('[ISARsView] Error response:', error.response);
        console.error('[ISARsView] Error config:', error.config);
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Unknown error';
        const statusCode = error.response?.status || 'N/A';
        alert(`Failed to create ISAR (Status: ${statusCode}): ${errorMessage}`);
      },
    }
  );

  // Review/Finalize ISAR mutation (MLRO only)
  const reviewMutation = useMutation(
    ({ isarId, data }) => complianceAPI.reviewIsar(isarId, data, adminId),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(['compliance-isars-view']);
        setShowReviewModal(false);
        setSelectedIsar(null);
        
        // Check if STR report was created
        const strReportRef = response?.data?.strReportReference || response?.strReportReference;
        const message = response?.data?.message || response?.message || 'ISAR finalized successfully';
        
        if (strReportRef) {
          // Show success message with option to navigate to STR reports
          const userConfirmed = window.confirm(
            `${message}\n\nWould you like to view the STR report ${strReportRef} now?`
          );
          if (userConfirmed) {
            // Navigate to STR reports page
            // This assumes the parent component (ComplianceDashboard) handles navigation
            // We'll trigger a custom event that the dashboard can listen to
            window.dispatchEvent(new CustomEvent('navigate-to-str-reports', { 
              detail: { reportReference: strReportRef } 
            }));
          } else {
            alert(message);
          }
        } else {
          alert(message);
        }
      },
      onError: (error) => {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Unknown error';
        alert(`Failed to finalize ISAR: ${errorMessage}`);
      },
    }
  );

  // Check if ISAR can be reviewed by MLRO
  // MLRO can review: submitted_to_mlro, request_further_info, and draft (for direct review)
  const canReviewIsar = (isar) => {
    if (!isMLRO) return false;
    const reviewableStatuses = ['submitted_to_mlro', 'request_further_info', 'draft'];
    return reviewableStatuses.includes(isar.mlroDecision);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'submitted_to_mlro': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'escalate_to_str': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'request_further_info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view ISARs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <FileText className="w-6 h-6" />
            ISARs {isReadOnly && '(View Only)'}
          </h2>
          <p className="text-muted-foreground">
            Internal Suspicious Activity Reports
          </p>
        </div>
        {canCreateIsar && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create ISAR
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <InputTwo
                type="text"
                placeholder="Search by code, narrative, or suspicion type..."
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
              <option value="draft">Draft</option>
              <option value="submitted_to_mlro">Submitted to MLRO</option>
              <option value="escalate_to_str">Escalated to STR</option>
              <option value="closed">Closed</option>
              <option value="request_further_info">Request Further Info</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ISARs List */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredIsars.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No ISARs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIsars.map((isar) => (
              <div
                key={isar.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => setSelectedIsar(isar)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {isar.displayCode || isar.id}
                      </span>
                      <Badge className={cn(getRiskBadgeColor(isar.riskLevel))}>
                        {isar.riskLevel}
                      </Badge>
                      <Badge className={cn(getStatusBadgeColor(isar.mlroDecision))}>
                        {isar.mlroDecision}
                      </Badge>
                      {isar.strFiled && (
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          STR Filed
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>Suspicion Type:</strong> {isar.suspicionType}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {isar.narrative}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <span>Reported: {new Date(isar.reportedAt || isar.createdAt).toLocaleDateString()}</span>
                      {isar.mlroReviewedAt && (
                        <span>Reviewed: {new Date(isar.mlroReviewedAt).toLocaleDateString()}</span>
                      )}
                      {isar.strFiledAt && (
                        <span>STR Filed: {new Date(isar.strFiledAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIsar(isar);
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

      {/* ISAR Detail Modal */}
      {selectedIsar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                ISAR Details: {selectedIsar.displayCode}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIsar(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Level</label>
                  <Badge className={cn(getRiskBadgeColor(selectedIsar.riskLevel), "mt-1")}>
                    {selectedIsar.riskLevel}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge className={cn(getStatusBadgeColor(selectedIsar.mlroDecision), "mt-1")}>
                    {selectedIsar.mlroDecision}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Suspicion Type</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedIsar.suspicionType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reported At</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {new Date(selectedIsar.reportedAt || selectedIsar.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Narrative</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  {selectedIsar.narrative}
                </p>
              </div>

              {selectedIsar.mlroNotes && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">MLRO Notes</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {selectedIsar.mlroNotes}
                  </p>
                </div>
              )}

              {selectedIsar.strFiled && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-purple-900 dark:text-purple-300">STR Filed</span>
                  </div>
                  {selectedIsar.strReference && (
                    <p className="text-sm text-purple-800 dark:text-purple-400">
                      Reference: {selectedIsar.strReference}
                    </p>
                  )}
                  {selectedIsar.strFiledAt && (
                    <p className="text-sm text-purple-800 dark:text-purple-400">
                      Filed At: {new Date(selectedIsar.strFiledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {selectedIsar.decisionRationale && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Decision Rationale</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {selectedIsar.decisionRationale}
                  </p>
                </div>
              )}

              {/* MLRO Review Actions */}
              {isMLRO && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {canReviewIsar(selectedIsar) ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                          ⚠️ ISAR Pending MLRO Review
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          Status: {selectedIsar.mlroDecision} - Action Required
                        </p>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowReviewModal(true);
                          }}
                          className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Review & Finalize
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Status: {selectedIsar.mlroDecision} - {selectedIsar.mlroDecision === 'escalate_to_str' || selectedIsar.mlroDecision === 'closed' ? 'Already Finalized' : 'Not Ready for Review'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Review ISAR Modal (MLRO only) */}
      {showReviewModal && selectedIsar && (
        <ReviewIsarModal
          isar={selectedIsar}
          onClose={() => {
            setShowReviewModal(false);
          }}
          onSave={(data) => {
            reviewMutation.mutate({ isarId: selectedIsar.id, data });
          }}
          isLoading={reviewMutation.isLoading}
        />
      )}

      {/* Create ISAR Modal */}
      {showCreateModal && (
        <CreateIsarModal
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isLoading}
          adminId={adminId}
        />
      )}
    </div>
  );
};

// Create ISAR Modal Component
const CreateIsarModal = ({ onClose, onSave, isLoading, adminId }) => {
  const [userId, setUserId] = useState('');
  const [suspicionType, setSuspicionType] = useState('unusual_pattern');
  const [narrative, setNarrative] = useState('');
  const [riskLevel, setRiskLevel] = useState('medium');
  const [transactionIds, setTransactionIds] = useState('');
  const [alertIds, setAlertIds] = useState('');
  const [triggerType, setTriggerType] = useState('transaction_monitoring');
  const [observedBehaviors, setObservedBehaviors] = useState('');
  const [potentialTypologies, setPotentialTypologies] = useState('');

  // Fetch real data from database
  const { data: usersData } = useQuery(
    ['users-for-isar-random-fill'],
    () => adminAPI.getUsers({ limit: 100 }),
    { enabled: !!adminId, retry: 1 }
  );

  const { data: transactionsData } = useQuery(
    ['transactions-for-isar-random-fill'],
    () => adminAPI.getTransactions({ limit: 100 }),
    { enabled: !!adminId, retry: 1 }
  );

  const { data: alertsData } = useQuery(
    ['alerts-for-isar-random-fill'],
    () => complianceAPI.getMonitoringAlerts({ limit: 100 }, adminId),
    { enabled: !!adminId, retry: 1 }
  );

  const users = usersData?.data?.users || usersData?.data?.data?.users || usersData?.data || [];
  const transactions = transactionsData?.data?.data?.transactions || 
                      transactionsData?.data?.transactions || 
                      transactionsData?.data || 
                      (Array.isArray(transactionsData) ? transactionsData : []);
  const alerts = alertsData?.data?.data || alertsData?.data || [];

  // Random fill function for testing - uses real data from database
  const handleRandomFill = () => {
    if (users.length === 0 && transactions.length === 0 && alerts.length === 0) {
      alert('Loading data from database... Please wait a moment and try again.');
      return;
    }
    const suspicionTypes = ['structuring', 'unusual_pattern', 'high_velocity', 'sanctions_match', 'pep', 'unusual_source', 'other'];
    const riskLevels = ['low', 'medium', 'high', 'critical'];
    const triggerTypes = ['transaction_monitoring', 'manual_review', 'external_information', 'system_alert'];
    
    const narratives = [
      'Customer engaged in multiple transactions just below reporting thresholds, suggesting potential structuring activity. Transactions occurred within a short time frame and involved rapid conversion between fiat and virtual assets.',
      'Unusual transaction pattern detected with inconsistent customer profile. Large amounts transferred from unknown sources with no clear business justification. Customer unable to provide satisfactory explanation for source of funds.',
      'High-velocity transaction activity observed. Customer conducted 15 transactions within 24 hours, totaling significant amounts. Pattern inconsistent with stated business purpose and customer risk profile.',
      'Potential sanctions list match identified during screening. Customer name and details match entries in international sanctions databases. Requires immediate review and verification.',
      'Politically Exposed Person (PEP) identified with high-value transactions. Customer holds public office and engaged in transactions exceeding normal patterns for their position.',
      'Unusual source of funds detected. Customer received funds from multiple unrelated parties with no clear business relationship. Transactions show characteristics of potential money laundering typologies.',
      'Complex transaction structure involving multiple intermediaries and jurisdictions. Funds routed through several accounts before reaching final destination, obscuring origin and purpose.'
    ];

    const behaviors = [
      'Unusually large transaction',
      'Rapid conversion from fiat to virtual assets',
      'Inconsistent with customer profile',
      'Multiple transactions just below threshold',
      'Transactions from high-risk jurisdictions',
      'Unusual time patterns (late night/weekend)',
      'Frequent small transactions followed by large withdrawal'
    ];

    const typologies = [
      'Layering',
      'Use of virtual assets to obscure source of funds',
      'Structuring/Smurfing',
      'Integration',
      'Placement through complex structures',
      'Trade-based money laundering',
      'Shell company usage'
    ];

    // Get random user from real database (use displayCode if available, otherwise ID)
    let randomUserId = '';
    if (users.length > 0) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      randomUserId = randomUser.displayCode || randomUser.id || '';
    }

    // Get random transactions from real database
    let randomTxIds = '';
    if (transactions.length > 0) {
      const randomTxCount = Math.min(Math.floor(Math.random() * 3) + 1, transactions.length);
      const shuffledTxs = [...transactions].sort(() => 0.5 - Math.random());
      const selectedTxs = shuffledTxs.slice(0, randomTxCount);
      randomTxIds = selectedTxs
        .map(tx => tx.displayCode || tx.id)
        .filter(Boolean)
        .join(', ');
    }

    // Get random alerts from real database
    let randomAlertIds = '';
    if (alerts.length > 0) {
      const randomAlertCount = Math.min(Math.floor(Math.random() * 2) + 1, alerts.length);
      const shuffledAlerts = [...alerts].sort(() => 0.5 - Math.random());
      const selectedAlerts = shuffledAlerts.slice(0, randomAlertCount);
      randomAlertIds = selectedAlerts
        .map(alert => alert.displayCode || alert.id)
        .filter(Boolean)
        .join(', ');
    }

    // Random selection from arrays
    const randomSuspicionType = suspicionTypes[Math.floor(Math.random() * suspicionTypes.length)];
    const randomRiskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const randomTriggerType = triggerTypes[Math.floor(Math.random() * triggerTypes.length)];
    const randomNarrative = narratives[Math.floor(Math.random() * narratives.length)];
    
    // Random behaviors (2-4 items)
    const randomBehaviorCount = Math.floor(Math.random() * 3) + 2;
    const shuffledBehaviors = [...behaviors].sort(() => 0.5 - Math.random());
    const randomBehaviors = shuffledBehaviors.slice(0, randomBehaviorCount).join(', ');

    // Random typologies (1-3 items)
    const randomTypologyCount = Math.floor(Math.random() * 3) + 1;
    const shuffledTypologies = [...typologies].sort(() => 0.5 - Math.random());
    const randomTypologies = shuffledTypologies.slice(0, randomTypologyCount).join(', ');

    // Fill all fields
    setUserId(randomUserId);
    setSuspicionType(randomSuspicionType);
    setNarrative(randomNarrative);
    setRiskLevel(randomRiskLevel);
    setTransactionIds(randomTxIds);
    setAlertIds(randomAlertIds);
    setTriggerType(randomTriggerType);
    setObservedBehaviors(randomBehaviors);
    setPotentialTypologies(randomTypologies);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!narrative.trim()) {
      alert('Narrative is required');
      return;
    }

    const formData = {
      userId: userId.trim() || undefined,
      suspicionType,
      narrative: narrative.trim(),
      riskLevel,
      triggerType,
    };

    // Add transactionIds only if provided
    const txIds = transactionIds.trim() 
      ? transactionIds.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    if (txIds.length > 0) {
      formData.transactionIds = txIds;
    }

    // Add alertIds only if provided
    const alIds = alertIds.trim()
      ? alertIds.split(',').map(id => id.trim()).filter(Boolean)
      : [];
    if (alIds.length > 0) {
      formData.alertIds = alIds;
    }

    // Add suspicionIndicators only if at least one field is provided
    const obsBehaviors = observedBehaviors.trim()
      ? observedBehaviors.split(',').map(b => b.trim()).filter(Boolean)
      : [];
    const potTypologies = potentialTypologies.trim()
      ? potentialTypologies.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    
    if (obsBehaviors.length > 0 || potTypologies.length > 0) {
      formData.suspicionIndicators = {};
      if (obsBehaviors.length > 0) {
        formData.suspicionIndicators.observedBehaviors = obsBehaviors;
      }
      if (potTypologies.length > 0) {
        formData.suspicionIndicators.potentialTypologies = potTypologies;
      }
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create ISAR (Draft)</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRandomFill}
                disabled={isLoading}
                className="text-xs"
              >
                🎲 Random Fill
              </Button>
              <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={isLoading}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User ID (Optional)
              </label>
              <InputTwo
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User UUID or display code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Suspicion Type *
              </label>
              <select
                value={suspicionType}
                onChange={(e) => setSuspicionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="structuring">Structuring</option>
                <option value="unusual_pattern">Unusual Pattern</option>
                <option value="high_velocity">High Velocity</option>
                <option value="sanctions_match">Sanctions Match</option>
                <option value="pep">PEP (Politically Exposed Person)</option>
                <option value="unusual_source">Unusual Source</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Level *
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Narrative * (Required)
              </label>
              <textarea
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the suspicious activity, observations, and facts..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Transaction IDs (Optional - comma-separated)
              </label>
              <InputTwo
                type="text"
                value={transactionIds}
                onChange={(e) => setTransactionIds(e.target.value)}
                placeholder="Transaction UUIDs separated by commas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alert IDs (Optional - comma-separated)
              </label>
              <InputTwo
                type="text"
                value={alertIds}
                onChange={(e) => setAlertIds(e.target.value)}
                placeholder="Alert UUIDs separated by commas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Type
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="transaction_monitoring">Transaction Monitoring</option>
                <option value="manual_review">Manual Review</option>
                <option value="external_information">External Information</option>
                <option value="system_alert">System Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observed Behaviors (Optional - comma-separated)
              </label>
              <InputTwo
                type="text"
                value={observedBehaviors}
                onChange={(e) => setObservedBehaviors(e.target.value)}
                placeholder="e.g., Unusually large transaction, Rapid conversion, Inconsistent with profile"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Potential Typologies (Optional - comma-separated)
              </label>
              <InputTwo
                type="text"
                value={potentialTypologies}
                onChange={(e) => setPotentialTypologies(e.target.value)}
                placeholder="e.g., Layering, Use of virtual assets to obscure source"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create ISAR Draft'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Review ISAR Modal Component (MLRO only)
const ReviewIsarModal = ({ isar, onClose, onSave, isLoading }) => {
  const [mlroDecision, setMlroDecision] = useState('escalate_to_str');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [mlroNotes, setMlroNotes] = useState('');
  const [strFiled, setStrFiled] = useState(false);
  const [strReference, setStrReference] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!decisionRationale.trim()) {
      alert('Decision rationale is required (PVARA requirement)');
      return;
    }

    const data = {
      mlroDecision,
      decisionRationale: decisionRationale.trim(),
      mlroNotes: mlroNotes.trim() || undefined,
      strFiled: mlroDecision === 'escalate_to_str' ? strFiled : undefined,
      strReference: mlroDecision === 'escalate_to_str' && strReference.trim() ? strReference.trim() : undefined,
    };

    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Review & Finalize ISAR: {isar.displayCode}
            </h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isLoading}
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MLRO Decision *
              </label>
              <select
                value={mlroDecision}
                onChange={(e) => {
                  setMlroDecision(e.target.value);
                  if (e.target.value !== 'escalate_to_str') {
                    setStrFiled(false);
                    setStrReference('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="escalate_to_str">✅ Approve & Escalate to STR/CTR (Suspicion Confirmed)</option>
                <option value="closed">❌ Reject & Close (Suspicion Not Confirmed)</option>
                <option value="request_further_info">⏳ Request Further Information</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decision Rationale * (Required - PVARA Requirement)
              </label>
              <textarea
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Provide a written rationale for your decision. This is mandatory under PVARA NOC regulations..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MLRO Notes (Optional)
              </label>
              <textarea
                value={mlroNotes}
                onChange={(e) => setMlroNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional notes or observations..."
              />
            </div>

            {mlroDecision === 'escalate_to_str' && (
              <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-3">
                  STR/CTR Filing Information
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="strFiled"
                    checked={strFiled}
                    onChange={(e) => setStrFiled(e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                  />
                  <label htmlFor="strFiled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    STR/CTR has been filed to goAML
                  </label>
                </div>
                {strFiled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      STR/CTR Reference Number (Optional)
                    </label>
                    <InputTwo
                      type="text"
                      value={strReference}
                      onChange={(e) => setStrReference(e.target.value)}
                      placeholder="STR-2026-000123 or CTR-2026-000456"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? 'Finalizing...' : 'Finalize Decision'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ISARsView;
