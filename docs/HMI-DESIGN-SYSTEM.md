# High Performance HMI Design System

**Date**: January 30, 2026
**Version**: 1.0.0
**Status**: Implemented

---

## Overview

EchoLock implements a **High Performance Human-Machine Interface (HMI)** design system based on principles from the "High Performance HMI Handbook" used in industrial control systems. These principles optimize for **cognitive ergonomics** and **high situational awareness** - critical for a dead man's switch application where users must quickly assess system state and take action when necessary.

---

## Design Principles

### 1. Mute-Structural, Loud-Alert Color Palette

**Principle**: The majority of the interface uses muted, low-contrast colors (slate/gray). Color is reserved exclusively for status indicators, ensuring alerts immediately capture attention.

**Implementation**:
- **Structural elements**: `slate-50`, `slate-100`, `slate-200` backgrounds
- **Text**: `slate-600`, `slate-700`, `slate-900`
- **Borders**: `slate-200`, `slate-300`
- **Status colors** (only when alerting):
  - Safe: `emerald-500` (green)
  - Warning: `amber-500` (amber/yellow)
  - Critical: `red-500` (red)

**Why**: In a control room with 100 monitors, the ONE flashing red screen immediately draws attention. If everything is colorful, nothing stands out.

```tsx
// Structural (muted)
<div className="bg-slate-50 border border-slate-200">
  <h2 className="text-slate-900">Dashboard</h2>
  <p className="text-slate-600">Subtitle</p>
</div>

// Alert (colored - only for status)
<StatusBadge status="ARMED" urgency="critical" />  // Red
<StatusBadge status="ARMED" urgency="warning" />   // Amber
<StatusBadge status="ARMED" urgency="safe" />      // Green
```

---

### 2. Analog Over Digital (Pattern Recognition)

**Principle**: Humans excel at recognizing spatial patterns (position of a needle) faster than reading numbers. Use analog representations where possible.

**Implementation**: The `AnalogGauge` component shows time remaining as a position on a linear gauge with color-coded zones.

```
[RED ZONE][AMBER ZONE][        GREEN ZONE          ]
    ▲
 Marker position = time remaining
```

**Benefits**:
- Scannable in <1 second (vs. reading "4h 23m 17s")
- Consistent representation across all switches
- Pattern recognition triggers faster cognitive response

**Component**: `frontend/components/AnalogGauge.tsx`

```tsx
<AnalogGauge
  targetDate="2026-01-31T12:00:00Z"
  interval={72}        // Total check-in interval in hours
  showDigital={true}   // Optional: show exact time as secondary info
/>
```

---

### 3. Redundant Coding for Accessibility

**Principle**: Every status has BOTH a color AND a shape, so users can determine urgency in grayscale or with color blindness.

**Shape Coding**:
| Status | Shape | Color | Rationale |
|--------|-------|-------|-----------|
| Safe | Circle | Green | Smooth, no edges = calm |
| Warning | Triangle | Amber | Pointed = attention needed |
| Critical | Octagon | Red | Stop sign = immediate action |
| Inactive | Square | Gray | Neutral, static |

**Implementation**: All status components include both shape and color:

```tsx
// StatusBadge with redundant coding
<StatusBadge status="ARMED" expiresAt={expiresAt} checkInHours={72} />

// Renders as:
// Safe:     [●] ACTIVE      (circle, green)
// Warning:  [▲] WARNING     (triangle, amber)
// Critical: [⬡] CRITICAL    (octagon, red)
```

**Component**: `frontend/components/ui/StatusBadge.tsx`

---

### 4. Sparklines for Behavior Trends

**Principle**: Current status tells you where you ARE; history tells you where you're GOING. A user with green status but degrading check-in habits needs different attention than one with stable habits.

**Implementation**: The `Sparkline` component shows check-in behavior over the last 5 cycles.

```
Degrading (checking in later and later):
[     ↘___]  📉

Improving (checking in earlier):
[___↗     ]  📈

Stable:
[  ═══    ]  ➖
```

