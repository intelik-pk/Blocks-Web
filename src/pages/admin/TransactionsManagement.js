import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  XCircle,
  Award
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { adminAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import TransactionTabs from '../../components/transactions/TransactionTabs';
import TransactionFilters from '../../components/transactions/TransactionFilters';
import TransactionTable from '../../components/transactions/TransactionTable';
import { formatExactPrice, formatFullPrice } from '../../utils/formatPrice';

const TransactionsManagement = ({ initialFilters, onFiltersSet }) => {
  const { isAuthenticated } = useAdminAuth();
  
  const [filters, setFilters] = useState({
    search: initialFilters?.search || '',
    status: Array.isArray(initialFilters?.status) ? initialFilters.status : (initialFilters?.status ? [initialFilters.status] : []),
    transaction_type: Array.isArray(initialFilters?.transaction_type) ? initialFilters.transaction_type : (initialFilters?.transaction_type ? [initialFilters.transaction_type] : []),
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Apply initial filters when component mounts or initialFilters change
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...initialFilters }));
      if (onFiltersSet) {
        // Clear initial filters after applying
        setTimeout(() => onFiltersSet(), 100);
      }
    }
  }, [initialFilters, onFiltersSet]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch transactions
  const { data: transactionsData, isLoading, error } = useQuery(
    ['admin-transactions'],
    async () => {
      const response = await adminAPI.getTransactions({
        limit: 1000 // Get all transactions for frontend filtering
      });
      console.log('Transactions API Response:', response);
      return response;
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Handle different response formats from backend
  const allTransactions = transactionsData?.data?.data?.transactions || 
                          transactionsData?.data?.transactions || 
                          transactionsData?.data || 
                          (Array.isArray(transactionsData) ? transactionsData : []);

  // Analyze backend response structure to detect available fields
  const backendFields = useMemo(() => {
    if (allTransactions.length === 0) {
      return {
        hasDate: false,
        hasDisplayCode: false,
        hasTransactionType: false,
        hasFromTo: false,
        hasStatus: false,
        hasAmount: false,
        hasEndBalance: false
      };
    }

    // Sample first transaction to detect available fields
    const sample = allTransactions[0];
    console.log('Transaction API response sample:', sample);

    // Helper to check if any field exists
    const hasAnyField = (fields) => {
      return fields.some(field => {
        if (field.includes('?.') || field.includes('.')) {
          const parts = field.split(/[?.]/);
          let value = sample;
          for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
              value = value[part];
            } else {
              return false;
            }
          }
          return value !== null && value !== undefined;
        }
        const value = sample[field];
        // Check if value exists and is not null/undefined
        // Also check if it's an object with properties (for user objects)
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // For objects like 'user', check if it has any meaningful properties
            return Object.keys(value).length > 0;
          }
          return true;
        }
        return false;
      });
    };

    return {
      hasDate: hasAnyField(['createdAt', 'created_at', 'date', 'timestamp']),
      hasDisplayCode: hasAnyField(['displayCode', 'display_code', 'code', 'transactionCode']),
      hasTransactionType: hasAnyField(['transactionType', 'transaction_type', 'type', 'method']),
      hasFromTo: hasAnyField([
        'sender', 'from', 'user', 'buyer', 'email',
        'receiver', 'to', 'seller', 'walletAddress'
      ]),
      hasStatus: hasAnyField(['status']),
      hasAmount: hasAnyField(['amount', 'amountUSDT', 'amount_in_pkr', 'amount_in_usdt']),
      hasEndBalance: hasAnyField([
        'balanceAfter', 'endingBalance', 'walletBalance', 'balance', 'finalBalance', 'balance_after'
      ])
    };
  }, [allTransactions]);

  // Helper function to get field from transaction (backend-aware)
  const getField = (transaction, ...fieldNames) => {
    for (const field of fieldNames) {
      // Handle nested fields like 'user?.fullName'
      if (field.includes('?.') || field.includes('.')) {
        const parts = field.split(/[?.]/);
        let value = transaction;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            value = null;
            break;
          }
        }
        if (value !== null && value !== undefined) {
          return value;
        }
      } else if (transaction[field] !== undefined && transaction[field] !== null) {
        return transaction[field];
      }
    }
    return null;
  };

  // Tab-based filtering (backend-aware)
  const tabFilteredTransactions = useMemo(() => {
    if (activeTab === 'all') return allTransactions;
    
    return allTransactions.filter(transaction => {
      // Get transaction type (try multiple field names)
      const transactionType = getField(
        transaction,
        'transactionType',
        'transaction_type',
        'type',
        'method'
      )?.toLowerCase() || '';
      
      // Get status (try multiple field names)
      const status = getField(
        transaction,
        'status'
      )?.toLowerCase() || '';

      switch (activeTab) {
        case 'invested':
          // Money invested = investment transactions (only if backend provides this field)
          return transactionType === 'investment' || 
                 transactionType === 'invested' || 
                 transactionType === 'invest' ||
                 (transaction.category && transaction.category.toLowerCase().includes('investment')) ||
                 (transaction.category && transaction.category.toLowerCase().includes('invest'));
        case 'received':
          // Money received = deposits (only if backend provides this field)
          return transactionType === 'deposit' || transactionType === 'received';
        case 'topup':
          // Top up = deposits (only if backend provides this field)
          return transactionType === 'deposit' || transactionType === 'topup' || transactionType === 'top_up';
        case 'rewards':
          // Rewards = reward transactions (only if backend provides this field)
          return transactionType === 'reward' || 
                 transactionType === 'rewards' ||
                 (transaction.category && transaction.category.toLowerCase().includes('reward')) ||
                 (transaction.description && transaction.description.toLowerCase().includes('reward'));
        default:
          return true;
      }
    });
  }, [allTransactions, activeTab]);

  // Frontend filtering logic (applied after tab filtering)
  const filteredTransactions = useMemo(() => {
    let filtered = [...tabFilteredTransactions];
    
    // Search filter - only transaction ID, display code, and investor name
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(transaction => {
        // Transaction ID - try multiple field names
        const id = getField(transaction, 'id', '_id', 'transactionId', 'transaction_id');
        const idStr = id ? String(id).toLowerCase() : '';
        
        // Display Code - try multiple field names using getField
        const displayCode = getField(transaction, 'displayCode', 'display_code', 'code', 'transactionCode');
        const displayCodeStr = displayCode ? String(displayCode).toLowerCase() : '';
        
        // Investor name (user name) - comprehensive search
        let userName = '';
        
        // First, try to get user object or user name directly
        const userObj = transaction.user;
        if (userObj && typeof userObj === 'object' && userObj !== null) {
          // Extract name from user object
          userName = userObj.fullName || 
                     userObj.full_name || 
                     userObj.name || 
                     userObj.username || 
                     userObj.email ||
                     '';
        }
        
        // If no user object, try direct fields
        if (!userName) {
          userName = getField(
            transaction, 
            'user_name',
            'userName',
            'sender',
            'from',
            'buyer',
            'sender_name',
            'from_name',
            'user?.fullName', 
            'user?.full_name',
            'user?.name', 
            'user?.username',
            'user?.email'
          ) || '';
        }
        
        // Convert to string and lowercase
        const userNameStr = userName ? String(userName).toLowerCase() : '';
        
        // Check if search term matches any of the fields (non-empty strings only)
        const matchesId = idStr && idStr.includes(searchLower);
        const matchesDisplayCode = displayCodeStr && displayCodeStr.includes(searchLower);
        const matchesUserName = userNameStr && userNameStr.includes(searchLower);
        
        return matchesId || matchesDisplayCode || matchesUserName;
      });
    }
    
    // Status filter (multi-select)
    if (Array.isArray(filters.status) && filters.status.length > 0) {
      filtered = filtered.filter(transaction => {
        const transactionStatus = getField(transaction, 'status')?.toLowerCase() || '';
        return filters.status.some(filterStatus => 
          transactionStatus === filterStatus.toLowerCase()
        );
      });
    }
    
    // Transaction type filter (multi-select)
    if (Array.isArray(filters.transaction_type) && filters.transaction_type.length > 0) {
      filtered = filtered.filter(transaction => {
        const transactionType = getField(
          transaction,
          'transactionType',
          'transaction_type',
          'type',
          'method'
        )?.toLowerCase() || '';
        return filters.transaction_type.some(filterType => 
          transactionType === filterType.toLowerCase()
        );
      });
    }
    
    // Sorting
    if (filters.sort_by) {
      filtered.sort((a, b) => {
        let aValue, bValue;
        
        switch (filters.sort_by) {
          case 'amount_in_pkr':
            aValue = parseFloat(getField(a, 'amount', 'amountUSDT', 'amount_in_pkr', 'amount_in_usdt') || 0);
            bValue = parseFloat(getField(b, 'amount', 'amountUSDT', 'amount_in_pkr', 'amount_in_usdt') || 0);
            break;
          case 'status':
            aValue = (getField(a, 'status') || '').toLowerCase();
            bValue = (getField(b, 'status') || '').toLowerCase();
            break;
          case 'created_at':
          default:
            aValue = new Date(getField(a, 'createdAt', 'created_at', 'date') || 0);
            bValue = new Date(getField(b, 'createdAt', 'created_at', 'date') || 0);
            break;
        }
        
        if (filters.sort_order === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }
    
    return filtered;
  }, [tabFilteredTransactions, filters]);
  
  // Pagination - 20 items per page
  const itemsPerPage = 20;
  const totalFiltered = filteredTransactions.length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);
  
  // Get paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage, itemsPerPage]);
  
  // Use paginated transactions
  const transactions = paginatedTransactions;
  
  // Update pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.status, filters.transaction_type, filters.sort_by, filters.sort_order, activeTab]);
  
  const pagination = {
    totalPages: totalPages,
    currentPage: currentPage,
    totalTransactions: totalFiltered,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages
  };

  // Calculate summary statistics from ALL transactions (not filtered)
  const summary = useMemo(() => {
    const stats = {
      totalDeposits: 0,
      totalWithdrawals: 0,
      rewardsCount: 0,
      netVolume: 0
    };
    
    allTransactions.forEach(tx => {
      const amount = parseFloat(tx.amountUSDT || tx.amount_in_pkr || tx.amount || 0);
      const type = (tx.transaction_type || tx.transactionType || tx.type || '').toLowerCase();
      const status = (tx.status || '').toLowerCase();
      const category = (tx.category || tx.transactionCategory || '').toLowerCase();
      const description = (tx.description || '').toLowerCase();
      
      // Count rewards
      if (type === 'reward' || 
          type === 'rewards' ||
          category.includes('reward') ||
          description.includes('reward')) {
        stats.rewardsCount++;
      }
      
      // Sum deposits and withdrawals (only completed)
      if (status === 'completed') {
        if (type === 'deposit') {
          stats.totalDeposits += amount;
          stats.netVolume += amount;
        } else if (type === 'withdrawal') {
          stats.totalWithdrawals += amount;
          stats.netVolume -= amount;
        }
      }
    });
    
    return stats;
  }, [allTransactions]);

  // Debug logging
  console.log('Transactions Data:', {
    raw: transactionsData,
    allTransactions: allTransactions.length,
    filteredTransactions: transactions.length,
    pagination: pagination,
    summary: summary
  });
  
  // Debug: Log sample transaction structure for search debugging
  if (allTransactions.length > 0 && filters.search) {
    const sample = allTransactions[0];
    console.log('🔍 Search Debug - Sample Transaction:', {
      searchTerm: filters.search,
      transactionId: sample.id || sample._id,
      displayCode: sample.displayCode || sample.display_code || sample.code,
      user: sample.user,
      user_name: sample.user_name,
      sender: sample.sender,
      from: sample.from,
      fullTransaction: sample
    });
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // No need to reset currentPage since we're using frontend filtering
  };


  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view transactions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader  />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Failed to load transactions</p>
          <p className="text-muted-foreground text-sm mb-2">{error.message}</p>
        </div>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Transactions Management</h2>
          <p className="text-muted-foreground">
            Monitor all financial transactions
            {allTransactions.length > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({allTransactions.length} {allTransactions.length === 1 ? 'transaction' : 'transactions'})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Deposits</p>
                    <p 
                      className="text-2xl font-bold text-card-foreground cursor-help"
                      title={formatFullPrice(summary.totalDeposits, '$')}
                    >
                      {formatExactPrice(summary.totalDeposits, '$')}
                    </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Withdrawals</p>
                    <p 
                      className="text-2xl font-bold text-card-foreground cursor-help"
                      title={formatFullPrice(summary.totalWithdrawals, '$')}
                    >
                      {formatExactPrice(summary.totalWithdrawals, '$')}
                    </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Rewards</p>
              <p className="text-2xl font-bold text-card-foreground">
                {summary.rewardsCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Net Volume</p>
                    <p 
                      className="text-2xl font-bold text-card-foreground cursor-help"
                      title={formatFullPrice(summary.netVolume, '$')}
                    >
                      {formatExactPrice(summary.netVolume, '$')}
                    </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <TransactionFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Tabs */}
      <TransactionTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rewardsCount={summary.rewardsCount}
      />

      {/* Transactions Table */}
      <TransactionTable
        transactions={transactions}
        pagination={pagination}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        backendFields={backendFields}
      />
    </div>
  );
};

export default TransactionsManagement;
