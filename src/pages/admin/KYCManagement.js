import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Search, 
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  User,
  CreditCard,
  X,
  Mail,
  Zap,
  FileCheck,
  Wallet,
  TrendingUp,
  DollarSign,
  Building2,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { API_BASE_URL } from '../../config/api';
import { adminAPI, usersAPI, walletTransactionsAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import { cn } from '../../utils/cn';

const KYCManagement = ({ initialUserId }) => {
  const { isAuthenticated } = useAdminAuth();
  const queryClient = useQueryClient();
  
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    sort_by: 'submittedAt',
    sort_order: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKYC, setSelectedKYC] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedKYCs, setSelectedKYCs] = useState([]);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedUserGroup, setSelectedUserGroup] = useState(null);
  
  // Sidebar panel state
  const [selectedUserId, setSelectedUserId] = useState(initialUserId || null);
  const [actionPanel, setActionPanel] = useState(initialUserId ? 'details' : null); // 'details' or null
  
  // Auto-approve state - load from localStorage
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(() => {
    const saved = localStorage.getItem('kycAutoApprove');
    return saved === 'true';
  });

  // Debounce search input - only update filters, no API call
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch all KYC verifications - fetch all data once, filter client-side
  const { data: kycData, isLoading: kycLoading } = useQuery(
    ['all-kyc'],
    () => adminAPI.getAllKYC({
      limit: 1000 // Get all records for client-side filtering
    }),
    {
      enabled: isAuthenticated,
      retry: false,
      staleTime: 30000, // Cache for 30 seconds to prevent unnecessary refetches
      onError: (error) => {
        console.warn('KYC API not available:', error.response?.status);
      }
    }
  );

  // Fetch users to get user details
  const { data: usersData } = useQuery(
    ['all-users'],
    () => adminAPI.getUsers({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: false,
    }
  );

  // Fetch selected user details for sidebar
  const { data: fullUserData, isLoading: fullUserLoading } = useQuery(
    ['user-details', selectedUserId],
    () => usersAPI.getById(selectedUserId),
    {
      enabled: Boolean(selectedUserId && actionPanel === 'details'),
      retry: 1
    }
  );

  // Fetch user financial data for sidebar
  const { data: userFinancialData, isLoading: financialLoading } = useQuery(
    ['user-financial', selectedUserId],
    async () => {
      const [walletResponse, portfolioResponse, transactionsResponse] = await Promise.allSettled([
        usersAPI.getWalletById(selectedUserId).catch(() => ({ data: null })),
        fetch(`${API_BASE_URL}/portfolio/user/${selectedUserId}/detailed`).then(r => r.json()).catch(() => null),
        walletTransactionsAPI.getByUserId(selectedUserId).catch(() => ({ data: [] }))
      ]);
      
      const walletData = walletResponse.status === 'fulfilled' ? walletResponse.value?.data : null;
      const walletBalance = parseFloat(walletData?.balanceUSDT || walletData?.data?.balanceUSDT || walletData?.balance || walletData?.data?.balance || 0);
      
      const portfolioData = portfolioResponse.status === 'fulfilled' ? portfolioResponse.value : null;
      const investments = portfolioData?.investments || [];
      const summary = portfolioData?.summary || {};
      
      const transactionsData = transactionsResponse.status === 'fulfilled' ? transactionsResponse.value?.data : [];
      const transactions = Array.isArray(transactionsData) ? transactionsData : 
                          transactionsData?.data?.transactions || 
                          transactionsData?.transactions || 
                          transactionsData?.data || 
                          [];
      
      return {
        walletBalance,
        totalInvestments: parseFloat(summary.totalInvestedUSDT || 0),
        totalReturns: parseFloat(summary.totalRewardsUSDT || 0),
        totalCurrentValue: parseFloat(summary.totalCurrentValueUSDT || 0),
        totalNetROI: parseFloat(summary.totalNetROI || 0),
        activeInvestments: parseInt(summary.activeInvestments || 0),
        averageROI: parseFloat(summary.averageROI || 0),
        propertiesInvested: investments.length,
        investments: investments,
        transactions: transactions
      };
    },
    {
      enabled: Boolean(selectedUserId && actionPanel === 'details'),
      retry: 1
    }
  );

  // Extract KYC list - each record is a single document type
  const kycList = kycData?.data?.data || 
                  kycData?.data || 
                  (Array.isArray(kycData?.data) ? kycData.data : []) ||
                  [];

  // Extract users list
  const usersList = usersData?.data?.data || 
                   usersData?.data || 
                   (Array.isArray(usersData?.data) ? usersData.data : []) ||
                   [];

  // Create user lookup map (by id and displayCode)
  const userMap = useMemo(() => {
    const map = {};
    usersList.forEach(user => {
      map[user.id] = user;
      if (user.displayCode) {
        map[user.displayCode] = user;
      }
    });
    return map;
  }, [usersList]);

  // Group KYC records by userId to show all documents for each user
  const groupedKYCs = useMemo(() => {
    const grouped = {};
    kycList.forEach(kyc => {
      const userId = kyc.userId;
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          user: userMap[userId] || null,
          documents: [],
          overallStatus: 'pending'
        };
      }
      grouped[userId].documents.push(kyc);
      
      // Determine overall status
      const statuses = grouped[userId].documents.map(d => d.status);
      if (statuses.every(s => s === 'verified')) {
        grouped[userId].overallStatus = 'verified';
      } else if (statuses.some(s => s === 'rejected')) {
        grouped[userId].overallStatus = 'rejected';
      } else {
        grouped[userId].overallStatus = 'pending';
      }
    });
    return Object.values(grouped);
  }, [kycList, userMap]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = kycList.length;
    const pending = kycList.filter(k => k.status === 'pending').length;
    const verified = kycList.filter(k => k.status === 'verified').length;
    const rejected = kycList.filter(k => k.status === 'rejected').length;
    
    return { total, pending, verified, rejected };
  }, [kycList]);

  // Filter grouped KYCs
  const filteredKYCs = useMemo(() => {
    return groupedKYCs.filter(group => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const user = group.user;
        const matchesSearch = 
          user?.name?.toLowerCase().includes(searchLower) ||
          user?.email?.toLowerCase().includes(searchLower) ||
          group.userId?.toLowerCase().includes(searchLower) ||
          group.documents.some(d => d.id?.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      if (filters.status) {
        if (filters.status === 'pending' && group.overallStatus !== 'pending') return false;
        if (filters.status === 'verified' && group.overallStatus !== 'verified') return false;
        if (filters.status === 'rejected' && group.overallStatus !== 'rejected') return false;
      }

      if (filters.type) {
        const hasType = group.documents.some(d => d.type === filters.type);
        if (!hasType) return false;
      }
      
      return true;
    });
  }, [groupedKYCs, filters]);

  // Update KYC status mutation - using actual API structure
  const updateKYCStatusMutation = useMutation(
    ({ kycId, status, rejectionReason: reason }) => {
      const updateData = {
        status,
        rejectionReason: reason || null,
        reviewer: 'admin@hmr.com' // Get from auth context if available
      };
      return adminAPI.updateKYCStatus(kycId, updateData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['all-kyc']);
        setSelectedKYC(null);
        setShowDocumentModal(false);
        setSelectedKYCs([]);
        setShowBulkActionModal(false);
      },
    }
  );

  // Bulk update mutation
  const bulkUpdateMutation = useMutation(
    ({ kycIds, status, rejectionReason: reason }) => {
      const promises = kycIds.map(kycId => 
        adminAPI.updateKYCStatus(kycId, { 
          status, 
          rejectionReason: reason || null,
          reviewer: 'admin@hmr.com'
        })
      );
      return Promise.all(promises);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['all-kyc']);
        setSelectedKYCs([]);
        setShowBulkActionModal(false);
        setBulkAction(null);
        setRejectionReason('');
      },
    }
  );

  // Auto-approve all pending KYCs mutation
  const autoApproveAllMutation = useMutation(
    () => {
      // Get all pending KYC IDs
      const pendingKYCIds = kycList
        .filter(kyc => kyc.status === 'pending')
        .map(kyc => kyc.id);
      
      if (pendingKYCIds.length === 0) {
        return Promise.resolve({ message: 'No pending KYCs to approve' });
      }

      console.log(`🚀 Auto-approving ${pendingKYCIds.length} pending KYCs...`);
      
      const promises = pendingKYCIds.map(kycId => 
        adminAPI.updateKYCStatus(kycId, { 
          status: 'verified', 
          rejectionReason: null,
          reviewer: 'admin@hmr.com (Auto-Approved)'
        })
      );
      return Promise.all(promises);
    },
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(['all-kyc']);
        if (result?.message) {
          alert(result.message);
        } else {
          alert('✅ All pending KYCs have been auto-approved successfully!');
        }
      },
      onError: (error) => {
        console.error('❌ Auto-approve failed:', error);
        alert(`❌ Failed to auto-approve KYCs: ${error.message}`);
      }
    }
  );

  // Save auto-approve setting to localStorage
  useEffect(() => {
    localStorage.setItem('kycAutoApprove', autoApproveEnabled.toString());
  }, [autoApproveEnabled]);

  // Auto-approve effect - runs when auto-approve is enabled and new pending KYCs appear
  useEffect(() => {
    if (autoApproveEnabled && kycList.length > 0 && !autoApproveAllMutation.isLoading) {
      const pendingKYCs = kycList.filter(kyc => kyc.status === 'pending');
      if (pendingKYCs.length > 0) {
        console.log(`🔄 Auto-approve is ON. Found ${pendingKYCs.length} pending KYCs. Auto-approving in 2 seconds...`);
        // Delay auto-approve by 2 seconds to avoid immediate trigger
        const timer = setTimeout(() => {
          autoApproveAllMutation.mutate();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApproveEnabled, kycList.length]); // Only trigger when list length changes or toggle changes

  const handleToggleAutoApprove = () => {
    const newValue = !autoApproveEnabled;
    setAutoApproveEnabled(newValue);
    
    if (newValue) {
      const pendingCount = kycList.filter(kyc => kyc.status === 'pending').length;
      if (pendingCount > 0) {
        if (window.confirm(`Auto-Approve Mode is now ON.\n\n${pendingCount} pending KYC(s) will be automatically approved.\n\nContinue?`)) {
          // Auto-approve will trigger via useEffect
        } else {
          setAutoApproveEnabled(false);
        }
      } else {
        alert('✅ Auto-Approve Mode is now ON.\n\nAll new KYC submissions will be automatically approved.');
      }
    } else {
      alert('⏸️ Auto-Approve Mode is now OFF.\n\nKYC submissions will require manual review.');
    }
  };

  const handleManualAutoApprove = () => {
    const pendingCount = kycList.filter(kyc => kyc.status === 'pending').length;
    if (pendingCount === 0) {
      alert('ℹ️ No pending KYCs to approve.');
      return;
    }
    
    if (window.confirm(`Manually approve all ${pendingCount} pending KYC(s)?`)) {
      autoApproveAllMutation.mutate();
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'verified': { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Verified' },
      'pending': { icon: Clock, color: 'text-yellow-600 bg-yellow-100', label: 'Pending' },
      'rejected': { icon: XCircle, color: 'text-red-600 bg-red-100', label: 'Rejected' },
    };
    
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <Badge className={statusInfo.color}>
        <statusInfo.icon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      'cnic': 'CNIC',
      'face': 'Face/Selfie',
      'card': 'Card',
    };
    return typeMap[type] || type;
  };

  const getTypeIcon = (type) => {
    if (type === 'cnic') return FileText;
    if (type === 'face') return User;
    if (type === 'card') return CreditCard;
    return FileText;
  };

  const handleApprove = (kyc) => {
    if (window.confirm(`Approve this ${getTypeLabel(kyc.type)} verification?`)) {
      updateKYCStatusMutation.mutate({
        kycId: kyc.id,
        status: 'verified',
        rejectionReason: null
      });
    }
  };

  const handleReject = (kyc) => {
    const reason = window.prompt('Enter rejection reason:', '');
    if (reason !== null) {
      updateKYCStatusMutation.mutate({
        kycId: kyc.id,
        status: 'rejected',
        rejectionReason: reason || 'Rejected by admin'
      });
    }
  };

  // Handle review - show all documents for a user
  const handleReview = (group) => {
    setSelectedUserGroup(group);
    setShowReviewModal(true);
  };

  // Get all documents for a user group
  const getAllUserDocuments = (group) => {
    const documents = {
      front: null,
      back: null,
      selfie: null
    };
    
    group.documents.forEach(kyc => {
      if (kyc.documentFrontUrl) documents.front = kyc.documentFrontUrl;
      if (kyc.documentBackUrl) documents.back = kyc.documentBackUrl;
      if (kyc.selfieUrl) documents.selfie = kyc.selfieUrl;
    });
    
    return documents;
  };

  // Approve all pending KYC records for a user
  const handleApproveFromReview = (group) => {
    const pendingKYCs = group.documents.filter(d => d.status === 'pending');
    if (pendingKYCs.length === 0) {
      alert('No pending KYC records to approve for this user.');
      return;
    }
    
    if (window.confirm(`Approve ${pendingKYCs.length} pending KYC verification(s) for this user?`)) {
      // Approve all pending records
      const approvePromises = pendingKYCs.map(kyc => 
        adminAPI.updateKYCStatus(kyc.id, {
          status: 'verified',
          rejectionReason: null,
          reviewer: 'admin@hmr.com'
        })
      );
      
      Promise.all(approvePromises)
        .then(() => {
          queryClient.invalidateQueries(['all-kyc']);
          setShowReviewModal(false);
          setSelectedUserGroup(null);
          alert(`✅ Successfully approved ${pendingKYCs.length} KYC verification(s).`);
        })
        .catch((error) => {
          console.error('Failed to approve KYCs:', error);
          alert(`❌ Failed to approve some KYC verifications: ${error.message}`);
        });
    }
  };

  // Reject all pending KYC records for a user
  const handleRejectFromReview = (group) => {
    const pendingKYCs = group.documents.filter(d => d.status === 'pending');
    if (pendingKYCs.length === 0) {
      alert('No pending KYC records to reject for this user.');
      return;
    }
    
    const reason = window.prompt('Enter rejection reason:', '');
    if (reason !== null) {
      // Reject all pending records
      const rejectPromises = pendingKYCs.map(kyc => 
        adminAPI.updateKYCStatus(kyc.id, {
          status: 'rejected',
          rejectionReason: reason || 'Rejected by admin',
          reviewer: 'admin@hmr.com'
        })
      );
      
      Promise.all(rejectPromises)
        .then(() => {
          queryClient.invalidateQueries(['all-kyc']);
          setShowReviewModal(false);
          setSelectedUserGroup(null);
          alert(`✅ Successfully rejected ${pendingKYCs.length} KYC verification(s).`);
        })
        .catch((error) => {
          console.error('Failed to reject KYCs:', error);
          alert(`❌ Failed to reject some KYC verifications: ${error.message}`);
        });
    }
  };

  const handleBulkApprove = () => {
    if (selectedKYCs.length === 0) return;
    if (window.confirm(`Approve ${selectedKYCs.length} KYC verification(s)?`)) {
      bulkUpdateMutation.mutate({
        kycIds: selectedKYCs,
        status: 'verified',
        rejectionReason: null
      });
    }
  };

  const handleBulkReject = () => {
    if (selectedKYCs.length === 0) return;
    setBulkAction('reject');
    setShowBulkActionModal(true);
  };

  const handleBulkRejectConfirm = () => {
    if (selectedKYCs.length === 0) return;
    bulkUpdateMutation.mutate({
      kycIds: selectedKYCs,
      status: 'rejected',
      rejectionReason: rejectionReason || 'Bulk rejected by admin'
    });
  };

  const toggleSelectKYC = (kycId) => {
    setSelectedKYCs(prev => 
      prev.includes(kycId) 
        ? prev.filter(id => id !== kycId)
        : [...prev, kycId]
    );
  };

  const toggleSelectAll = () => {
    const allIds = filteredKYCs.flatMap(group => group.documents.map(d => d.id));
    if (selectedKYCs.length === allIds.length) {
      setSelectedKYCs([]);
    } else {
      setSelectedKYCs(allIds);
    }
  };

  const getDocumentUrl = (kyc) => {
    // Use documentFrontUrl, documentBackUrl, or selfieUrl based on type
    let url = kyc.documentFrontUrl || kyc.documentBackUrl || kyc.selfieUrl;
    
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return `${API_BASE_URL}${url}`;
    }
    return `${API_BASE_URL}/${url}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount, currency = 'USD') => {
    const num = parseFloat(amount);
    if (num >= 1000000000) {
      return `${currency} ${(num / 1000000000).toFixed(1)}B`;
    } else if (num >= 1000000) {
      return `${currency} ${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${currency} ${(num / 1000).toFixed(0)}K`;
    }
    return `${currency} ${num.toFixed(0)}`;
  };

  const closeActionPanel = () => {
    setActionPanel(null);
    setSelectedUserId(null);
  };

  // Handle opening user details sidebar
  const handleOpenUserDetails = (group) => {
    const userId = group.userId;
    if (userId) {
      setSelectedUserId(userId);
      setActionPanel('details');
    }
  };

  // Get selected user's KYC group
  const selectedUserKYCGroup = useMemo(() => {
    if (!selectedUserId) return null;
    // Try to find by userId, displayCode, or id
    return groupedKYCs.find(g => {
      const kycUserId = g.userId;
      const userDisplayCode = g.user?.displayCode;
      const userId = g.user?.id;
      
      return kycUserId === selectedUserId || 
             userDisplayCode === selectedUserId ||
             userId === selectedUserId ||
             String(kycUserId) === String(selectedUserId) ||
             String(userId) === String(selectedUserId);
    });
  }, [selectedUserId, groupedKYCs]);

  // Auto-open user details panel when initialUserId is provided (only once)
  const hasProcessedInitialUserId = useRef(false);
  
  useEffect(() => {
    // Only process initialUserId once when it's first provided from URL
    // Don't run if panel is already open (user clicked manually) or if we've already processed it
    if (initialUserId && !actionPanel && !hasProcessedInitialUserId.current && groupedKYCs.length > 0) {
      // First, try to find in groupedKYCs (users with KYC records)
      const matchingGroup = groupedKYCs.find(g => {
        const kycUserId = g.userId;
        const userDisplayCode = g.user?.displayCode;
        const userId = g.user?.id;
        
        return kycUserId === initialUserId || 
               userDisplayCode === initialUserId ||
               userId === initialUserId ||
               String(kycUserId) === String(initialUserId);
      });

      // If found in KYC list, use that userId
      if (matchingGroup) {
        setSelectedUserId(matchingGroup.userId);
        setActionPanel('details');
        hasProcessedInitialUserId.current = true;
        
        // Clean up URL parameter after opening
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('userId');
        const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      } else if (usersList.length > 0) {
        // If not in KYC list, try to find user in usersList by id or displayCode
        const matchingUser = usersList.find(u => {
          const userId = u.id;
          const displayCode = u.displayCode;
          
          return userId === initialUserId || 
                 displayCode === initialUserId ||
                 String(userId) === String(initialUserId);
        });

        if (matchingUser) {
          // Use the user's id (not displayCode) for consistency
          setSelectedUserId(matchingUser.id || matchingUser.displayCode);
          setActionPanel('details');
          hasProcessedInitialUserId.current = true;
          
          // Clean up URL parameter after opening
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.delete('userId');
          const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
    
    // Reset the ref when initialUserId is removed (user navigated away)
    if (!initialUserId) {
      hasProcessedInitialUserId.current = false;
    }
  }, [initialUserId, groupedKYCs, usersList]); // Removed actionPanel from dependencies

  if (kycLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-card-foreground">KYC Management</h1>
          <p className="text-muted-foreground mt-2">
            Review and manage user KYC verifications
            {!actionPanel && filteredKYCs.length > 0 && (
              <span className="ml-2 text-blue-600 font-semibold">
                ({filteredKYCs.length} {filteredKYCs.length === 1 ? 'user' : 'users'} found)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {actionPanel && (
            <Button 
              onClick={closeActionPanel}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Back to List</span>
            </Button>
          )}
          {!actionPanel && selectedKYCs.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={handleBulkApprove} variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Selected ({selectedKYCs.length})
              </Button>
              <Button onClick={handleBulkReject} variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100">
                <XCircle className="h-4 w-4 mr-2" />
                Reject Selected ({selectedKYCs.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 relative transition-all duration-300">
        {/* LEFT SIDE: Stats + Filters + KYC List */}
        <div className={cn(
          "transition-all duration-300 space-y-4",
          actionPanel ? "lg:col-span-5" : "lg:col-span-12"
        )}>
      {/* Auto-Approve Control Bar */}
      <Card className={`p-4 ${autoApproveEnabled ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${autoApproveEnabled ? 'bg-green-100 dark:bg-green-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
              <Zap className={`h-5 w-5 ${autoApproveEnabled ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${autoApproveEnabled ? 'text-green-900 dark:text-green-100' : 'text-blue-900 dark:text-blue-100'}`}>
                    Auto-Approve {autoApproveEnabled ? 'ON' : 'OFF'}
              </h3>
              <p className={`text-sm ${autoApproveEnabled ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
                    {autoApproveEnabled ? '✅ Auto-approving' : '⏸️ Manual review'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
                {!actionPanel && (
            <Button
              onClick={handleManualAutoApprove}
              variant="outline"
              disabled={autoApproveAllMutation.isLoading || kycList.filter(k => k.status === 'pending').length === 0}
              className="bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
                    size="sm"
            >
                    <Zap className="h-4 w-4 mr-1" />
                    {autoApproveAllMutation.isLoading ? 'Approving...' : 'Approve All'}
            </Button>
                )}
            
            {/* Toggle Switch */}
            <button
              onClick={handleToggleAutoApprove}
              disabled={autoApproveAllMutation.isLoading}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                autoApproveEnabled 
                  ? 'bg-green-600 focus:ring-green-500' 
                  : 'bg-gray-300 dark:bg-gray-600 focus:ring-gray-400'
              } ${autoApproveAllMutation.isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              role="switch"
              aria-checked={autoApproveEnabled}
            >
              <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      autoApproveEnabled ? 'translate-x-9' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
          <div className={cn(
            "grid gap-4",
            actionPanel ? "grid-cols-2" : "grid-cols-1 md:grid-cols-4"
          )}>
            <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-xs font-medium text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-card-foreground">{stats.total}</p>
            </div>
                <Shield className="h-6 w-6 text-blue-500" />
          </div>
        </Card>

            <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-xs font-medium text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
                <Clock className="h-6 w-6 text-yellow-500" />
          </div>
        </Card>

            <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-xs font-medium text-muted-foreground">Verified</p>
                  <p className="text-xl font-bold text-green-600">{stats.verified}</p>
            </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        </Card>

            <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-xs font-medium text-muted-foreground">Rejected</p>
                  <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
            </div>
                <XCircle className="h-6 w-6 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            return false;
          }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div>
            <Input
              type="text"
              placeholder="Search by name, email, user ID..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              icon={<Search className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
          
          {/* Status Dropdown */}
          <div className="w-[150px]">
            <select
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Type Dropdown - Only show when sidebar is closed */}
          {!actionPanel && (
            <div className="w-[150px]">
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="cnic">CNIC</option>
                <option value="face">Face/Selfie</option>
                <option value="card">Card</option>
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {!actionPanel && (
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                setSearchInput('');
                setFilters({ search: '', status: '', type: '', sort_by: 'submittedAt', sort_order: 'desc' });
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </form>
      </Card>

          {/* KYC List - Users */}
          <div className="dark:bg-slate-900/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 dark:border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                KYC Users ({filteredKYCs.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredKYCs.length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mb-4 opacity-50" />
                  <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">No KYC users found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              ) : (
                filteredKYCs.map((group) => {
                  const userId = group.userId;
                  const isSelected = actionPanel === 'details' && selectedUserId && (
                    userId === selectedUserId || 
                    String(userId) === String(selectedUserId)
                  );
                  const user = group.user;
                  const pendingCount = group.documents.filter(d => d.status === 'pending').length;

                  return (
                    <div
                      key={userId}
                      onClick={() => handleOpenUserDetails(group)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all duration-200",
                        isSelected
                          ? "dark:bg-blue-900/20 border-2 border-blue-500/50"
                          : "dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || user?.name || 'U')}`}
                            alt=""
                            className="w-10 h-10 rounded-full"
                          />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user?.fullName || user?.name || user?.displayCode || userId?.slice(0, 12) + '...'}
                            </p>
                            {getStatusBadge(group.overallStatus)}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user?.email || 'No email'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400">
                              {group.documents.length} doc(s)
                            </span>
                            {pendingCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                {pendingCount} pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: User Details Panel */}
        {actionPanel === 'details' && selectedUserId && (
          <div className={cn(
            "lg:col-span-7 rounded-xl shadow-lg p-6",
            "transition-all duration-300",
            "lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
          )}>
            {fullUserLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader />
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Header */}
                <div className="pb-4 border-b border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-2xl">
                        {(fullUserData?.data?.fullName || fullUserData?.data?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-card-foreground">
                          {fullUserData?.data?.fullName || fullUserData?.data?.name || 'Unknown User'}
                        </h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          {fullUserData?.data?.email || 'No email'}
                        </p>
                        {fullUserData?.data?.displayCode && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-1">
                            User ID: {fullUserData.data.displayCode}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={closeActionPanel}
                      className="h-8 w-8 p-0"
                      title="Close"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* KYC Status Section */}
                {selectedUserKYCGroup && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      KYC Verification Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Overall Status</span>
                        {getStatusBadge(selectedUserKYCGroup.overallStatus)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Documents</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {selectedUserKYCGroup.documents.length} submitted
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Pending Review</span>
                        <span className="text-sm font-medium text-yellow-600">
                          {selectedUserKYCGroup.documents.filter(d => d.status === 'pending').length}
                        </span>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    {selectedUserKYCGroup.overallStatus === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={() => handleApproveFromReview(selectedUserKYCGroup)}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve All
                        </Button>
                        <Button
                          onClick={() => handleRejectFromReview(selectedUserKYCGroup)}
                          variant="outline"
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject All
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* KYC Documents Preview */}
                {selectedUserKYCGroup && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Submitted Documents
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const allDocs = getAllUserDocuments(selectedUserKYCGroup);
                        return (
                          <>
                            {allDocs.front && (
                              <div className="border border-border rounded-lg p-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Front</p>
                                <img
                                  src={getDocumentUrl({ documentFrontUrl: allDocs.front })}
                                  alt="Front"
                                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(getDocumentUrl({ documentFrontUrl: allDocs.front }), '_blank')}
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="80"%3E%3Crect fill="%23f3f4f6" width="100" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              </div>
                            )}
                            {allDocs.back && (
                              <div className="border border-border rounded-lg p-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Back</p>
                                <img
                                  src={getDocumentUrl({ documentBackUrl: allDocs.back })}
                                  alt="Back"
                                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(getDocumentUrl({ documentBackUrl: allDocs.back }), '_blank')}
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="80"%3E%3Crect fill="%23f3f4f6" width="100" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              </div>
                            )}
                            {allDocs.selfie && (
                              <div className="border border-border rounded-lg p-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Selfie</p>
                                <img
                                  src={getDocumentUrl({ selfieUrl: allDocs.selfie })}
                                  alt="Selfie"
                                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(getDocumentUrl({ selfieUrl: allDocs.selfie }), '_blank')}
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="80"%3E%3Crect fill="%23f3f4f6" width="100" height="80"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              </div>
                            )}
                            {!allDocs.front && !allDocs.back && !allDocs.selfie && (
                              <div className="col-span-3 text-center py-4 text-muted-foreground text-sm">
                                No documents available
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(selectedUserKYCGroup)}
                      className="w-full mt-3"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full Documents
                    </Button>
                  </div>
                )}

                {/* Financial Metrics */}
                {financialLoading ? (
                  <div className="text-center py-4">
                    <Loader />
                    <p className="text-sm text-gray-500 mt-2">Loading financial data...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Wallet Balance */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Wallet</p>
                          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                            <Wallet className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatPrice(userFinancialData?.walletBalance || 0)}
                        </p>
                      </div>
                      
                      {/* Total Investments */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Invested</p>
                          <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatPrice(userFinancialData?.totalInvestments || 0)}
                        </p>
                      </div>
                      
                      {/* Total Returns */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Returns</p>
                          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                            <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatPrice(userFinancialData?.totalReturns || 0)}
                        </p>
                      </div>
                      
                      {/* Properties */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Properties</p>
                          <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {userFinancialData?.propertiesInvested || 0}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Personal Information */}
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-5 border border-gray-200 dark:border-slate-700">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Personal Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Full Name</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                        {fullUserData?.data?.fullName || fullUserData?.data?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                        {fullUserData?.data?.email || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Phone</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                        {fullUserData?.data?.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Joined</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                        {fullUserData?.data?.createdAt 
                          ? new Date(fullUserData.data.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
                      <span className={cn(
                        "text-sm font-semibold",
                        (fullUserData?.data?.isActive !== undefined ? fullUserData?.data?.isActive : fullUserData?.data?.is_active)
                          ? "text-green-600" 
                          : "text-gray-500"
                      )}>
                        {(fullUserData?.data?.isActive !== undefined ? fullUserData?.data?.isActive : fullUserData?.data?.is_active) ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Original KYC Table - Hidden when sidebar is open */}
      {!actionPanel && (
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedKYCs.length > 0 && selectedKYCs.length === filteredKYCs.flatMap(g => g.documents.map(d => d.id)).length}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Document Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Reviewed</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredKYCs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>No KYC verifications found</p>
                  </td>
                </tr>
              ) : (
                filteredKYCs.flatMap(group => 
                  group.documents.map((kyc) => {
                    const TypeIcon = getTypeIcon(kyc.type);
                    return (
                      <tr key={kyc.id} className="hover:bg-accent/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedKYCs.includes(kyc.id)}
                            onChange={() => toggleSelectKYC(kyc.id)}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-3">
  <div>
    <p className="font-medium text-card-foreground">
      {/* Use the displayCode from the user object, falling back to UUID if not found */}
      {group.user?.displayCode || kyc.userId}
    </p>
    {group.user?.email && (
      <p className="text-sm text-muted-foreground">{group.user.email}</p>
    )}
  </div>
</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-card-foreground">{getTypeLabel(kyc.type)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(kyc.status)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-card-foreground">{formatDate(kyc.submittedAt || kyc.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-card-foreground">{formatDate(kyc.reviewedAt)}</p>
                          {kyc.reviewer && (
                            <p className="text-xs text-muted-foreground">{kyc.reviewer}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {/* Review Button - Show for first document of each user group */}
                            {group.documents[0]?.id === kyc.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReview(group)}
                                className="text-blue-600 hover:bg-blue-50"
                                title="Review All Documents"
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>
                            )}
                            {kyc.status !== 'verified' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(kyc)}
                                className="text-green-600 hover:bg-green-50"
                                disabled={updateKYCStatusMutation.isLoading}
                                title="Approve"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {kyc.status !== 'rejected' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(kyc)}
                                className="text-red-600 hover:bg-red-50"
                                disabled={updateKYCStatusMutation.isLoading}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {/* Document Viewer Modal */}
      {showDocumentModal && selectedKYC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">KYC Document Details</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {getTypeLabel(selectedKYC.type)} - {selectedKYC.userId}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  setSelectedKYC(null);
                }}
                className="text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-6 space-y-6">
              {/* User Information */}
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">User Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-medium text-card-foreground">{selectedKYC.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Document Type</p>
                    <p className="font-medium text-card-foreground">{getTypeLabel(selectedKYC.type)}</p>
                  </div>
                  {userMap[selectedKYC.userId]?.name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium text-card-foreground">{userMap[selectedKYC.userId].name}</p>
                    </div>
                  )}
                  {userMap[selectedKYC.userId]?.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-card-foreground">{userMap[selectedKYC.userId].email}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Status */}
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Verification Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    {getStatusBadge(selectedKYC.status)}
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Submitted</p>
                    <p className="font-medium text-card-foreground">{formatDate(selectedKYC.submittedAt || selectedKYC.createdAt)}</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Reviewed</p>
                    <p className="font-medium text-card-foreground">{formatDate(selectedKYC.reviewedAt) || 'Not reviewed'}</p>
                    {selectedKYC.reviewer && (
                      <p className="text-xs text-muted-foreground mt-1">by {selectedKYC.reviewer}</p>
                    )}
                  </div>
                </div>
                {selectedKYC.rejectionReason && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm font-medium text-red-400 mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-300">{selectedKYC.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Document Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Front Document */}
                  {selectedKYC.documentFrontUrl && (
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm font-medium text-card-foreground mb-2">Front</p>
                      <img
                        src={getDocumentUrl({ ...selectedKYC, documentFrontUrl: selectedKYC.documentFrontUrl })}
                        alt="Document Front"
                        className="w-full h-48 object-cover rounded-lg mb-2 cursor-pointer hover:opacity-80"
                        onClick={() => window.open(getDocumentUrl({ ...selectedKYC, documentFrontUrl: selectedKYC.documentFrontUrl }), '_blank')}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getDocumentUrl({ ...selectedKYC, documentFrontUrl: selectedKYC.documentFrontUrl }), '_blank')}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Size
                      </Button>
                    </div>
                  )}

                  {/* Back Document */}
                  {selectedKYC.documentBackUrl && (
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm font-medium text-card-foreground mb-2">Back</p>
                      <img
                        src={getDocumentUrl({ ...selectedKYC, documentBackUrl: selectedKYC.documentBackUrl })}
                        alt="Document Back"
                        className="w-full h-48 object-cover rounded-lg mb-2 cursor-pointer hover:opacity-80"
                        onClick={() => window.open(getDocumentUrl({ ...selectedKYC, documentBackUrl: selectedKYC.documentBackUrl }), '_blank')}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getDocumentUrl({ ...selectedKYC, documentBackUrl: selectedKYC.documentBackUrl }), '_blank')}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Size
                      </Button>
                    </div>
                  )}

                  {/* Selfie */}
                  {selectedKYC.selfieUrl && (
                    <div className="border border-border rounded-lg p-4">
                      <p className="text-sm font-medium text-card-foreground mb-2">Selfie</p>
                      <img
                        src={getDocumentUrl({ ...selectedKYC, selfieUrl: selectedKYC.selfieUrl })}
                        alt="Selfie"
                        className="w-full h-48 object-cover rounded-lg mb-2 cursor-pointer hover:opacity-80"
                        onClick={() => window.open(getDocumentUrl({ ...selectedKYC, selfieUrl: selectedKYC.selfieUrl }), '_blank')}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getDocumentUrl({ ...selectedKYC, selfieUrl: selectedKYC.selfieUrl }), '_blank')}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Size
                      </Button>
                    </div>
                  )}

                  {!selectedKYC.documentFrontUrl && !selectedKYC.documentBackUrl && !selectedKYC.selfieUrl && (
                    <div className="col-span-3 text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p>No document images available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                {selectedKYC.status !== 'verified' && (
                  <Button
                    onClick={() => handleApprove(selectedKYC)}
                    disabled={updateKYCStatusMutation.isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {selectedKYC.status !== 'rejected' && (
                  <Button
                    onClick={() => handleReject(selectedKYC)}
                    disabled={updateKYCStatusMutation.isLoading}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal - Show all KYC documents for a user */}
      {showReviewModal && selectedUserGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-border">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">Review KYC Documents</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedUserGroup.user?.name || selectedUserGroup.user?.displayCode || selectedUserGroup.userId}
                  {selectedUserGroup.user?.email && ` - ${selectedUserGroup.user.email}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedUserGroup(null);
                }}
                className="text-muted-foreground hover:text-card-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-6 space-y-6">
              {/* User Information */}
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">User Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-medium text-card-foreground">{selectedUserGroup.userId}</p>
                  </div>
                  {selectedUserGroup.user?.name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium text-card-foreground">{selectedUserGroup.user.name}</p>
                    </div>
                  )}
                  {selectedUserGroup.user?.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-card-foreground">{selectedUserGroup.user.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Status</p>
                    {getStatusBadge(selectedUserGroup.overallStatus)}
                  </div>
                </div>
              </div>

              {/* All KYC Documents */}
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">Submitted Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Front Document */}
                  {(() => {
                    const allDocs = getAllUserDocuments(selectedUserGroup);
                    return (
                      <>
                        {allDocs.front && (
                          <div className="border border-border rounded-lg p-4">
                            <p className="text-sm font-medium text-card-foreground mb-2">Front of ID</p>
                            <img
                              src={getDocumentUrl({ documentFrontUrl: allDocs.front })}
                              alt="Document Front"
                              className="w-full h-64 object-contain rounded-lg mb-2 cursor-pointer hover:opacity-80 bg-gray-50"
                              onClick={() => window.open(getDocumentUrl({ documentFrontUrl: allDocs.front }), '_blank')}
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(getDocumentUrl({ documentFrontUrl: allDocs.front }), '_blank')}
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Size
                            </Button>
                          </div>
                        )}

                        {/* Back Document */}
                        {allDocs.back && (
                          <div className="border border-border rounded-lg p-4">
                            <p className="text-sm font-medium text-card-foreground mb-2">Back of ID</p>
                            <img
                              src={getDocumentUrl({ documentBackUrl: allDocs.back })}
                              alt="Document Back"
                              className="w-full h-64 object-contain rounded-lg mb-2 cursor-pointer hover:opacity-80 bg-gray-50"
                              onClick={() => window.open(getDocumentUrl({ documentBackUrl: allDocs.back }), '_blank')}
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(getDocumentUrl({ documentBackUrl: allDocs.back }), '_blank')}
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Size
                            </Button>
                          </div>
                        )}

                        {/* Selfie */}
                        {allDocs.selfie && (
                          <div className="border border-border rounded-lg p-4">
                            <p className="text-sm font-medium text-card-foreground mb-2">Selfie Photo</p>
                            <img
                              src={getDocumentUrl({ selfieUrl: allDocs.selfie })}
                              alt="Selfie"
                              className="w-full h-64 object-contain rounded-lg mb-2 cursor-pointer hover:opacity-80 bg-gray-50"
                              onClick={() => window.open(getDocumentUrl({ selfieUrl: allDocs.selfie }), '_blank')}
                              onError={(e) => {
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage not available%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(getDocumentUrl({ selfieUrl: allDocs.selfie }), '_blank')}
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Full Size
                            </Button>
                          </div>
                        )}

                        {!allDocs.front && !allDocs.back && !allDocs.selfie && (
                          <div className="col-span-3 text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p>No document images available for this user</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* KYC Records Summary */}
              <div>
                <h3 className="text-lg font-semibold text-card-foreground mb-4">KYC Records</h3>
                <div className="space-y-2">
                  {selectedUserGroup.documents.map((kyc) => {
                    const TypeIcon = getTypeIcon(kyc.type);
                    return (
                      <div key={kyc.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <TypeIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-card-foreground">{getTypeLabel(kyc.type)}</p>
                              <p className="text-sm text-muted-foreground">
                                Submitted: {formatDate(kyc.submittedAt || kyc.createdAt)}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(kyc.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                {selectedUserGroup.overallStatus !== 'verified' && (
                  <Button
                    onClick={() => handleApproveFromReview(selectedUserGroup)}
                    disabled={updateKYCStatusMutation.isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve All Pending
                  </Button>
                )}
                {selectedUserGroup.overallStatus !== 'rejected' && (
                  <Button
                    onClick={() => handleRejectFromReview(selectedUserGroup)}
                    disabled={updateKYCStatusMutation.isLoading}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject All Pending
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedUserGroup(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {showBulkActionModal && bulkAction === 'reject' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Reject {selectedKYCs.length} KYC(s)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  Rejection Reason
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleBulkRejectConfirm}
                  disabled={bulkUpdateMutation.isLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {bulkUpdateMutation.isLoading ? 'Processing...' : 'Confirm Reject'}
                </Button>
                <Button
                  onClick={() => {
                    setShowBulkActionModal(false);
                    setBulkAction(null);
                    setRejectionReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default KYCManagement;