**Component**: `frontend/components/Sparkline.tsx`

```tsx
<Sparkline
  data={[65, 55, 48, 40, 32]}  // % time remaining at each check-in
  height={24}
  showTrend={true}
/>
```

**Trend Calculation**:
- Compares first-half average to second-half average
- >5% improvement: "improving" (green trend arrow)
- >5% degradation: "degrading" (red trend arrow)
- Otherwise: "stable" (gray minus)

---

### 5. Level 1 System Health Header

**Principle**: Users should verify system safety in under 1 second by looking at a single header. This provides aggregate status across ALL switches.

**Implementation**: The `SystemHealthHeader` component aggregates health across all switches:

```
┌──────────────────────────────────────────────────────┐
│ [●] ALL SYSTEMS NOMINAL                    ● 3      │
│     3 switches monitored                            │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ [▲] ATTENTION REQUIRED              ▲ 1    ● 2      │
│     1 switch approaching deadline                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ [⬡] IMMEDIATE ACTION REQUIRED   ⬡ 1  ▲ 1    ● 1    │
│     1 switch critical                               │
└──────────────────────────────────────────────────────┘
```

**Behavior**:
- Gray when all OK (no cognitive load)
- Amber only when warnings exist
- Red only when critical exists
- Quick counts always visible for situational awareness

**Component**: `frontend/components/SystemHealthHeader.tsx`

```tsx
<SystemHealthHeader switches={switches} />
```

---

### 6. Animation Only for Unacknowledged Alerts

**Principle**: Animation captures attention but creates anxiety if permanent. Use pulsing only when a NEW critical status appears, and stop once the user acknowledges.

