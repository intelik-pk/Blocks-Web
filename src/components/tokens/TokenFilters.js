import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import InputTwo from '../ui/InputTwo';

const TokenFilters = ({ filters, onFilterChange }) => {
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
    filters.sort_by !== 'name' || filters.sort_order !== 'asc'
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    onFilterChange('search', '');
    onFilterChange('sort_by', 'name');
    onFilterChange('sort_order', 'asc');
  };

  const sortOptions = [
    { value: 'name', label: 'Token Name' },
    { value: 'totalTokens', label: 'Total Tokens' },
    { value: 'boughtTokens', label: 'Bought Tokens' }
  ];

  const orderOptions = [
    { value: 'desc', label: 'Descending ↓' },
    { value: 'asc', label: 'Ascending ↑' }
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

      {/* Unified Filter System */}
      <div className="relative w-full space-y-4" ref={filterPanelRef}>
        {/* Top Row: Search + Single Filters Button */}
        <div className="flex gap-4">
          {/* Search Input - Takes most space */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-1">
              Search Tokens
            </label>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <InputTwo
                type="text"
                name="search"
                placeholder="Search by name, code..."
                value={filters.search || ''}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sort By Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-orange-600 rounded-full"></span>
                  Sort By
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => {
                    const isActive = filters.sort_by === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onFilterChange('sort_by', option.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium",
                          isActive
                            ? "bg-orange-600 text-white border-orange-600 shadow-md"
                            : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-orange-50 dark:hover:bg-slate-700"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort Order Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span className="w-1 h-4 bg-pink-600 rounded-full"></span>
                  Sort Order
                </h4>
                <div className="flex flex-wrap gap-2">
                  {orderOptions.map((option) => {
                    const isActive = filters.sort_order === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onFilterChange('sort_order', option.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 text-xs font-medium",
                          isActive
                            ? "bg-pink-600 text-white border-pink-600 shadow-md"
                            : "bg-white/60 dark:bg-slate-800/60 text-card-foreground border-slate-300 dark:border-slate-700 hover:bg-pink-50 dark:hover:bg-slate-700"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
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
            
            {/* Sort chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium shadow-sm">
              <span>{filters.sort_by === 'name' ? 'Name' : 
                        filters.sort_by === 'totalTokens' ? 'Total Tokens' : 'Bought Tokens'}</span>
              <span>{filters.sort_order === 'desc' ? '↓' : '↑'}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TokenFilters;
