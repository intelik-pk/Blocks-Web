import React from 'react';
import { cn } from '../../utils/cn';

const TransactionTabs = ({ activeTab, onTabChange, rewardsCount = 0 }) => {
  const tabs = [
    { id: 'all', label: 'All Transactions' },
    { id: 'invested', label: 'Money Invested' },
    { id: 'received', label: 'Money Received' },
    { id: 'topup', label: 'Top Up' },
    { id: 'rewards', label: 'Rewards' }
  ];

  return (
    <div className="mb-6">
      <div className="flex space-x-1 border-b border-border/40 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative px-6 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap",
              "focus:outline-none focus:ring-0",
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={cn(
                  "ml-2 px-2 py-0.5 text-xs font-semibold rounded-full",
                  activeTab === tab.id
                    ? "bg-primary/20 text-primary"
                    : "bg-red-500/20 text-red-600 dark:text-red-400"
                )}>
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TransactionTabs;

