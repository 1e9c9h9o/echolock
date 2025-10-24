-- Migration: Add switch_reminders table
-- Purpose: Track which reminders have been sent for each switch
-- Date: 2025-10-24

CREATE TABLE IF NOT EXISTS switch_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
  threshold_hours INTEGER NOT NULL, -- Hours before expiry (24, 6, 1)
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure we only send one reminder per threshold per switch
  CONSTRAINT switch_reminders_unique UNIQUE (switch_id, threshold_hours)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_switch_reminders_switch_id ON switch_reminders(switch_id);
CREATE INDEX IF NOT EXISTS idx_switch_reminders_sent_at ON switch_reminders(sent_at DESC);

-- Comment
COMMENT ON TABLE switch_reminders IS 'Tracks which check-in reminders have been sent for each switch';
COMMENT ON COLUMN switch_reminders.threshold_hours IS 'Hours before expiry when reminder was sent (24, 6, or 1)';
