import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { BarChart3, Search, Eye, DollarSign } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { adminAPI } from '../../../services/api';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';
import { formatExactPrice } from '../../../utils/formatPrice';

const TransactionsView = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const role = adminUser?.role;
  const isReadOnly = role === AdminRole.AUDIT_MANAGER;

  // Fetch all transactions
  const { data: transactionsData, isLoading } = useQuery(
    ['compliance-transactions-view'],
    () => adminAPI.getTransactions({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: 1,
    }
  );

  const allTransactions = transactionsData?.data?.data?.transactions || 
                          transactionsData?.data?.transactions || 
                          transactionsData?.data || 
                          (Array.isArray(transactionsData) ? transactionsData : []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      const matchesSearch = 
        (tx.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.displayCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.type || tx.transaction_type || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const txType = tx.type || tx.transaction_type || 'unknown';
      const matchesType = typeFilter === 'all' || txType === typeFilter;
      
      const txStatus = tx.status || 'completed';
      const matchesStatus = statusFilter === 'all' || txStatus === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [allTransactions, searchTerm, typeFilter, statusFilter]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view transactions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Transactions {isReadOnly && '(View Only)'}
          </h2>
          <p className="text-muted-foreground">
            All platform transactions
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
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="investment">Investment</option>
              <option value="reward">Reward</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTransactions.map((tx) => {
                  const txType = tx.type || tx.transaction_type || 'unknown';
                  const amount = parseFloat(tx.amountUSDT || tx.amount_in_pkr || tx.amount || 0);
                  const status = tx.status || 'completed';
                  const date = tx.createdAt || tx.date || tx.created_at;
                  
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                        {date ? new Date(date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {txType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatExactPrice(amount, '$')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={cn(
                          status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          {status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                        {tx.displayCode || tx.id?.slice(0, 8) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransaction(tx)}
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Transaction Details
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction ID</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedTransaction.id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Code</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedTransaction.displayCode || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 mt-1">
                    {selectedTransaction.type || selectedTransaction.transaction_type || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge className={cn(
                    (selectedTransaction.status || 'completed') === 'completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : (selectedTransaction.status || 'completed') === 'pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                    "mt-1"
                  )}>
                    {selectedTransaction.status || 'completed'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatExactPrice(parseFloat(selectedTransaction.amountUSDT || selectedTransaction.amount_in_pkr || selectedTransaction.amount || 0), '$')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedTransaction.createdAt || selectedTransaction.date || selectedTransaction.created_at
                      ? new Date(selectedTransaction.createdAt || selectedTransaction.date || selectedTransaction.created_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TransactionsView;
