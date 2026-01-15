import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { Wallet, Search, Eye, Lock, Unlock, DollarSign } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import InputTwo from '../../../components/ui/InputTwo';
import { adminAPI, usersAPI } from '../../../services/api';
import { useAdminAuth } from '../../../components/admin/AdminAuth';
import { AdminRole } from '../../../utils/rbac';
import Loader from '../../../components/Loder';
import { cn } from '../../../utils/cn';
import { formatExactPrice } from '../../../utils/formatPrice';

const WalletsView = () => {
  const { isAuthenticated, adminUser } = useAdminAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'frozen', 'active'
  const [selectedWallet, setSelectedWallet] = useState(null);

  const role = adminUser?.role;
  const isReadOnly = role === AdminRole.AUDIT_MANAGER;
  const canFreeze = role === AdminRole.MLRO || role === AdminRole.COMPLIANCE_OFFICER;

  // Fetch all users first
  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['compliance-wallets-users'],
    () => adminAPI.getUsers({ limit: 1000 }),
    {
      enabled: isAuthenticated,
      retry: 1,
    }
  );

  const users = usersData?.data?.data?.users || 
               usersData?.data?.users || 
               usersData?.data || 
               (Array.isArray(usersData) ? usersData : []);

  // Fetch wallets for all users
  const { data: walletsData, isLoading: walletsLoading } = useQuery(
    ['compliance-wallets', users.length],
    async () => {
      if (!users || users.length === 0) return [];
      
      // Fetch wallet for each user
      const walletPromises = users.map(async (user) => {
        try {
          const userId = user.id || user.displayCode;
          const walletResponse = await adminAPI.getWalletByUserId(userId);
          const wallet = walletResponse?.data?.data || walletResponse?.data || null;
          
          return {
            ...wallet,
            userId: user.id,
            userDisplayCode: user.displayCode,
            userName: user.fullName || user.name,
            userEmail: user.email,
          };
        } catch (error) {
          console.error(`Error fetching wallet for user ${user.id}:`, error);
          return null;
        }
      });
      
      const wallets = await Promise.all(walletPromises);
      return wallets.filter(w => w !== null);
    },
    {
      enabled: isAuthenticated && users.length > 0,
      retry: 1,
    }
  );

  const wallets = walletsData || [];

  // Filter wallets
  const filteredWallets = useMemo(() => {
    return wallets.filter(wallet => {
      if (!wallet) return false;
      
      const matchesSearch = 
        (wallet.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wallet.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wallet.userDisplayCode || wallet.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (wallet.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'frozen' && wallet.isFrozen) ||
                           (statusFilter === 'active' && !wallet.isFrozen);
      
      return matchesSearch && matchesStatus;
    });
  }, [wallets, searchTerm, statusFilter]);

  const isLoading = usersLoading || walletsLoading;

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Please log in to view wallets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Wallets {isReadOnly && '(View Only)'}
          </h2>
          <p className="text-muted-foreground">
            User wallets and compliance status
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
                placeholder="Search by user name, email, or wallet ID..."
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
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Wallets Table */}
      <Card className="p-6">
        {isLoading ? (
          <Loader />
        ) : filteredWallets.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No wallets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Locked</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Total Deposited</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Total Withdrawn</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredWallets.map((wallet) => {
                  const balance = parseFloat(wallet.balanceUSDT || wallet.balance || 0);
                  const locked = parseFloat(wallet.lockedUSDT || wallet.locked || 0);
                  const totalDeposited = parseFloat(wallet.totalDepositedUSDT || wallet.totalDeposited || 0);
                  const totalWithdrawn = parseFloat(wallet.totalWithdrawnUSDT || wallet.totalWithdrawn || 0);
                  const isFrozen = wallet.isFrozen || false;
                  
                  return (
                    <tr key={wallet.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {wallet.userName || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {wallet.userEmail || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {wallet.userDisplayCode || wallet.userId}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatExactPrice(balance, '$')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatExactPrice(locked, '$')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatExactPrice(totalDeposited, '$')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatExactPrice(totalWithdrawn, '$')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isFrozen ? (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <Lock className="w-3 h-3 inline mr-1" />
                            Frozen
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWallet(wallet)}
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

      {/* Wallet Detail Modal */}
      {selectedWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Wallet Details
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWallet(null)}
              >
                Close
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Wallet ID</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedWallet.id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedWallet.userName || 'N/A'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{selectedWallet.userEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Balance</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1 font-semibold">
                    {formatExactPrice(parseFloat(selectedWallet.balanceUSDT || selectedWallet.balance || 0), '$')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Locked Amount</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatExactPrice(parseFloat(selectedWallet.lockedUSDT || selectedWallet.locked || 0), '$')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Deposited</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatExactPrice(parseFloat(selectedWallet.totalDepositedUSDT || selectedWallet.totalDeposited || 0), '$')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Withdrawn</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {formatExactPrice(parseFloat(selectedWallet.totalWithdrawnUSDT || selectedWallet.totalWithdrawn || 0), '$')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge className={cn(
                    (selectedWallet.isFrozen || false)
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                    "mt-1"
                  )}>
                    {(selectedWallet.isFrozen || false) ? (
                      <>
                        <Lock className="w-3 h-3 inline mr-1" />
                        Frozen
                      </>
                    ) : (
                      'Active'
                    )}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Created At</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedWallet.createdAt
                      ? new Date(selectedWallet.createdAt).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {(selectedWallet.isFrozen || false) && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900 dark:text-red-300">Wallet Frozen</span>
                  </div>
                  {selectedWallet.frozenReason && (
                    <p className="text-sm text-red-800 dark:text-red-400">Reason: {selectedWallet.frozenReason}</p>
                  )}
                  {selectedWallet.frozenAt && (
                    <p className="text-sm text-red-800 dark:text-red-400">
                      Frozen At: {new Date(selectedWallet.frozenAt).toLocaleString()}
                    </p>
                  )}
                  {selectedWallet.freezer && (
                    <p className="text-sm text-red-800 dark:text-red-400">
                      Frozen By: {selectedWallet.freezer?.fullName || selectedWallet.freezer?.email || 'N/A'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WalletsView;
