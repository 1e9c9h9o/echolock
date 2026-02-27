'use client'

import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface SparklineProps {
  /**
   * Array of percentage values (0-100) representing "time remaining at check-in"
   * for the last N cycles. Most recent is last.
   * Example: [45, 42, 38, 35, 30] = user checking in later and later
   */
  data: number[]
  /**
   * Height of the sparkline in pixels
   */
  height?: number
  /**
   * Show trend indicator
   */
  showTrend?: boolean
  className?: string
}

type TrendDirection = 'improving' | 'degrading' | 'stable'

/**
 * Calculate trend direction from data points
 */
function calculateTrend(data: number[]): TrendDirection {
  if (data.length < 2) return 'stable'

  // Compare first half average to second half average
  const midpoint = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, midpoint)
  const secondHalf = data.slice(midpoint)

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const diff = secondAvg - firstAvg

  // Need >5% change to be considered a trend
  if (diff > 5) return 'improving'  // Checking in earlier
  if (diff < -5) return 'degrading' // Checking in later
  return 'stable'
}

/**
 * High Performance HMI Sparkline
 *
 * Design principle: Current status tells us where we are;
 * history tells us where we are going.
 *
 * Shows trend of "time remaining at check-in" over last cycles.
 * If the trend slopes downward (checking in later and later),
 * flag as "degrading habit" even if current status is green.
 */
export default function Sparkline({
  data,
  height = 24,
  showTrend = true,
  className = '',
}: SparklineProps) {
  // Need at least 2 data points to show a line
  if (data.length < 2) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="flex-1 bg-blue-light flex items-center justify-center text-black/50 text-[11px] font-mono"
          style={{ height }}
        >
          No history yet
        </div>
      </div>
    )
  }

  const trend = calculateTrend(data)

  // Normalize data for SVG (0-100 → height)
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1 // Avoid division by zero

  // SVG dimensions
  const width = 80
  const padding = 2

  // Generate path points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2)
    // Invert Y (SVG 0,0 is top-left)
    const y = padding + ((max - value) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`

  // Line color based on trend
  const lineColor = trend === 'degrading' ? '#ef4444' : // red
                    trend === 'improving' ? '#10b981' : // green
                    '#5B8BB8' // blue-dark

  // Fill gradient
  const fillId = `sparkline-fill-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sparkline SVG */}
      <div className="flex-1">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={fillId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Fill area under line */}
          <path
            d={`${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
            fill={`url(#${fillId})`}
          />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current point marker */}
          <circle
            cx={padding + (width - padding * 2)}
            cy={padding + ((max - data[data.length - 1]) / range) * (height - padding * 2)}
            r="2"
            fill={lineColor}
          />
        </svg>
      </div>

      {/* Trend indicator */}
      {showTrend && (
        <div className="flex-shrink-0">
          {trend === 'degrading' && (
            <div className="flex items-center gap-1 text-red-600" title="Degrading check-in habit">
              <TrendingDown className="h-4 w-4" strokeWidth={2} />
            </div>
          )}
          {trend === 'improving' && (
            <div className="flex items-center gap-1 text-emerald-600" title="Improving check-in habit">
              <TrendingUp className="h-4 w-4" strokeWidth={2} />
            </div>
          )}
          {trend === 'stable' && (
            <div className="flex items-center gap-1 text-black/50" title="Stable check-in habit">
              <Minus className="h-4 w-4" strokeWidth={2} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Generate mock sparkline data for demo purposes
 * In production, this would come from check-in history
 */
export function generateMockSparklineData(pattern: 'stable' | 'degrading' | 'improving' = 'stable'): number[] {
  const base = 50
  switch (pattern) {
    case 'degrading':
      // Checking in later and later (less time remaining)
      return [65, 55, 48, 40, 32]
    case 'improving':
      // Checking in earlier (more time remaining)
      return [30, 38, 45, 52, 60]
    default:
      // Stable pattern
      return [48, 52, 50, 49, 51]
  }
}
