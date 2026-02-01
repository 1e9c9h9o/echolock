/**
 * Migration: Add guardian health tracking tables
 *
 * Enables proactive monitoring of guardian availability and health.
 *
 * Tables added:
 * 1. guardian_health_history - Historical health snapshots for timeline visualization
 * 2. guardian_alert_settings - User preferences for health alerts
 * 3. guardian_alerts_sent - Track sent alerts to avoid duplicates
 *
 * @see CLAUDE.md - Guardian Network health monitoring
 */

export async function up(client) {
  console.log('Running migration: 009_add_guardian_health_tracking');

  // Create guardian_health_history table
  await client.query(`
    CREATE TABLE IF NOT EXISTS guardian_health_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
      guardian_npub VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL,
      last_heartbeat TIMESTAMP WITH TIME ZONE,
      relay_count INTEGER DEFAULT 0,
      recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  console.log('Created guardian_health_history table');

  // Create index for efficient timeline queries
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_guardian_health_switch_guardian
    ON guardian_health_history (switch_id, guardian_npub, recorded_at DESC)
  `);

  // Create index for cleanup queries
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_guardian_health_recorded_at
    ON guardian_health_history (recorded_at)
  `);

  console.log('Created guardian_health_history indexes');

  // Create guardian_alert_settings table
  await client.query(`
    CREATE TABLE IF NOT EXISTS guardian_alert_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alert_on_warning BOOLEAN DEFAULT TRUE,
      alert_on_critical BOOLEAN DEFAULT TRUE,
      alert_hours_before_critical INTEGER DEFAULT 24,
      email_alerts BOOLEAN DEFAULT TRUE,
      webhook_url VARCHAR(500),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);

  console.log('Created guardian_alert_settings table');

  // Create guardian_alerts_sent table
  await client.query(`
    CREATE TABLE IF NOT EXISTS guardian_alerts_sent (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
      guardian_npub VARCHAR(64) NOT NULL,
      alert_type VARCHAR(20) NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      acknowledged_at TIMESTAMP WITH TIME ZONE
    )
  `);

  console.log('Created guardian_alerts_sent table');

  // Create index for checking if alert already sent
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_guardian_alerts_switch
    ON guardian_alerts_sent (switch_id, guardian_npub, alert_type)
  `);

  // Create index for finding unacknowledged alerts
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_guardian_alerts_unacked
    ON guardian_alerts_sent (switch_id)
    WHERE acknowledged_at IS NULL
  `);

  console.log('Created guardian_alerts_sent indexes');

  // Add check constraint for valid status values
  await client.query(`
    ALTER TABLE guardian_health_history
    ADD CONSTRAINT chk_guardian_health_status
    CHECK (status IN ('healthy', 'warning', 'critical', 'unknown'))
  `);

  // Add check constraint for valid alert type values
  await client.query(`
    ALTER TABLE guardian_alerts_sent
    ADD CONSTRAINT chk_guardian_alert_type
    CHECK (alert_type IN ('warning', 'critical', 'approaching_critical', 'recovered'))
  `);

  console.log('Added check constraints');

  console.log('Migration 009 complete: Added guardian health tracking tables');
}

export async function down(client) {
  console.log('Rolling back migration: 009_add_guardian_health_tracking');

  // Drop constraints first
  await client.query(`
    ALTER TABLE guardian_health_history
    DROP CONSTRAINT IF EXISTS chk_guardian_health_status
  `);

  await client.query(`
    ALTER TABLE guardian_alerts_sent
    DROP CONSTRAINT IF EXISTS chk_guardian_alert_type
  `);

  // Drop indexes
  await client.query(`DROP INDEX IF EXISTS idx_guardian_health_switch_guardian`);
  await client.query(`DROP INDEX IF EXISTS idx_guardian_health_recorded_at`);
  await client.query(`DROP INDEX IF EXISTS idx_guardian_alerts_switch`);
  await client.query(`DROP INDEX IF EXISTS idx_guardian_alerts_unacked`);

  // Drop tables
  await client.query(`DROP TABLE IF EXISTS guardian_alerts_sent`);
  await client.query(`DROP TABLE IF EXISTS guardian_alert_settings`);
  await client.query(`DROP TABLE IF EXISTS guardian_health_history`);

  console.log('Rollback 009 complete');
}
