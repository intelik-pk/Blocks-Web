import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Settings, Plus, CheckCircle, XCircle, Clock, Eye, Edit, Trash2, AlertCircle, TrendingUp, DollarSign, Shield, Activity } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { complianceAPI } from '../../../services/complianceAPI';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';

const MonitoringRules = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const adminId = adminUser?.id;
  const role = adminUser?.role;
  const isMlro = role === AdminRole.MLRO || role === AdminRole.SUPER_ADMIN;

  // Fetch rules
  const { data: rulesData, isLoading } = useQuery(
    ['monitoring-rules', statusFilter, typeFilter],
    () => complianceAPI.getMonitoringRules({
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(typeFilter !== 'all' && { ruleType: typeFilter }),
    }, adminId),
    {
      enabled: isAuthenticated && isMlro,
      retry: 1,
    }
  );

  const rules = rulesData?.data?.data || rulesData?.data || [];

  // Create rule mutation
  const createMutation = useMutation(
    (data) => complianceAPI.createMonitoringRule(data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monitoring-rules']);
        setShowCreateModal(false);
      },
    }
  );

  // Approve/reject rule mutation
  const approveMutation = useMutation(
    ({ ruleId, data }) => complianceAPI.approveMonitoringRule(ruleId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monitoring-rules']);
        setShowApproveModal(false);
        setSelectedRule(null);
      },
    }
  );

  // Deactivate rule mutation
  const deactivateMutation = useMutation(
    ({ ruleId, reason }) => complianceAPI.deactivateMonitoringRule(ruleId, { reason }, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monitoring-rules']);
        setSelectedRule(null);
      },
    }
  );

  // Delete rule mutation
  const deleteMutation = useMutation(
    (ruleId) => complianceAPI.deleteMonitoringRule(ruleId, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['monitoring-rules']);
        setSelectedRule(null);
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
            <p className="text-gray-600 dark:text-gray-400">Only MLRO and Super Admin can manage monitoring rules.</p>
          </div>
        </Card>
      </div>
    );
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'velocity': return <TrendingUp className="w-5 h-5" />;
      case 'high_value': return <DollarSign className="w-5 h-5" />;
      case 'structuring': return <AlertCircle className="w-5 h-5" />;
      case 'wallet_risk': return <Shield className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      velocity: 'Velocity',
      high_value: 'High Value',
      structuring: 'Structuring',
      wallet_risk: 'Wallet Risk',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monitoring Rules</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Create and manage transaction monitoring rules</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value="active">Active</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="velocity">Velocity</option>
                <option value="high_value">High Value</option>
                <option value="structuring">Structuring</option>
                <option value="wallet_risk">Wallet Risk</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Rules List */}
      <Card>
        <div className="p-6">
          {isLoading ? (
            <Loader />
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Rules Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first monitoring rule to start generating alerts.</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getTypeIcon(rule.ruleType)}
                        <h3 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                        <Badge className={getStatusBadgeColor(rule.status)}>
                          {rule.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">v{rule.version}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {rule.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Type: {getTypeLabel(rule.ruleType)}</span>
                        {rule.createdBy && (
                          <span>Created by: {rule.creator?.fullName || rule.creator?.email || 'Unknown'}</span>
                        )}
                        {rule.approvedBy && (
                          <span>Approved by: {rule.approver?.fullName || rule.approver?.email || 'Unknown'}</span>
                        )}
                        <span>Created: {new Date(rule.createdAt).toLocaleDateString()}</span>
                      </div>
                      {rule.configuration && (
                        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                          <strong>Configuration:</strong>
                          <pre className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {JSON.stringify(rule.configuration, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRule(rule);
                          // View details or edit
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {rule.status === 'pending_approval' && isMlro && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowApproveModal(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      )}
                      {rule.status === 'active' && isMlro && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowDeactivateModal(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {(rule.status === 'inactive' || rule.status === 'pending_approval' || rule.status === 'rejected') && isMlro && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRule(rule);
                            setShowDeleteModal(true);
                          }}
                          disabled={deleteMutation.isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Rule Modal */}
      {showCreateModal && (
        <CreateRuleModal
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isLoading}
        />
      )}

      {/* Approve Rule Modal */}
      {showApproveModal && selectedRule && (
        <ApproveRuleModal
          rule={selectedRule}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedRule(null);
          }}
          onSave={(data) => approveMutation.mutate({ ruleId: selectedRule.id, data })}
          isLoading={approveMutation.isLoading}
        />
      )}

      {/* Deactivate Rule Modal */}
      {showDeactivateModal && selectedRule && (
        <DeactivateRuleModal
          rule={selectedRule}
          onClose={() => {
            setShowDeactivateModal(false);
            setSelectedRule(null);
          }}
          onSave={(reason) => {
            deactivateMutation.mutate({ ruleId: selectedRule.id, reason });
            setShowDeactivateModal(false);
            setSelectedRule(null);
          }}
          isLoading={deactivateMutation.isLoading}
        />
      )}

      {/* Delete Rule Modal */}
      {showDeleteModal && selectedRule && (
        <DeleteRuleModal
          rule={selectedRule}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRule(null);
          }}
          onConfirm={() => {
            deleteMutation.mutate(selectedRule.id);
            setShowDeleteModal(false);
            setSelectedRule(null);
          }}
          isLoading={deleteMutation.isLoading}
        />
      )}
    </div>
  );
};

