import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  Eye, 
  FileText,
  Download,
  Building2,
  User,
  Calendar,
  CheckCircle,
  Filter,
  X,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  FileX
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import InputTwo from '../../components/ui/InputTwo';
import { adminAPI } from '../../services/api';
import { useAdminAuth } from '../../components/admin/AdminAuth';
import Loader from '../../components/Loder';
import { cn } from '../../utils/cn';

const CertificatesManagement = () => {
  const { isAuthenticated } = useAdminAuth();
  
  const [filters, setFilters] = useState({
    search: '',
    type: [], // 'ownership', 'transaction'
    property: [],
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch investments (for ownership certificates)
  const { data: investmentsData, isLoading: investmentsLoading } = useQuery(
    ['admin-investments'],
    async () => {
      const response = await adminAPI.getInvestments({ limit: 1000 });
      return response;
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Fetch transactions (for transaction certificates)
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery(
    ['admin-transactions'],
    async () => {
      const response = await adminAPI.getTransactions({ limit: 1000 });
      return response;
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  // Fetch marketplace trades (for marketplace certificates)
  const { data: marketplaceData, isLoading: marketplaceLoading } = useQuery(
    ['admin-marketplace-trades'],
    async () => {
      const response = await adminAPI.getMarketplaceTrades?.({ limit: 1000 }) || { data: { trades: [] } };
      return response;
    },
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: isAuthenticated
    }
  );

  const investments = investmentsData?.data?.data?.investments || 
                     investmentsData?.data?.investments || 
                     investmentsData?.data || 
                     (Array.isArray(investmentsData) ? investmentsData : []);

  const transactions = transactionsData?.data?.data?.transactions || 
                      transactionsData?.data?.transactions || 
                      transactionsData?.data || 
                      (Array.isArray(transactionsData) ? transactionsData : []);

  const marketplaceTrades = marketplaceData?.data?.data?.trades || 
                           marketplaceData?.data?.trades || 
                           marketplaceData?.data || 
                           (Array.isArray(marketplaceData) ? marketplaceData : []);

  // Combine all certificates
  const allCertificates = useMemo(() => {
    const certs = [];

    // Ownership certificates from investments
    investments.forEach(inv => {
      if (inv.certificatePath) {
        certs.push({
          id: inv.id,
          type: 'ownership',
          displayCode: inv.displayCode,
          userId: inv.userId,
          userName: inv.user?.fullName || inv.user?.email || 'Unknown',
          propertyId: inv.propertyId,
          propertyTitle: inv.property?.title || inv.property_title || 'Unknown Property',
          tokens: inv.tokensPurchased || 0,
          certificatePath: inv.certificatePath,
          createdAt: inv.createdAt || inv.created_at,
          source: 'direct', // Direct purchase
        });
      }
    });

    // Transaction certificates from transactions (marketplace sales)
    transactions.forEach(txn => {
      if (txn.certificatePath && (txn.type === 'marketplace_sell' || txn.metadata?.isSellerCertificate)) {
        certs.push({
          id: txn.id,
          type: 'transaction',
          displayCode: txn.displayCode,
          userId: txn.userId,
          userName: txn.user?.fullName || txn.user?.email || 'Unknown',
          propertyId: txn.propertyId,
          propertyTitle: txn.property?.title || txn.property_title || 'Unknown Property',
          amount: txn.amountUSDT || 0,
          certificatePath: txn.certificatePath,
          createdAt: txn.createdAt || txn.created_at,
          source: 'marketplace_sale',
        });
      }
    });

    // Marketplace trade certificates
    marketplaceTrades.forEach(trade => {
      if (trade.certificatePath) {
        // Buyer's ownership certificate
        certs.push({
          id: trade.id,
          type: 'ownership',
          displayCode: trade.displayCode,
          userId: trade.buyerId,
          userName: trade.buyer?.fullName || trade.buyer?.email || 'Unknown',
          propertyId: trade.propertyId,
          propertyTitle: trade.property?.title || 'Unknown Property',
          tokens: trade.tokensBought || 0,
          certificatePath: trade.certificatePath,
          createdAt: trade.createdAt || trade.created_at,
          source: 'marketplace_purchase',
        });
      }
    });

    return certs;
  }, [investments, transactions, marketplaceTrades]);

  // Filter certificates
  const filteredCertificates = useMemo(() => {
    let filtered = [...allCertificates];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(cert =>
        cert.displayCode?.toLowerCase().includes(searchLower) ||
        cert.userName?.toLowerCase().includes(searchLower) ||
        cert.propertyTitle?.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filters.type.length > 0) {
      filtered = filtered.filter(cert => filters.type.includes(cert.type));
    }

    // Property filter
    if (filters.property.length > 0) {
      filtered = filtered.filter(cert => 
        filters.property.includes(cert.propertyTitle)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[filters.sort_by] || a.createdAt;
      const bVal = b[filters.sort_by] || b.createdAt;
      
      if (filters.sort_order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [allCertificates, filters]);

  // Pagination
  const paginatedCertificates = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCertificates.slice(start, start + itemsPerPage);
  }, [filteredCertificates, currentPage]);

  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);

  const isLoading = investmentsLoading || transactionsLoading || marketplaceLoading;

  const getCertificateTypeBadge = (type) => {
    if (type === 'ownership') {
      return <Badge variant="success" className="flex items-center gap-1"><FileCheck size={12} /> Ownership</Badge>;
    }
    return <Badge variant="warning" className="flex items-center gap-1"><FileX size={12} /> Transaction</Badge>;
  };

  const getSourceBadge = (source) => {
    if (source === 'direct') {
      return <Badge variant="info">Direct Purchase</Badge>;
    } else if (source === 'marketplace_purchase') {
      return <Badge variant="info">Marketplace Purchase</Badge>;
    } else if (source === 'marketplace_sale') {
      return <Badge variant="warning">Marketplace Sale</Badge>;
    }
    return null;
  };

  const handleViewCertificate = (certificatePath) => {
    if (certificatePath) {
      window.open(certificatePath, '_blank');
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Certificates Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage all ownership and transaction certificates
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Certificates</p>
              <p className="text-2xl font-bold text-foreground">{allCertificates.length}</p>
            </div>
            <FileText className="w-8 h-8 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ownership Certificates</p>
              <p className="text-2xl font-bold text-foreground">
                {allCertificates.filter(c => c.type === 'ownership').length}
              </p>
            </div>
            <FileCheck className="w-8 h-8 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Transaction Certificates</p>
              <p className="text-2xl font-bold text-foreground">
                {allCertificates.filter(c => c.type === 'transaction').length}
              </p>
            </div>
            <FileX className="w-8 h-8 text-warning" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Filtered Results</p>
              <p className="text-2xl font-bold text-foreground">{filteredCertificates.length}</p>
            </div>
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <InputTwo
              placeholder="Search by code, user, or property..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              icon={Search}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setFilters({ ...filters, type: [] })}
              className={filters.type.length === 0 ? '' : 'opacity-50'}
            >
              All Types
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilters({ ...filters, type: ['ownership'] })}
              className={filters.type.includes('ownership') ? 'bg-primary text-white' : ''}
            >
              Ownership
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilters({ ...filters, type: ['transaction'] })}
              className={filters.type.includes('transaction') ? 'bg-primary text-white' : ''}
            >
              Transaction
            </Button>
          </div>
        </div>
      </Card>

      {/* Certificates Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-sm font-semibold text-foreground">Type</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Code</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">User</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Property</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Source</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Date</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCertificates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-muted-foreground">
                    No certificates found
                  </td>
                </tr>
              ) : (
                paginatedCertificates.map((cert) => (
                  <tr key={cert.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-4">{getCertificateTypeBadge(cert.type)}</td>
                    <td className="p-4 text-sm font-mono">{cert.displayCode}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-muted-foreground" />
                        <span className="text-sm">{cert.userName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-muted-foreground" />
                        <span className="text-sm">{cert.propertyTitle}</span>
                      </div>
                    </td>
                    <td className="p-4">{getSourceBadge(cert.source)}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCertificate(cert.certificatePath)}
                        className="flex items-center gap-2"
                      >
                        <Eye size={16} />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCertificates.length)} of {filteredCertificates.length} certificates
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CertificatesManagement;

