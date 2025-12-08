import React, { useState } from 'react';
import { DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';
import TransactionRow from './TransactionRow';
import { cn } from '../../utils/cn';

const TransactionTable = ({ transactions, pagination, currentPage, onPageChange, backendFields = {} }) => {
  const [pageInput, setPageInput] = useState('');
  
  // Calculate column count for colspan
  const columnCount = [
    backendFields.hasDate !== false,
    backendFields.hasDisplayCode !== false,
    backendFields.hasTransactionType !== false,
    backendFields.hasFromTo !== false,
    backendFields.hasStatus !== false,
    backendFields.hasAmount !== false,
    backendFields.hasEndBalance !== false
  ].filter(Boolean).length || 7; // Default to 7 if backendFields not provided

  // Calculate page numbers to display (max 10 pages)
  const getPageNumbers = () => {
    const totalPages = pagination.totalPages;
    const current = currentPage;
    const maxPages = 10;
    
    if (totalPages <= maxPages) {
      // Show all pages if total is less than max
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Calculate start and end page numbers
    let startPage = Math.max(1, current - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    if (pageInput) {
      const page = parseInt(pageInput, 10);
      if (page >= 1 && page <= pagination.totalPages) {
        onPageChange(page);
        setPageInput('');
      }
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-border/50 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 backdrop-blur-sm border-b border-border/50">
            <tr>
              {backendFields.hasDate !== false && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Transaction Date
                </th>
              )}
              {backendFields.hasDisplayCode !== false && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Display Code
                </th>
              )}
              {backendFields.hasTransactionType !== false && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Transaction Type
                </th>
              )}
              {backendFields.hasFromTo !== false && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  From → To
                </th>
              )}
              {backendFields.hasStatus !== false && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              )}
              {backendFields.hasAmount !== false && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
              )}
              {backendFields.hasEndBalance !== false && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  End Balance
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-card/50 divide-y divide-border/30">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground">No transactions found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Transactions will appear here once users make deposits or withdrawals
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <TransactionRow 
                  key={transaction.id || transaction._id || Math.random()} 
                  transaction={transaction}
                  backendFields={backendFields}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - Always show if there are multiple pages or more than 20 items */}
      {pagination && (pagination.totalPages > 1 || pagination.totalTransactions > 20) && (
        <div className="bg-card/50 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-t border-border/50 sm:px-6">
          {/* Mobile: Simple Previous/Next */}
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={!pagination.hasPrev}
              className="px-4 py-2 text-sm font-medium text-foreground bg-background/50 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(currentPage + 1, pagination.totalPages))}
              disabled={!pagination.hasNext}
              className="px-4 py-2 text-sm font-medium text-foreground bg-background/50 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/50"
            >
              Next
            </button>
          </div>
          
          {/* Desktop: Full pagination with page numbers, prev/next, and jump input */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between gap-4">
            {/* Left: Results count */}
            <div className="flex-shrink-0">
              <p className="text-sm text-foreground whitespace-nowrap">
                Showing{' '}
                <span className="font-medium">
                  {pagination.totalTransactions === 0 ? 0 : ((currentPage - 1) * 20) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * 20, pagination.totalTransactions)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalTransactions}</span>{' '}
                results
              </p>
            </div>
            
            {/* Center: Page numbers with Previous/Next buttons */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2 flex-1 justify-center">
                {/* Previous Button */}
                <button
                  onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                  disabled={!pagination.hasPrev}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    pagination.hasPrev
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page Numbers (max 10) */}
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {/* Show first page and ellipsis if needed */}
                  {pageNumbers[0] > 1 && (
                    <>
                      <button
                        onClick={() => onPageChange(1)}
                        className={cn(
                          "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                          "bg-background/50 border-border text-foreground hover:bg-accent/50"
                        )}
                      >
                        1
                      </button>
                      {pageNumbers[0] > 2 && (
                        <span className="relative inline-flex items-center px-3 py-2 border border-border bg-background/50 text-sm text-muted-foreground">
                          ...
                        </span>
                      )}
                    </>
                  )}
                  
                  {/* Page number buttons */}
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={cn(
                        "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                        page === currentPage
                          ? "z-10 bg-primary/20 border-primary text-primary font-semibold"
                          : "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      )}
                    >
                      {page}
                    </button>
                  ))}
                  
                  {/* Show last page and ellipsis if needed */}
                  {pageNumbers[pageNumbers.length - 1] < pagination.totalPages && (
                    <>
                      {pageNumbers[pageNumbers.length - 1] < pagination.totalPages - 1 && (
                        <span className="relative inline-flex items-center px-3 py-2 border border-border bg-background/50 text-sm text-muted-foreground">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => onPageChange(pagination.totalPages)}
                        className={cn(
                          "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                          pagination.totalPages === currentPage
                            ? "z-10 bg-primary/20 border-primary text-primary font-semibold"
                            : "bg-background/50 border-border text-foreground hover:bg-accent/50"
                        )}
                      >
                        {pagination.totalPages}
                      </button>
                    </>
                  )}
                </nav>
                
                {/* Next Button */}
                <button
                  onClick={() => onPageChange(Math.min(currentPage + 1, pagination.totalPages))}
                  disabled={!pagination.hasNext}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    pagination.hasNext
                      ? "bg-background/50 border-border text-foreground hover:bg-accent/50"
                      : "bg-background/30 border-border/50 text-muted-foreground"
                  )}
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Right: Jump to page input */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Go to:</span>
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={pageInput}
                    onChange={handlePageInputChange}
                    placeholder={currentPage.toString()}
                    className="w-16 px-2 py-1 text-sm text-center border border-border rounded bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    maxLength={4}
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 text-sm font-medium bg-primary/20 text-primary border border-primary/50 rounded hover:bg-primary/30 transition-colors"
                    title="Jump to page"
                  >
                    Go
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TransactionTable;

