'use client'

import { useState, useRef, useEffect } from 'react'

interface ExplainerProps {
  /** The simple, surface-level text everyone sees */
  children: React.ReactNode
  /** The deeper explanation for curious users */
  detail: React.ReactNode
  /** Optional: additional context or "why this matters" */
  why?: React.ReactNode
}

/**
 * Hypertext-style expandable explanations.
 *
 * Shows simple text by default. Users can tap/click to reveal
 * deeper understanding - like Genius annotations, Wikipedia links,
 * or DFW footnotes.
 *
 * The knowledge is there for those who want it, invisible to those who don't.
 */
export default function Explainer({ children, detail, why }: ExplainerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<'above' | 'below'>('below')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Determine if panel should appear above or below based on viewport position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      // If less than 200px below, show above
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        setPosition('above')
      } else {
        setPosition('below')
      }
    }
  }, [isOpen])

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <span className="relative inline">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline underline decoration-dotted decoration-1 underline-offset-4
          cursor-help transition-colors
          ${isOpen
            ? 'text-blue decoration-blue'
            : 'text-inherit decoration-black/40 hover:decoration-blue hover:text-blue'
          }
        `}
        aria-expanded={isOpen}
      >
        {children}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className={`
            absolute left-0 z-50 w-72 sm:w-80
            bg-cream border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,0.2)]
            animate-in fade-in slide-in-from-top-2 duration-150
            ${position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}
        >
          {/* The explanation */}
          <div className="p-4">
            <div className="text-sm leading-relaxed text-black/80">
              {detail}
            </div>

            {why && (
              <div className="mt-3 pt-3 border-t border-black/10">
                <div className="text-xs uppercase tracking-wider text-black/50 mb-1 font-bold">
                  Why this matters
                </div>
                <div className="text-sm leading-relaxed text-black/70">
                  {why}
                </div>
              </div>
            )}
          </div>

          {/* Close hint */}
          <div className="px-4 py-2 bg-black/5 border-t border-black/10 text-xs text-black/50 text-center">
            tap anywhere to close
          </div>
        </div>
      )}
    </span>
  )
}
