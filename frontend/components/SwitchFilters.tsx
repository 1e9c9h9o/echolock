'use client'

import { useState } from 'react'
import { Filter, X, Search } from 'lucide-react'
import Button from '@/components/ui/Button'

export type FilterStatus = 'all' | 'active' | 'expired' | 'cancelled'
export type SortBy = 'created' | 'nextCheckIn' | 'title' | 'status'
export type SortOrder = 'asc' | 'desc'

interface SwitchFiltersProps {
  onFilterChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
}

export interface FilterState {
  status: FilterStatus
  searchQuery: string
  sortBy: SortBy
  sortOrder: SortOrder
  dateRange?: {
    from?: Date
    to?: Date
  }
}

export default function SwitchFilters({
  onFilterChange,
  totalCount,
  filteredCount,
}: SwitchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    searchQuery: '',
    sortBy: 'created',
    sortOrder: 'desc',
  })

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      status: 'all',
      searchQuery: '',
      sortBy: 'created',
      sortOrder: 'desc',
    }
    setFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.searchQuery !== '' ||
    filters.sortBy !== 'created' ||
    filters.sortOrder !== 'desc'

  return (
    <div className="mb-8">
      {/* Search bar and filter toggle */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="Search switches..."
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            className="w-full pl-12 pr-4 py-3 border-2 border-black bg-white dark:bg-gray-900 dark:border-white dark:text-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
          />
        </div>

        <Button
          variant={isExpanded ? 'primary' : 'secondary'}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter className="h-5 w-5 mr-2" strokeWidth={2} />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-red text-white text-xs font-bold rounded-full">
              !
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="secondary" onClick={resetFilters}>
            <X className="h-5 w-5 mr-2" strokeWidth={2} />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-900 border-2 border-black dark:border-white p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status filter */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3 font-sans">
                Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                <FilterButton
                  active={filters.status === 'all'}
                  onClick={() => updateFilters({ status: 'all' })}
                >
                  All ({totalCount})
                </FilterButton>
                <FilterButton
                  active={filters.status === 'active'}
                  onClick={() => updateFilters({ status: 'active' })}
                >
                  Active
                </FilterButton>
                <FilterButton
                  active={filters.status === 'expired'}
                  onClick={() => updateFilters({ status: 'expired' })}
                >
                  Expired
                </FilterButton>
                <FilterButton
                  active={filters.status === 'cancelled'}
                  onClick={() => updateFilters({ status: 'cancelled' })}
                >
                  Cancelled
                </FilterButton>
              </div>
            </div>

            {/* Sort by */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3 font-sans">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilters({ sortBy: e.target.value as SortBy })}
                className="w-full px-4 py-2 border-2 border-black dark:border-white bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue text-base font-mono"
              >
                <option value="created">Created Date</option>
                <option value="nextCheckIn">Next Check-In</option>
                <option value="title">Title</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider mb-3 font-sans">
                Order
              </label>
              <div className="grid grid-cols-2 gap-2">
                <FilterButton
                  active={filters.sortOrder === 'desc'}
                  onClick={() => updateFilters({ sortOrder: 'desc' })}
                >
                  Newest First
                </FilterButton>
                <FilterButton
                  active={filters.sortOrder === 'asc'}
                  onClick={() => updateFilters({ sortOrder: 'asc' })}
                >
                  Oldest First
                </FilterButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mt-4 font-mono text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredCount} of {totalCount} switches
        {hasActiveFilters && ' (filtered)'}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 border-2 border-black dark:border-white text-sm font-mono font-bold transition-all ${
        active
          ? 'bg-blue text-cream shadow-[4px_4px_0px_0px_rgba(33,33,33,1)]'
          : 'bg-white dark:bg-gray-900 dark:text-white hover:shadow-[2px_2px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-0.5 hover:-translate-y-0.5'
      }`}
    >
      {children}
    </button>
  )
}
