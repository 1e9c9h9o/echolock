'use client'

import { useState } from 'react'
import { X, Keyboard } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { DASHBOARD_SHORTCUTS, formatShortcut } from '@/hooks/useKeyboardShortcuts'

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue text-cream border-2 border-black shadow-[8px_8px_0px_0px_rgba(33,33,33,1)] hover:shadow-[4px_4px_0px_0px_rgba(33,33,33,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all z-50"
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="h-6 w-6" strokeWidth={2} />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Keyboard className="h-8 w-8" strokeWidth={2} />
            <h2 className="text-3xl font-bold">KEYBOARD SHORTCUTS</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-black hover:text-red transition-colors"
          >
            <X className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Navigation shortcuts */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue">NAVIGATION</h3>
            <div className="space-y-3">
              <ShortcutRow
                shortcut="C"
                description="Create new switch"
              />
              <ShortcutRow
                shortcut="D"
                description="Open demo mode"
              />
              <ShortcutRow
                shortcut="Ctrl + ,"
                description="Open settings"
              />
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue">ACTIONS</h3>
            <div className="space-y-3">
              <ShortcutRow
                shortcut="R"
                description="Refresh switch list"
              />
              <ShortcutRow
                shortcut="/"
                description="Focus search/filter"
              />
              <ShortcutRow
                shortcut="Ctrl + E"
                description="Export switches"
              />
              <ShortcutRow
                shortcut="Ctrl + A"
                description="Select all switches"
              />
              <ShortcutRow
                shortcut="Esc"
                description="Deselect all / Close dialogs"
              />
            </div>
          </div>

          {/* Appearance */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue">APPEARANCE</h3>
            <div className="space-y-3">
              <ShortcutRow
                shortcut="Ctrl + T"
                description="Toggle dark mode"
              />
            </div>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-blue">HELP</h3>
            <div className="space-y-3">
              <ShortcutRow
                shortcut="?"
                description="Show this help dialog"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t-2 border-black">
          <p className="font-mono text-sm text-gray-600">
            💡 Tip: Shortcuts work anywhere except when typing in input fields
          </p>
        </div>
      </Card>
    </div>
  )
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-cream border-2 border-black">
      <span className="font-mono text-sm">{description}</span>
      <kbd className="px-3 py-1 bg-white border-2 border-black font-mono text-sm font-bold">
        {shortcut}
      </kbd>
    </div>
  )
}