// Create Rule Modal
const CreateRuleModal = ({ onClose, onSave, isLoading }) => {
  const [ruleType, setRuleType] = useState('high_value');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // High Value Rule Config
  const [singleThreshold, setSingleThreshold] = useState('');
  const [cumulativeThreshold, setCumulativeThreshold] = useState('');
  const [cumulativeWindow, setCumulativeWindow] = useState('');
  const [historicalMultiplier, setHistoricalMultiplier] = useState('');
  
  // Velocity Rule Config
  const [timeWindow, setTimeWindow] = useState('');
  const [transactionCount, setTransactionCount] = useState('');
  const [minAmount, setMinAmount] = useState('');
  
  // Structuring Rule Config
  const [reportingThreshold, setReportingThreshold] = useState('');
  const [proximityPercentage, setProximityPercentage] = useState('');
  const [minTransactionCount, setMinTransactionCount] = useState('');
  
  // Wallet Risk Rule Config
  const [riskScoreThreshold, setRiskScoreThreshold] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    let configuration = {};
    
    if (ruleType === 'high_value') {
      configuration = {
        ...(singleThreshold && { singleTransactionThreshold: parseFloat(singleThreshold) }),
        ...(cumulativeThreshold && { cumulativeThreshold: parseFloat(cumulativeThreshold) }),
        ...(cumulativeWindow && { cumulativeTimeWindowMinutes: parseInt(cumulativeWindow, 10) }),
        ...(historicalMultiplier && { historicalMultiplier: parseFloat(historicalMultiplier) }),
      };
    } else if (ruleType === 'velocity') {
      configuration = {
        ...(timeWindow && { timeWindowMinutes: parseInt(timeWindow, 10) }),
        ...(transactionCount && { transactionCountThreshold: parseInt(transactionCount, 10) }),
        ...(minAmount && { minimumAmount: parseFloat(minAmount) }),
        transactionTypes: ['deposit', 'withdrawal', 'transfer'],
      };
    } else if (ruleType === 'structuring') {
      configuration = {
        ...(reportingThreshold && { reportingThreshold: parseFloat(reportingThreshold) }),
        ...(proximityPercentage && { proximityPercentage: parseFloat(proximityPercentage) }),
        ...(minTransactionCount && { minimumTransactionCount: parseInt(minTransactionCount, 10) }),
        amountSimilarityTolerance: 5, // Default 5%
      };
    } else if (ruleType === 'wallet_risk') {
      configuration = {
        ...(riskScoreThreshold && { riskScoreThreshold: parseFloat(riskScoreThreshold) }),
        balanceChangeVelocityThreshold: 0.8, // Default 80%
        walletAgeDays: 7, // Default 7 days
      };
    }
    
    onSave({
      name: name.trim(),
      ruleType,
      description: description.trim() || undefined,
      configuration,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Monitoring Rule</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Name *
              </label>
              <InputTwo
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Value Transaction Alert"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Type *
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="high_value">High Value Transaction</option>
                <option value="velocity">Velocity (Multiple Transactions)</option>
                <option value="structuring">Structuring Detection</option>
                <option value="wallet_risk">Wallet Risk</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe what this rule monitors..."
              />
            </div>

            {/* High Value Rule Configuration */}
            {ruleType === 'high_value' && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white">High Value Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Single Transaction Amount (USDT)
                    </label>
                    <InputTwo
                      type="number"
                      value={singleThreshold}
                      onChange={(e) => setSingleThreshold(e.target.value)}
                      placeholder="e.g., 50000"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Alert if one transaction is above this amount</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Amount (USDT)
                    </label>
                    <InputTwo
                      type="number"
                      value={cumulativeThreshold}
                      onChange={(e) => setCumulativeThreshold(e.target.value)}
                      placeholder="e.g., 100000"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Alert if total transactions exceed this</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Period (minutes)
                    </label>
                    <InputTwo
                      type="number"
                      value={cumulativeWindow}
                      onChange={(e) => setCumulativeWindow(e.target.value)}
                      placeholder="e.g., 60"
                    />
                    <p className="text-xs text-gray-500 mt-1">Check total amount within this time</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Compare to Average (times)
                    </label>
                    <InputTwo
                      type="number"
                      value={historicalMultiplier}
                      onChange={(e) => setHistoricalMultiplier(e.target.value)}
                      placeholder="e.g., 3"
                      step="0.1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Alert if transaction is X times user's average</p>
                  </div>
                </div>
              </div>
            )}

            {/* Velocity Rule Configuration */}
            {ruleType === 'velocity' && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white">Velocity Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time Period (minutes)
                    </label>
                    <InputTwo
                      type="number"
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                      placeholder="e.g., 60"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Count transactions within this time</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Maximum Transactions
                    </label>
                    <InputTwo
                      type="number"
                      value={transactionCount}
                      onChange={(e) => setTransactionCount(e.target.value)}
                      placeholder="e.g., 5"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Alert if more transactions than this</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Amount (USDT)
                    </label>
                    <InputTwo
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="e.g., 100"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">Only count transactions above this amount</p>
                  </div>
                </div>
              </div>
            )}

            {/* Structuring Rule Configuration */}
            {ruleType === 'structuring' && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white">Structuring Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Report Amount (USDT)
                    </label>
                    <InputTwo
                      type="number"
                      value={reportingThreshold}
                      onChange={(e) => setReportingThreshold(e.target.value)}
                      placeholder="e.g., 10000"
                      step="0.01"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Amount that transactions are trying to avoid</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Close to Amount (%)
                    </label>
                    <InputTwo
                      type="number"
                      value={proximityPercentage}
                      onChange={(e) => setProximityPercentage(e.target.value)}
                      placeholder="e.g., 90"
                      step="1"
                      min="1"
                      max="99"
                    />
                    <p className="text-xs text-gray-500 mt-1">Alert if transactions are 90-99% of report amount</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Transactions
                    </label>
                    <InputTwo
                      type="number"
                      value={minTransactionCount}
                      onChange={(e) => setMinTransactionCount(e.target.value)}
                      placeholder="e.g., 3"
                    />
                    <p className="text-xs text-gray-500 mt-1">Need at least this many transactions to detect</p>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Risk Rule Configuration */}
            {ruleType === 'wallet_risk' && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h4 className="font-semibold text-gray-900 dark:text-white">Wallet Risk Settings</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Risk Score
                  </label>
                  <InputTwo
                    type="number"
                    value={riskScoreThreshold}
                    onChange={(e) => setRiskScoreThreshold(e.target.value)}
                    placeholder="e.g., 50"
                    step="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert if wallet risk score is above this (0-100)</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Rule'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Approve Rule Modal
const ApproveRuleModal = ({ rule, onClose, onSave, isLoading }) => {
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      status,
      ...(status === 'active' ? { approvalNotes: notes } : { rejectionReason: notes }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Review Rule</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{rule.name}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{rule.description || 'No description'}</p>
            <div className="text-xs text-gray-500">
              <p>Type: {rule.ruleType}</p>
              <p>Version: {rule.version}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Decision *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="active">Approve & Activate</option>
                <option value="rejected">Reject</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {status === 'active' ? 'Approval Notes' : 'Rejection Reason'} *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={status === 'active' ? 'Add approval notes...' : 'Explain why this rule is being rejected...'}
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Processing...' : status === 'active' ? 'Approve Rule' : 'Reject Rule'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Deactivate Rule Modal
const DeactivateRuleModal = ({ rule, onClose, onSave, isLoading }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Reason is required');
      return;
    }
    onSave(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deactivate Rule</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to deactivate the rule <strong>{rule.name}</strong>? This will create a new inactive version of the rule.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Deactivation *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Explain why this rule is being deactivated..."
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="outline" className="bg-red-600 hover:bg-red-700 text-white border-red-600" disabled={isLoading}>
                {isLoading ? 'Deactivating...' : 'Deactivate Rule'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Delete Rule Modal
const DeleteRuleModal = ({ rule, onClose, onConfirm, isLoading }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Rule</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to permanently delete the rule <strong>{rule.name}</strong>? This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="bg-red-600 hover:bg-red-700 text-white border-red-600" 
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringRules;
