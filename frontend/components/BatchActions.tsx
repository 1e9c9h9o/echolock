'use client'

import { useState } from 'react'
import { Trash2, Download, CheckSquare, Square, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { exportSelectedSwitches } from '@/lib/export'
import { showToast } from '@/components/ui/ToastContainer'

interface BatchActionsProps {
  selectedIds: string[]
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDeleteSelected: (ids: string[]) => Promise<void>
  switches: any[] // Switch data for export
}

export default function BatchActions({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  switches,
}: BatchActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selectedCount = selectedIds.length
  const allSelected = selectedCount === totalCount && totalCount > 0

  const handleExport = (format: 'csv' | 'pdf') => {
    try {
      exportSelectedSwitches(switches, selectedIds, format)
      showToast(`Exported ${selectedCount} switches as ${format.toUpperCase()}`, 'success')
    } catch (error: any) {
      showToast(error.message || 'Export failed', 'error')
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDeleteSelected(selectedIds)
      setShowDeleteConfirm(false)
      showToast(`Deleted ${selectedCount} switches`, 'success')
    } catch (error: any) {
      showToast(error.message || 'Delete failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <>
      {/* Action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue text-cream border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] p-4 z-40 min-w-[600px]">
        <div className="flex items-center justify-between gap-4">
          {/* Selection info */}
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold">
              {selectedCount} selected
            </span>
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-cream hover:text-red transition-colors font-mono text-sm underline"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Export CSV */}
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-white text-black border-2 border-black font-mono font-bold hover:shadow-[2px_2px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              title="Export as CSV"
            >
              <Download className="h-4 w-4 inline mr-2" strokeWidth={2} />
              CSV
            </button>

            {/* Export PDF */}
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-white text-black border-2 border-black font-mono font-bold hover:shadow-[2px_2px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              title="Export as PDF"
            >
              <Download className="h-4 w-4 inline mr-2" strokeWidth={2} />
              PDF
            </button>

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red text-cream border-2 border-black font-mono font-bold hover:shadow-[2px_2px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <Trash2 className="h-4 w-4 inline mr-2" strokeWidth={2} />
              Delete
            </button>

            {/* Close */}
            <button
              onClick={onDeselectAll}
              className="px-3 py-2 text-cream hover:text-red transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border-2 border-black dark:border-white p-8 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(33,33,33,1)]">
            <h2 className="text-2xl font-bold mb-4">Confirm Deletion</h2>
            <p className="font-mono text-base mb-6">
              Are you sure you want to delete {selectedCount} switch{selectedCount > 1 ? 'es' : ''}?
              This action cannot be undone.
            </p>

            <div className="bg-red text-cream p-4 border-2 border-black mb-6">
              <p className="font-mono text-sm font-bold">⚠️ WARNING</p>
              <p className="font-mono text-sm mt-2">
                All associated data, recipients, and check-in history will be permanently deleted.
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Checkbox component for switch selection
 */
export function SelectionCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
      className="p-1 hover:bg-blue hover:bg-opacity-10 rounded transition-colors"
      aria-label={checked ? 'Deselect' : 'Select'}
    >
      {checked ? (
        <CheckSquare className="h-6 w-6 text-blue" strokeWidth={2} />
      ) : (
        <Square className="h-6 w-6 text-gray-400" strokeWidth={2} />
      )}
    </button>
  )
}
