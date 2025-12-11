import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import InputTwo from '../ui/InputTwo';

const NotificationFilters = ({ filters, onFilterChange, onMarkAllRead }) => {
  const [openFilterPanel, setOpenFilterPanel] = useState(null);
  const filterPanelRef = useRef(null);

  // Handle click outside to close filter panels
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setOpenFilterPanel(null);
      }
    };

    if (openFilterPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openFilterPanel]);

  // Count active filters
  const activeFiltersCount = [
    filters.search,
    ...(Array.isArray(filters.category) ? filters.category : []),
    ...(Array.isArray(filters.status) ? filters.status : []),
    filters.date
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange('search', '');
    onFilterChange('category', []);
    onFilterChange('status', []);
    onFilterChange('date', '');
  };

  // Toggle multi-select filter value (for category and status)
  const toggleMultiFilter = (filterKey, value) => {
    const currentArray = Array.isArray(filters[filterKey]) ? filters[filterKey] : [];
    const isSelected = currentArray.includes(value);
    
    if (isSelected) {
      // Remove from array
      onFilterChange(filterKey, currentArray.filter(v => v !== value));
    } else {
      // Add to array
      onFilterChange(filterKey, [...currentArray, value]);
    }
  };

  const categoryOptions = [
    { value: 'Properties', label: 'Properties' },
    { value: 'Property Detail', label: 'Property Detail' },
    { value: 'Portfolio', label: 'Portfolio' },
    { value: 'Wallet', label: 'Wallet' },
    { value: 'Notifications', label: 'Notifications' },
    { value: 'Custom', label: 'Custom' }
  ];

  const statusOptions = [
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' }
  ];

  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'older', label: 'Older' }
  ];

  return (
    <Card variant="primary" className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-card-foreground">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="info" className="ml-2">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onMarkAllRead && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onMarkAllRead}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <span className="text-xs">Mark All Read</span>
            </Button>
          )}
          {activeFiltersCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </div>

      {/* Unified Filter System */}
      <div className="relative w-full space-y-4" ref={filterPanelRef}>
        {/* Top Row: Search + Single Filters Button */}
        <div className="flex gap-4">
          {/* Search Input - Takes most space */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">
              Search Notifications
            </label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <InputTwo
                type="text"
                name="search"
                placeholder="Search notifications..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          {/* Single Unified Filters Button */}
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-foreground mb-1">
              Filters
            </label>
            <button
              type="button"
              onClick={() => setOpenFilterPanel(prev => prev === 'main' ? null : 'main')}
              className={cn(
                "px-5 py-2 border rounded-lg bg-card text-card-foreground flex items-center gap-2 transition-all hover:border-primary/50 min-w-[120px]",
                openFilterPanel === 'main' || activeFiltersCount > 0
                  ? 'border-primary bg-accent font-semibold' 
                  : 'border-input'
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
              <span className={cn(
                "transition-transform duration-200",
                openFilterPanel === 'main' ? "rotate-180" : ""
              )}>▼</span>
            </button>
          </div>
        </div>

        {/* Expanded Filter Panel - Opens below in empty space */}
        {openFilterPanel === 'main' && (
          <div className="w-full rounded-xl p-6 bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-700/50 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                  Category
                  {Array.isArray(filters.category) && filters.category.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                      {filters.category.length} selected
                    </span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((option) => {
                    const isActive = Array.isArray(filters.category) && filters.category.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleMultiFilter('category', option.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium flex items-center gap-1.5",
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700"
                            : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700"
                        )}
                      >
                        {isActive && <span className="text-xs">✓</span>}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {Array.isArray(filters.category) && filters.category.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onFilterChange('category', [])}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear category filters
                  </button>
                )}
              </div>

              {/* Status Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-green-600 rounded-full"></span>
                  Status
                  {Array.isArray(filters.status) && filters.status.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium">
                      {filters.status.length} selected
                    </span>
                  )}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => {
                    const isActive = Array.isArray(filters.status) && filters.status.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleMultiFilter('status', option.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium flex items-center gap-1.5",
                          isActive
                            ? "bg-green-600 text-white border-green-600 shadow-md hover:bg-green-700"
                            : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-700"
                        )}
                      >
                        {isActive && <span className="text-xs">✓</span>}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {Array.isArray(filters.status) && filters.status.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onFilterChange('status', [])}
                    className="text-xs text-green-600 dark:text-green-400 hover:underline"
                  >
                    Clear status filters
                  </button>
                )}
              </div>

              {/* Date Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-orange-600 rounded-full"></span>
                  Date
                  {filters.date && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium">
                      Selected
                    </span>
                  )}
                </h4>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    value={filters.date}
                    onChange={(e) => onFilterChange('date', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white/60 dark:bg-slate-800/60 text-card-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
                  >
                    <option value="">All Dates</option>
                    {dateOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {filters.date && (
                  <button
                    type="button"
                    onClick={() => onFilterChange('date', '')}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Clear date filter
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Chips Bar - Always visible when filters applied */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search chip */}
            {filters.search && (
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
                onClick={() => onFilterChange('search', '')}
              >
                <span>Search: "{filters.search}"</span>
                <X className="w-3 h-3" />
              </div>
            )}
            
            {/* Category chips (multi-select) */}
            {Array.isArray(filters.category) && filters.category.length > 0 && filters.category.map((category) => (
              <div 
                key={category}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                onClick={() => toggleMultiFilter('category', category)}
              >
                <span>Category: {category}</span>
                <X className="w-3 h-3" />
              </div>
            ))}
            
            {/* Status chips (multi-select) */}
            {Array.isArray(filters.status) && filters.status.length > 0 && filters.status.map((status) => (
              <div 
                key={status}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm"
                onClick={() => toggleMultiFilter('status', status)}
              >
                <span>Status: {status}</span>
                <X className="w-3 h-3" />
              </div>
            ))}
            
            {/* Date chip */}
            {filters.date && (
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-medium cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors shadow-sm"
                onClick={() => onFilterChange('date', '')}
              >
                <span>Date: {dateOptions.find(opt => opt.value === filters.date)?.label || filters.date}</span>
                <X className="w-3 h-3" />
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default NotificationFilters;

