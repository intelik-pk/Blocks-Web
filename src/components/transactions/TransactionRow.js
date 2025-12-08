import React from 'react';
import { Calendar, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';
import { formatExactPrice, formatFullPrice } from '../../utils/formatPrice';

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

  // Format amount with color - using exact price with 2 decimals
  const formatAmount = (amount, currency = 'USD') => {
    const num = parseFloat(amount || 0);
    const isPositive = num >= 0;
    const formatted = formatExactPrice(Math.abs(num), currency);

    return (
      <span 
        className={cn(
          "font-semibold cursor-help",
          isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}
        title={formatFullPrice(Math.abs(num), currency)}
      >
        {isPositive ? '+' : '-'}{formatted}
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
  const transactionTypeLower = transactionType ? String(transactionType).toLowerCase() : '';
  const isInvestment = transactionTypeLower === 'investment' || 
                       transactionTypeLower === 'invested' || 
                       transactionTypeLower === 'invest' ||
                       transactionTypeLower.includes('investment');
  const isReward = transactionTypeLower === 'reward' || 
                   transactionTypeLower === 'rewards' ||
                   transactionTypeLower.includes('reward');
  const showPropertyName = isInvestment || isReward; // Show property name for both investment and rewards
  
  // Property Name: Extract from various possible field structures
  let propertyName = null;
  
  // Try to get property object first
  const propertyObj = getField(
    transaction,
    'property',
    'propertyData',
    'investmentProperty',
    'propertyInfo'
  );
  
  // If property is an object, extract name from it
  if (propertyObj && typeof propertyObj === 'object' && propertyObj !== null && !Array.isArray(propertyObj)) {
    propertyName = propertyObj.title || 
                   propertyObj.name || 
                   propertyObj.propertyName ||
                   propertyObj.property_name ||
                   propertyObj.displayCode ||
                   propertyObj.display_code ||
                   propertyObj.propertyTitle ||
                   propertyObj.property_title;
  }
  
  // If no property name found from object, try direct fields
  if (!propertyName) {
    propertyName = getField(
      transaction,
      'property?.title',
      'property?.name',
      'property?.propertyName',
      'property?.displayCode',
      'property_title',
      'propertyName',
      'propertyTitle',
      'property_name',
      'investmentPropertyName',
      'investment_property_name',
      'propertyDisplayCode',
      'property_display_code',
      'propertyId', // Sometimes propertyId might contain the name
      'property_id'
    );
  }
  
  // Convert to string if it's not null/undefined, and clean it up
  let propertyNameStr = null;
  if (propertyName) {
    propertyNameStr = String(propertyName).trim();
    // If it's empty after trimming, set to null
    if (propertyNameStr === '') {
      propertyNameStr = null;
    }
  }
  
  // Debug logging for investment/rewards transactions to help identify property field structure
  if (showPropertyName && !propertyNameStr) {
    console.log(`🔍 ${isInvestment ? 'Investment' : 'Reward'} Transaction - Property Name Not Found:`, {
      transactionId: transaction.id || transaction._id,
      transactionType: transactionType,
      propertyObj: propertyObj,
      propertyFields: {
        property: transaction.property,
        property_title: transaction.property_title,
        propertyName: transaction.propertyName,
        propertyTitle: transaction.propertyTitle,
        property_name: transaction.property_name
      },
      fullTransaction: transaction
    });
  }
  
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
  
  // For investment/rewards transactions: show username → property name
  // For rewards: show property name → investor name (reversed)
  // For other transactions: show fromUser → toUser
  let fromDisplay, toDisplay;
  if (showPropertyName) {
    if (isReward) {
      // Rewards: Property Name → Investor Name (reversed order)
      fromDisplay = propertyNameStr || 'Property';
      toDisplay = fromUserDisplay || 'Investor';
    } else {
      // Investment: Username → Property Name
      fromDisplay = fromUserDisplay || 'Investor';
      toDisplay = propertyNameStr || 'Property';
    }
  } else {
    // Regular transaction: From → To
    fromDisplay = fromUserDisplay || 'System';
    toDisplay = toUserDisplay || 'System';
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
          {(fromDisplay || toDisplay) ? (
            <div className="flex items-center text-sm">
              <span className="text-foreground truncate max-w-[120px]" title={fromDisplay}>
                {fromDisplay}
              </span>
              <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground truncate max-w-[120px]" title={toDisplay}>
                {toDisplay}
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
              <span 
                className="cursor-help"
                title={formatFullPrice(endBalance, currency)}
              >
                {formatExactPrice(endBalance, currency)}
              </span>
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

