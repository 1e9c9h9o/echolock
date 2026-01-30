/**
 * Migration: Add v2 features - Cascade Messages, Recipient Groups, Emergency Contacts, Redundancy
 *
 * Features added:
 * 1. recipient_groups - Group recipients for cascade messages
 * 2. cascade_messages - Time-delayed message releases
 * 3. emergency_contacts - Pre-trigger notification contacts
 * 4. emergency_alerts - Alert tracking and acknowledgment
 * 5. redundancy_checks - Infrastructure health monitoring
 * 6. legal_documents - Generated legal document tracking
 *
 * Also modifies recipients table to add:
 * - group_id - Link to recipient groups
 * - custom_message - Per-recipient message customization
 * - read_at - Read receipt tracking
 * - tracking_token - Unique token for tracking pixel
 */

export async function up(client) {
  console.log('Running migration: 007_add_features_v2');

  // 1. Create recipient_groups table
  await client.query(`
    CREATE TABLE IF NOT EXISTS recipient_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_recipient_groups_user_id
    ON recipient_groups (user_id)
  `);

  console.log('Created recipient_groups table');

  // 2. Add columns to recipients table
  await client.query(`
    ALTER TABLE recipients
    ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES recipient_groups(id) ON DELETE SET NULL
  `);

  await client.query(`
    ALTER TABLE recipients
    ADD COLUMN IF NOT EXISTS custom_message TEXT
  `);

  await client.query(`
    ALTER TABLE recipients
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE
  `);

  await client.query(`
    ALTER TABLE recipients
    ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64) UNIQUE
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_recipients_group_id
    ON recipients (group_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_recipients_tracking_token
    ON recipients (tracking_token)
    WHERE tracking_token IS NOT NULL
  `);

  console.log('Added columns to recipients table');

  // 3. Create cascade_messages table
  await client.query(`
    CREATE TABLE IF NOT EXISTS cascade_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
      delay_hours INTEGER NOT NULL DEFAULT 0,
      recipient_group_id UUID REFERENCES recipient_groups(id) ON DELETE SET NULL,
      encrypted_message_ciphertext TEXT NOT NULL,
      encrypted_message_iv VARCHAR(255) NOT NULL,
      encrypted_message_auth_tag VARCHAR(255) NOT NULL,
      fragment_metadata JSONB,
      nostr_event_id VARCHAR(64),
      status VARCHAR(50) DEFAULT 'PENDING',
      released_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      sort_order INTEGER DEFAULT 0
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cascade_messages_switch_id
    ON cascade_messages (switch_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cascade_messages_status
    ON cascade_messages (status)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cascade_messages_delay
    ON cascade_messages (delay_hours)
  `);

  console.log('Created cascade_messages table');

  // 4. Create emergency_contacts table
  await client.query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      alert_threshold_hours INTEGER DEFAULT 12,
      escalation_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      last_notified_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id
    ON emergency_contacts (user_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active
    ON emergency_contacts (user_id, is_active)
    WHERE is_active = TRUE
  `);

  console.log('Created emergency_contacts table');

  // 5. Create emergency_alerts table
  await client.query(`
    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
      contact_id UUID NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
      alert_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      ack_token VARCHAR(64) UNIQUE,
      sent_at TIMESTAMP WITH TIME ZONE,
      acknowledged_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_emergency_alerts_switch_id
    ON emergency_alerts (switch_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status
    ON emergency_alerts (status)
    WHERE status = 'PENDING'
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_emergency_alerts_ack_token
    ON emergency_alerts (ack_token)
    WHERE ack_token IS NOT NULL
  `);

  console.log('Created emergency_alerts table');

  // 6. Create redundancy_checks table
  await client.query(`
    CREATE TABLE IF NOT EXISTS redundancy_checks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      switch_id UUID REFERENCES switches(id) ON DELETE CASCADE,
      check_type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      details JSONB,
      checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_redundancy_checks_switch_id
    ON redundancy_checks (switch_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_redundancy_checks_type
    ON redundancy_checks (check_type, checked_at DESC)
  `);

  console.log('Created redundancy_checks table');

  // 7. Create legal_documents table
  await client.query(`
    CREATE TABLE IF NOT EXISTS legal_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      switch_id UUID REFERENCES switches(id) ON DELETE SET NULL,
      template_id VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      fields JSONB,
      pdf_data BYTEA,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_legal_documents_user_id
    ON legal_documents (user_id)
  `);

  console.log('Created legal_documents table');

  // 8. Create proof_documents table for health check proofs
  await client.query(`
    CREATE TABLE IF NOT EXISTS proof_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
      health_data JSONB NOT NULL,
      pdf_data BYTEA,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_proof_documents_switch_id
    ON proof_documents (switch_id)
  `);

  console.log('Created proof_documents table');

  // Add trigger for updated_at on new tables
  await client.query(`
    CREATE TRIGGER update_recipient_groups_updated_at
    BEFORE UPDATE ON recipient_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  await client.query(`
    CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  console.log('Migration 007 complete: Added v2 features tables');
}

export async function down(client) {
  console.log('Rolling back migration: 007_add_features_v2');

  // Drop triggers first
  await client.query(`DROP TRIGGER IF EXISTS update_recipient_groups_updated_at ON recipient_groups`);
  await client.query(`DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON emergency_contacts`);

  // Drop tables in reverse order
  await client.query(`DROP TABLE IF EXISTS proof_documents`);
  await client.query(`DROP TABLE IF EXISTS legal_documents`);
  await client.query(`DROP TABLE IF EXISTS redundancy_checks`);
  await client.query(`DROP TABLE IF EXISTS emergency_alerts`);
  await client.query(`DROP TABLE IF EXISTS emergency_contacts`);
  await client.query(`DROP TABLE IF EXISTS cascade_messages`);

  // Remove columns from recipients (careful with order)
  await client.query(`ALTER TABLE recipients DROP COLUMN IF EXISTS tracking_token`);
  await client.query(`ALTER TABLE recipients DROP COLUMN IF EXISTS read_at`);
  await client.query(`ALTER TABLE recipients DROP COLUMN IF EXISTS custom_message`);
  await client.query(`ALTER TABLE recipients DROP COLUMN IF EXISTS group_id`);

  // Drop recipient_groups last (due to FK constraint)
  await client.query(`DROP TABLE IF EXISTS recipient_groups`);

  console.log('Rollback 007 complete');
}
