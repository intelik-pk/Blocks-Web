import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Users, Search, Eye, Shield, AlertTriangle, TrendingUp, TrendingDown, Lock, Unlock, FileText, UserCheck, X, Check, Copy, CheckCircle } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { complianceAPI } from '../../../services/complianceAPI';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';

const CustomerProfiles = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showRiskOverrideModal, setShowRiskOverrideModal] = useState(false);
  const [showEddModal, setShowEddModal] = useState(false);
  const [showRestrictionsModal, setShowRestrictionsModal] = useState(false);
  const [showLiftRestrictionsModal, setShowLiftRestrictionsModal] = useState(false);
  const [copiedUuid, setCopiedUuid] = useState(false);

  const adminId = adminUser?.id;
  const role = adminUser?.role;
  const isMlro = role === AdminRole.MLRO || role === AdminRole.SUPER_ADMIN;

  // Fetch customers list
  const { data: customersData, isLoading: isLoadingCustomers, error: customersError } = useQuery(
    ['mlro-customers', searchTerm, adminId],
    () => {
      if (!adminId) {
        console.error('CustomerProfiles: adminId is missing');
        return Promise.resolve({ data: { data: [] } });
      }
      return complianceAPI.listCustomers({ search: searchTerm }, adminId);
    },
    {
      enabled: isAuthenticated && isMlro && !!adminId,
      retry: 1,
      onError: (error) => {
        console.error('Error fetching customers:', error);
      },
    }
  );

  // Debug logging
  React.useEffect(() => {
    if (customersData) {
      console.log('CustomerProfiles - customersData:', customersData);
    }
    if (customersError) {
      console.error('CustomerProfiles - customersError:', customersError);
    }
  }, [customersData, customersError]);

  const customers = customersData?.data?.data || customersData?.data || (Array.isArray(customersData?.data) ? customersData.data : []);

  // Fetch selected customer profile
  const { data: profileData, isLoading: isLoadingProfile } = useQuery(
    ['mlro-customer-profile', selectedUserId],
    () => complianceAPI.getCustomerProfile(selectedUserId, adminId),
    {
      enabled: isAuthenticated && isMlro && !!selectedUserId,
      retry: 1,
    }
  );

  const profile = profileData?.data?.data || profileData?.data;

  // Risk override mutation
  const riskOverrideMutation = useMutation(
    (data) => complianceAPI.overrideRiskRating(selectedUserId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['mlro-customer-profile', selectedUserId]);
        queryClient.invalidateQueries(['mlro-customers']);
        setShowRiskOverrideModal(false);
      },
    }
  );

  // EDD mutation
  const eddMutation = useMutation(
    (data) => complianceAPI.requireEdd(selectedUserId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['mlro-customer-profile', selectedUserId]);
        queryClient.invalidateQueries(['mlro-customers']);
        setShowEddModal(false);
      },
    }
  );

  // Restrictions mutation
  const restrictionsMutation = useMutation(
    (data) => complianceAPI.imposeRestrictions(selectedUserId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['mlro-customer-profile', selectedUserId]);
        queryClient.invalidateQueries(['mlro-customers']);
        setShowRestrictionsModal(false);
      },
    }
  );

  // Lift restrictions mutation
  const liftRestrictionsMutation = useMutation(
    (data) => complianceAPI.liftRestrictions(selectedUserId, data, adminId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['mlro-customer-profile', selectedUserId]);
        queryClient.invalidateQueries(['mlro-customers']);
        setShowLiftRestrictionsModal(false);
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
            <p className="text-gray-600 dark:text-gray-400">Only MLRO and Super Admin can access customer profiles.</p>
          </div>
        </Card>
      </div>
    );
  }

  const getRiskBadgeColor = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Profiles & Risk Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">MLRO oversight of customer risk profiles and compliance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers List */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Customers</h3>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <InputTwo
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Customers List */}
              {isLoadingCustomers ? (
                <Loader />
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {customers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No customers found</p>
                  ) : (
                    customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => setSelectedUserId(customer.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          selectedUserId === customer.id
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {customer.fullName || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {customer.email || customer.displayCode}
                            </p>
                          </div>
                          <Badge className={cn(
                            customer.complianceStatus === 'restricted' || customer.complianceStatus === 'frozen'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          )}>
                            {customer.complianceStatus || 'clear'}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Customer Profile Details */}
        <div className="lg:col-span-2">
          {!selectedUserId ? (
            <Card>
              <div className="text-center py-12">
                <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select a Customer</h3>
                <p className="text-gray-600 dark:text-gray-400">Choose a customer from the list to view their profile and risk information.</p>
              </div>
            </Card>
          ) : isLoadingProfile ? (
            <Loader />
          ) : profile ? (
            <div className="space-y-6">
              {/* Customer Basic Info */}
              <Card>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Profile</h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRiskOverrideModal(true)}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Change Risk
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEddModal(true)}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {profile.riskProfile?.requiresEnhancedDueDiligence ? 'Remove Review' : 'Require Review'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRestrictionsModal(true)}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Manage Restrictions
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profile.user.fullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profile.user.email}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">User UUID</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white break-all">
                          {selectedUserId}
                        </code>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(selectedUserId);
                              setCopiedUuid(true);
                              setTimeout(() => setCopiedUuid(false), 2000);
                            } catch (err) {
                              console.error('Failed to copy:', err);
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          title="Copy UUID"
                        >
                          {copiedUuid ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="text-sm">Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Use this UUID when imposing restrictions
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profile.user.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Date of Birth</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {profile.user.dob ? new Date(profile.user.dob).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Nationality</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profile.user.nationality || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Customer Type</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {profile.user.customerType ? profile.user.customerType.replace('_', ' ') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">National ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profile.user.nationalId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profile.user.address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Compliance Status</p>
                      <Badge className={cn(
                        profile.user.complianceStatus === 'restricted' || profile.user.complianceStatus === 'frozen'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      )}>
                        {profile.user.complianceStatus || 'clear'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Account Status</p>
                      <Badge className={cn(
                        profile.user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {profile.user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Risk Profile */}
              <Card>
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Profile</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current Risk Rating</p>
                      <Badge className={cn("mt-1", getRiskBadgeColor(profile.riskProfile?.currentRiskRating))}>
                        {profile.riskProfile?.currentRiskRating || 'low'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Enhanced Review</p>
                      <Badge className={cn(
                        "mt-1",
                        profile.riskProfile?.requiresEnhancedDueDiligence
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      )}>
                        {profile.riskProfile?.requiresEnhancedDueDiligence ? 'Required' : 'Not Required'}
                      </Badge>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Risk Rating Reason</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {profile.riskProfile?.riskRatingReason || 'No reason provided'}
                      </p>
                    </div>
                    {profile.riskProfile?.riskInputs && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Risk Inputs</p>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs">
                          <pre className="whitespace-pre-wrap text-gray-900 dark:text-white">
                            {JSON.stringify(profile.riskProfile.riskInputs, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* PEP & Sanctions Indicators */}
              {(profile.pepIndicator?.isPep || profile.sanctionsIndicator?.isSanctioned) && (
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      PEP & Sanctions Indicators
                    </h3>
                    
                    {profile.pepIndicator?.isPep && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <p className="font-semibold text-red-900 dark:text-red-400">PEP Match Detected</p>
                        </div>
                        {profile.pepIndicator.latestScreening && (
                          <div className="text-sm text-red-800 dark:text-red-300">
                            <p>Screened: {new Date(profile.pepIndicator.latestScreening.screeningDate).toLocaleDateString()}</p>
                            <p>Provider: {profile.pepIndicator.latestScreening.screeningProvider || 'N/A'}</p>
                            <p>Match Score: {profile.pepIndicator.latestScreening.matchScore || 'N/A'}%</p>
                          </div>
                        )}
                      </div>
                    )}

                    {profile.sanctionsIndicator?.isSanctioned && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <p className="font-semibold text-red-900 dark:text-red-400">Sanctions Match Detected</p>
                        </div>
                        {profile.sanctionsIndicator.latestScreening && (
                          <div className="text-sm text-red-800 dark:text-red-300">
                            <p>Screened: {new Date(profile.sanctionsIndicator.latestScreening.screeningDate).toLocaleDateString()}</p>
                            <p>Provider: {profile.sanctionsIndicator.latestScreening.screeningProvider || 'N/A'}</p>
                            <p>Match Score: {profile.sanctionsIndicator.latestScreening.matchScore || 'N/A'}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Account Restrictions */}
              {profile.accountRestrictions && !profile.accountRestrictions.liftedAt && (
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-orange-500" />
                      Account Restrictions
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        {profile.accountRestrictions.blockDeposits ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        <span className="text-sm">Deposits: {profile.accountRestrictions.blockDeposits ? 'Blocked' : 'Allowed'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.accountRestrictions.blockWithdrawals ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        <span className="text-sm">Withdrawals: {profile.accountRestrictions.blockWithdrawals ? 'Blocked' : 'Allowed'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.accountRestrictions.blockTokenTransfers ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        <span className="text-sm">Token Transfers: {profile.accountRestrictions.blockTokenTransfers ? 'Blocked' : 'Allowed'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.accountRestrictions.blockTrading ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        <span className="text-sm">Trading: {profile.accountRestrictions.blockTrading ? 'Blocked' : 'Allowed'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Reason</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {profile.accountRestrictions.restrictionReason || 'No reason provided'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Imposed At</p>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {new Date(profile.accountRestrictions.imposedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Risk Rating History */}
              {profile.riskRatingHistory && profile.riskRatingHistory.length > 0 && (
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Risk Rating History</h3>
                    <div className="space-y-3">
                      {profile.riskRatingHistory.map((history, idx) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                {history.previousRating && (
                                  <>
                                    <Badge className={getRiskBadgeColor(history.previousRating)}>
                                      {history.previousRating}
                                    </Badge>
                                    <TrendingDown className="w-4 h-4 text-gray-400" />
                                  </>
                                )}
                                <Badge className={getRiskBadgeColor(history.newRating)}>
                                  {history.newRating}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-900 dark:text-white mt-1">{history.justification}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {history.changedBy?.fullName || 'Unknown'} • {new Date(history.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Loader />
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Risk Override Modal */}
      {showRiskOverrideModal && (
        <RiskOverrideModal
          profile={profile}
          onClose={() => setShowRiskOverrideModal(false)}
          onSave={(data) => riskOverrideMutation.mutate(data)}
          isLoading={riskOverrideMutation.isLoading}
        />
      )}

      {/* EDD Modal */}
      {showEddModal && (
        <EddModal
          profile={profile}
          onClose={() => setShowEddModal(false)}
          onSave={(data) => eddMutation.mutate(data)}
          isLoading={eddMutation.isLoading}
        />
      )}

      {/* Restrictions Modal */}
      {showRestrictionsModal && (
        <RestrictionsModal
          userId={selectedUserId}
          initialRestrictions={profile?.accountRestrictions}
          onClose={() => setShowRestrictionsModal(false)}
          onSave={(data) => restrictionsMutation.mutate(data)}
          isLoading={restrictionsMutation.isLoading}
        />
      )}

      {/* Lift Restrictions Modal */}
      {showLiftRestrictionsModal && (
        <LiftRestrictionsModal
          onClose={() => setShowLiftRestrictionsModal(false)}
          onSave={(data) => liftRestrictionsMutation.mutate(data)}
          isLoading={liftRestrictionsMutation.isLoading}
        />
      )}
    </div>
  );
};

// Risk Override Modal Component
const RiskOverrideModal = ({ profile, onClose, onSave, isLoading }) => {
  const [newRating, setNewRating] = useState(profile?.riskProfile?.currentRiskRating || 'low');
  const [justification, setJustification] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!justification.trim()) {
      alert('Justification is required');
      return;
    }
    onSave({
      newRiskRating: newRating,
      justification: justification.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Risk Rating</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Rating: <Badge className={cn("ml-2", 
                  profile?.riskProfile?.currentRiskRating === 'low' ? 'bg-green-100 text-green-800' :
                  profile?.riskProfile?.currentRiskRating === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  profile?.riskProfile?.currentRiskRating === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                )}>
                  {profile?.riskProfile?.currentRiskRating || 'low'}
                </Badge>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Risk Rating *
              </label>
              <select
                value={newRating}
                onChange={(e) => setNewRating(e.target.value)}
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
                Justification * (Required for audit trail)
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Explain why you are changing the risk level..."
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Change Risk Rating'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// EDD Modal Component
const EddModal = ({ profile, onClose, onSave, isLoading }) => {
  const [requireEdd, setRequireEdd] = useState(profile?.riskProfile?.requiresEnhancedDueDiligence || false);
  const [proofOfSourceOfFunds, setProofOfSourceOfFunds] = useState(false);
  const [proofOfSourceOfWealth, setProofOfSourceOfWealth] = useState(false);
  const [additionalIdentityDocumentation, setAdditionalIdentityDocumentation] = useState(false);
  const [enhancedBackgroundChecks, setEnhancedBackgroundChecks] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      requireEdd,
      eddRequirements: {
        proofOfSourceOfFunds,
        proofOfSourceOfWealth,
        additionalIdentityDocumentation,
        enhancedBackgroundChecks,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {requireEdd ? 'Require Enhanced Review' : 'Remove Enhanced Review'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requireEdd}
                  onChange={(e) => setRequireEdd(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Require Enhanced Review
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                When enabled, the customer account will be restricted until the review is completed.
              </p>
            </div>

            {requireEdd && (
              <div className="ml-6 space-y-3 border-l-2 border-blue-500 pl-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Review Requirements:</p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={proofOfSourceOfFunds}
                    onChange={(e) => setProofOfSourceOfFunds(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Proof of Source of Funds</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={proofOfSourceOfWealth}
                    onChange={(e) => setProofOfSourceOfWealth(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Proof of Source of Wealth</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={additionalIdentityDocumentation}
                    onChange={(e) => setAdditionalIdentityDocumentation(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Additional Identity Documentation</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enhancedBackgroundChecks}
                    onChange={(e) => setEnhancedBackgroundChecks(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enhanced Background Checks</span>
                </label>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : requireEdd ? 'Require Review' : 'Remove Review'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Restrictions Modal Component
const RestrictionsModal = ({ userId, initialRestrictions, onClose, onSave, isLoading }) => {
  const [blockDeposits, setBlockDeposits] = useState(false);
  const [blockWithdrawals, setBlockWithdrawals] = useState(false);
  const [blockTokenTransfers, setBlockTokenTransfers] = useState(false);
  const [blockTrading, setBlockTrading] = useState(false);
  const [isUnderReview, setIsUnderReview] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState('');
  const [copiedUuid, setCopiedUuid] = useState(false);

  // Pre-populate form with existing restrictions
  useEffect(() => {
    if (initialRestrictions && !initialRestrictions.liftedAt) {
      setBlockDeposits(initialRestrictions.blockDeposits || false);
      setBlockWithdrawals(initialRestrictions.blockWithdrawals || false);
      setBlockTokenTransfers(initialRestrictions.blockTokenTransfers || false);
      setBlockTrading(initialRestrictions.blockTrading || false);
      setIsUnderReview(initialRestrictions.isUnderReview || false);
      setIsRestricted(initialRestrictions.isRestricted || false);
      setRestrictionReason(initialRestrictions.restrictionReason || '');
    }
  }, [initialRestrictions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!restrictionReason.trim()) {
      alert('Reason is required');
      return;
    }
    // Explicitly send all boolean values to ensure backend receives them
    const restrictionData = {
      blockDeposits: Boolean(blockDeposits),
      blockWithdrawals: Boolean(blockWithdrawals),
      blockTokenTransfers: Boolean(blockTokenTransfers),
      blockTrading: Boolean(blockTrading),
      isUnderReview: Boolean(isUnderReview),
      isRestricted: Boolean(isRestricted),
      restrictionReason: restrictionReason.trim(),
    };
    console.log('[RestrictionsModal] Submitting restrictions:', restrictionData);
    onSave(restrictionData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Restrictions</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User UUID Display */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">User UUID (for reference)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded text-xs font-mono text-gray-900 dark:text-white break-all">
                {userId}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(userId);
                    setCopiedUuid(true);
                    setTimeout(() => setCopiedUuid(false), 2000);
                  } catch (err) {
                    console.error('Failed to copy:', err);
                  }
                }}
                className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                title="Copy UUID"
              >
                {copiedUuid ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={blockDeposits}
                  onChange={(e) => setBlockDeposits(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Block Deposits</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={blockWithdrawals}
                  onChange={(e) => setBlockWithdrawals(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Block Withdrawals</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={blockTokenTransfers}
                  onChange={(e) => setBlockTokenTransfers(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Block Token Transfers</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={blockTrading}
                  onChange={(e) => setBlockTrading(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Block Trading (Order Placement)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isUnderReview}
                  onChange={(e) => setIsUnderReview(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Place Account Under Review</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRestricted}
                  onChange={(e) => setIsRestricted(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Restrict Account (General)</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason * (Required for audit trail)
              </label>
              <textarea
                value={restrictionReason}
                onChange={(e) => setRestrictionReason(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Explain why you are applying these restrictions..."
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Update Restrictions'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Lift Restrictions Modal Component
const LiftRestrictionsModal = ({ onClose, onSave, isLoading }) => {
  const [liftReason, setLiftReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!liftReason.trim()) {
      alert('Reason is required');
      return;
    }
    onSave({
      liftReason: liftReason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unblock Account</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason * (Required for audit trail)
              </label>
              <textarea
                value={liftReason}
                onChange={(e) => setLiftReason(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Explain why you are unblocking this account..."
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Unblocking...' : 'Unblock Account'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfiles;