**Implementation**: The `CheckInButton` component pulses only when:
1. Status is critical (not warning, not safe)
2. User has NOT acknowledged (hasn't hovered or interacted)
3. Not currently loading or showing success

```tsx
// Pulse conditions
const shouldPulse = urgency === 'critical' && !acknowledged && !loading && !success

// Acknowledge on hover (user has noticed)
const handleMouseEnter = () => {
  if (urgency === 'critical' || urgency === 'warning') {
    setAcknowledged(true)  // Stops animation
  }
}
```

**Escalation Reset**: If urgency escalates (safe → warning, or warning → critical), the acknowledged state resets so animation plays again for the NEW alert level.

**Component**: `frontend/components/CheckInButton.tsx`

---

## Component Reference

### SystemHealthHeader

Aggregate status header for dashboard-level situational awareness.

```tsx
import SystemHealthHeader from '@/components/SystemHealthHeader'

interface Switch {
  id: string
  status: string
  expiresAt: string
  checkInHours: number
}

<SystemHealthHeader switches={switches} />
```

**Health Calculation**:
- Critical: `hoursRemaining <= 0` OR `percentRemaining < 10%`
- Warning: `percentRemaining < 25%`
- OK: All other armed switches

---

### AnalogGauge

Linear gauge visualization for time remaining.

```tsx
import AnalogGauge from '@/components/AnalogGauge'

<AnalogGauge
  targetDate="2026-01-31T12:00:00Z"  // ISO timestamp
  interval={72}                       // Check-in interval in hours
  showDigital={true}                  // Show exact time below gauge
  className=""                        // Optional additional classes
/>
```

**Visual Zones**:
- 0-10%: Red zone (critical)
- 10-25%: Amber zone (warning)
- 25-100%: Green zone (safe)

---

### Sparkline

SVG-based trend visualization for check-in behavior.

```tsx
import Sparkline, { generateMockSparklineData } from '@/components/Sparkline'

<Sparkline
  data={[65, 55, 48, 40, 32]}  // Array of % values (0-100)
  height={24}                  // Height in pixels
  showTrend={true}             // Show trend indicator icon
  className=""                 // Optional additional classes
/>

// For demo/testing
const mockData = generateMockSparklineData('degrading')  // 'stable' | 'degrading' | 'improving'
```

---

### StatusBadge

Status indicator with redundant shape+color coding.

```tsx
import StatusBadge from '@/components/ui/StatusBadge'

<StatusBadge
  status="ARMED"              // 'ARMED' | 'ACTIVE' | 'PAUSED' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED'
  expiresAt="2026-01-31T12:00:00Z"  // For dynamic urgency calculation
  checkInHours={72}                  // Total interval for % calculation
/>
```

**Urgency Mapping**:
| Condition | Urgency | Shape | Color |
|-----------|---------|-------|-------|
| >25% remaining | safe | Circle | Emerald |
| 10-25% remaining | warning | Triangle | Amber |
| <10% remaining | critical | Octagon | Red |
| Expired/past | critical | Octagon | Red |

---

### CheckInButton

Primary action button with urgency-aware styling and animation.

```tsx
import CheckInButton from '@/components/CheckInButton'

<CheckInButton
  targetDate="2026-01-31T12:00:00Z"
  status="ARMED"
  onCheckIn={async () => { /* check-in logic */ }}
  checkInHours={72}
  className=""
/>
```

**States**:
- Normal: Slate background, muted styling
- Warning: Amber background when urgency is warning
- Critical: Red background, pulse animation (until acknowledged)
- Loading: Spinner, disabled
- Success: Green checkmark, briefly shown after check-in
- Disabled: Grayed out for expired/cancelled switches

---

## Color Palette Reference

### Structural (Muted)
```css
/* Backgrounds */
bg-slate-50   /* Page background */
bg-slate-100  /* Card backgrounds */
bg-white      /* Elevated cards */

/* Borders */
border-slate-200  /* Default borders */
border-slate-300  /* Emphasized borders */

/* Text */
text-slate-900  /* Headings */
text-slate-700  /* Body text */
text-slate-600  /* Secondary text */
text-slate-500  /* Muted text */
text-slate-400  /* Placeholder/disabled */
```

### Status (Alert Colors)
```css
/* Safe */
bg-emerald-100    /* Light background */
border-emerald-500
text-emerald-700
fill-emerald-500  /* Icon fill */

/* Warning */
bg-amber-100
border-amber-500
text-amber-700
fill-amber-500

/* Critical */
bg-red-100
border-red-500
text-red-700
fill-red-500

/* Inactive/Neutral */
bg-slate-100
border-slate-300
text-slate-500
```

---

## Accessibility Compliance

### WCAG 2.1 AA Requirements Met

1. **Color Independence**: All status indicators have shape coding in addition to color
2. **Contrast Ratios**: All text meets 4.5:1 minimum contrast
3. **Focus Indicators**: All interactive elements have visible focus states
4. **Screen Reader Support**: ARIA labels describe status including shape meaning

### Shape-Based Status for Color Blindness

Users with color vision deficiency can identify status by shape alone:
- **Circle**: All is well, no action needed
- **Triangle**: Attention required, deadline approaching
- **Octagon**: Stop sign - immediate action required

---

## Implementation Checklist

- [x] SystemHealthHeader - Level 1 aggregate status
- [x] AnalogGauge - Position-based time visualization
- [x] Sparkline - Behavior trend visualization
- [x] StatusBadge - Redundant shape+color coding
- [x] CheckInButton - Animation only for unacknowledged alerts
- [x] Dashboard page - Full HMI redesign
- [x] Create switch page - Muted structural styling
- [x] Switch details page - Consistent HMI elements
- [x] Settings page - Consistent styling

---

## References

- High Performance HMI Handbook (ASM Consortium)
- ISA-101.01: Human Machine Interfaces for Process Automation Systems
- EEMUA 201: Process Plant Control Desks and Workstations

---

## Changelog

### v1.0.0 (January 30, 2026)
- Initial implementation of HMI design system
- Created SystemHealthHeader, AnalogGauge, Sparkline components
- Updated StatusBadge with redundant shape coding
- Updated CheckInButton with acknowledgment-based animation
- Applied HMI principles to all switch-related pages
- Documentation created

---

**Maintained by**: EchoLock Development Team
**Last Updated**: January 30, 2026
