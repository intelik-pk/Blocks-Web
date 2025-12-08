import React from 'react';
import { Calendar, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';

const TransactionRow = ({ transaction, backendFields = {} }) => {
  // Backend-aware field mapping
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

  // Format date: DD MMM YYYY • HH:mm
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} ${year} • ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  // Format amount as string with comma separators (USD 1,234.56)
  const formatAmountString = (amount, currency = 'USD') => {
    const num = parseFloat(amount || 0);
    const absNum = Math.abs(num);
    
    // Format with commas for thousands
    const formatNumber = (value) => {
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };
    
    let formatted;
    if (absNum >= 1000000000) {
      formatted = `${currency} ${formatNumber(absNum / 1000000000)}B`;
    } else if (absNum >= 1000000) {
      formatted = `${currency} ${formatNumber(absNum / 1000000)}M`;
    } else if (absNum >= 1000) {
      formatted = `${currency} ${formatNumber(absNum / 1000)}K`;
    } else {
      formatted = `${currency} ${formatNumber(absNum)}`;
    }
    return formatted;
  };

  // Format amount with color
  const formatAmount = (amount, currency = 'USD') => {
    const num = parseFloat(amount || 0);
    const isPositive = num >= 0;
    const formatted = formatAmountString(amount, currency);

    return (
      <span className={cn(
        "font-semibold",
        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {isPositive ? '+' : ''}{formatted}
      </span>
    );
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { variant: 'warning', text: 'Pending', icon: Clock },
      'completed': { variant: 'success', text: 'Completed', icon: CheckCircle },
      'failed': { variant: 'danger', text: 'Failed', icon: XCircle },
      'cancelled': { variant: 'default', text: 'Cancelled', icon: XCircle }
    };
    return statusMap[status?.toLowerCase()] || { variant: 'default', text: status || 'Unknown', icon: Clock };
  };

  // Extract data (backend-aware with priority mapping)
  
  // Transaction Date: createdAt → created_at → date → timestamp
  const transactionDate = getField(transaction, 'createdAt', 'created_at', 'date', 'timestamp');
  
  // Display Code: displayCode → display_code → code → transactionCode
  const displayCode = getField(transaction, 'displayCode', 'display_code', 'code', 'transactionCode');
  
  // Transaction Type: transactionType → transaction_type → type → method
  const transactionType = getField(transaction, 'transactionType', 'transaction_type', 'type', 'method');
  
  // FROM: sender → from → user → buyer → email → "-"
  // Priority order: sender → from → user (object or string) → buyer → email
  const fromUser = getField(
    transaction,
    'sender',
    'from',
    'user', // Could be object or string
    'buyer',
    'user?.email',
    'user?.fullName',
    'user?.name',
    'user_name',
    'email'
  );
  
  // Handle user object if it's an object
  let fromUserDisplay = fromUser;
  if (fromUser && typeof fromUser === 'object') {
    fromUserDisplay = fromUser.fullName || fromUser.name || fromUser.email || fromUser.username || 'User';
  }
  
  // TO: receiver → to → seller → email → "-"
  // Priority order: receiver → to → seller → email
  const toUser = getField(
    transaction,
    'receiver',
    'to',
    'seller',
    'recipient',
    'user?.email',
    'user?.fullName',
    'user?.name',
    'email'
  );
  
  // Handle user object if it's an object
  let toUserDisplay = toUser;
  if (toUser && typeof toUser === 'object') {
    toUserDisplay = toUser.fullName || toUser.name || toUser.email || toUser.username || 'User';
  }
  
  // Status: status
  const status = getField(transaction, 'status');
  
  // Amount: amount → amountUSDT → amount_in_pkr → amount_in_usdt
  const amount = getField(transaction, 'amount', 'amountUSDT', 'amount_in_pkr', 'amount_in_usdt');
  
  // END BALANCE: balanceAfter → endingBalance → walletBalance → balance → finalBalance
  const endBalance = getField(
    transaction,
    'balanceAfter',
    'endingBalance',
    'walletBalance',
    'balance',
    'finalBalance',
    'balance_after'
  );
  
  const currency = getField(transaction, 'currency') || 'USD';

  const statusInfo = getStatusBadge(status);
  const StatusIcon = statusInfo.icon;

  return (
    <tr className="hover:bg-accent/50 transition-colors duration-200 border-b border-border/30">
      {/* Transaction Date - Only render if backend provides date field */}
      {backendFields.hasDate !== false && (
        <td className="px-4 py-4 whitespace-nowrap">
          {transactionDate ? (
            <div className="flex items-center text-sm text-foreground">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <span>{formatDate(transactionDate)}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          )}
        </td>
      )}

      {/* Display Code - Only render if backend provides displayCode field */}
      {backendFields.hasDisplayCode !== false && (
        <td className="px-4 py-4 whitespace-nowrap">
          {displayCode ? (
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded border border-blue-200 dark:border-blue-800">
              {displayCode}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Transaction Type - Only render if backend provides type field */}
      {backendFields.hasTransactionType !== false && (
        <td className="px-4 py-4 whitespace-nowrap">
          {transactionType ? (
            <span className="text-sm text-foreground capitalize">
              {transactionType}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* From → To - Only render if backend provides from/to fields */}
      {backendFields.hasFromTo !== false && (
        <td className="px-4 py-4">
          {(fromUserDisplay || toUserDisplay) ? (
            <div className="flex items-center text-sm">
              <span className="text-foreground truncate max-w-[120px]">
                {fromUserDisplay || 'System'}
              </span>
              <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground truncate max-w-[120px]">
                {toUserDisplay || 'System'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Status - Only render if backend provides status field */}
      {backendFields.hasStatus !== false && (
        <td className="px-4 py-4 whitespace-nowrap">
          {status ? (
            <Badge variant={statusInfo.variant} className="flex items-center text-xs px-2 py-1">
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusInfo.text}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Amount - Only render if backend provides amount field */}
      {backendFields.hasAmount !== false && (
        <td className="px-4 py-4 whitespace-nowrap">
          {amount !== null ? formatAmount(amount, currency) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* End Balance - Only render if backend provides balance field */}
      {backendFields.hasEndBalance !== false && (
        <td className="px-4 py-4 whitespace-nowrap">
          {endBalance !== null ? (
            <span className={cn(
              "text-sm font-medium",
              parseFloat(endBalance) >= 0 
                ? "text-green-600 dark:text-green-400" 
                : "text-red-600 dark:text-red-400"
            )}>
              {formatAmountString(endBalance, currency)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      )}
    </tr>
  );
};

export default TransactionRow;

