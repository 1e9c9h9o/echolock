/**
 * Keyboard Shortcuts Hook
 * Provides global keyboard shortcuts for quick actions
 */

import { useEffect, useCallback, useRef } from 'react'

export interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  action: () => void
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  shortcuts: Shortcut[]
}

/**
 * Hook to register keyboard shortcuts
 */
export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const activeShortcuts = shortcutsRef.current

      for (const shortcut of activeShortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatches = shortcut.alt ? event.altKey : !event.altKey
        const metaMatches = shortcut.meta ? event.metaKey : true

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          if (shortcut.preventDefault) {
            event.preventDefault()
          }
          shortcut.action()
          break
        }
      }
    },
    [enabled]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

/**
 * Common shortcuts for the dashboard
 */
export const DASHBOARD_SHORTCUTS: Record<string, Omit<Shortcut, 'action'>> = {
  CREATE_SWITCH: {
    key: 'c',
    description: 'Create new switch',
    preventDefault: true,
  },
  DEMO_MODE: {
    key: 'd',
    description: 'Open demo mode',
    preventDefault: true,
  },
  SEARCH: {
    key: '/',
    description: 'Focus search/filter',
    preventDefault: true,
  },
  HELP: {
    key: '?',
    shift: true,
    description: 'Show keyboard shortcuts',
    preventDefault: true,
  },
  REFRESH: {
    key: 'r',
    description: 'Refresh switch list',
    preventDefault: true,
  },
  SELECT_ALL: {
    key: 'a',
    ctrl: true,
    description: 'Select all switches',
    preventDefault: true,
  },
  DESELECT_ALL: {
    key: 'Escape',
    description: 'Deselect all switches',
    preventDefault: false,
  },
  EXPORT: {
    key: 'e',
    ctrl: true,
    description: 'Export switches',
    preventDefault: true,
  },
  TOGGLE_THEME: {
    key: 't',
    ctrl: true,
    description: 'Toggle dark mode',
    preventDefault: true,
  },
  SETTINGS: {
    key: ',',
    ctrl: true,
    description: 'Open settings',
    preventDefault: true,
  },
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = []

  if (shortcut.ctrl || shortcut.meta) parts.push('Ctrl')
  if (shortcut.shift) parts.push('Shift')
  if (shortcut.alt) parts.push('Alt')
  parts.push(shortcut.key.toUpperCase())

  return parts.join(' + ')
}
