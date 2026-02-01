-- Migration 005: Add release_tokens table for recipient message viewing
-- This table stores tokens that allow recipients to view released messages via web link

CREATE TABLE IF NOT EXISTS release_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    switch_id UUID NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    message_content TEXT,
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    switch_title VARCHAR(255),
    released_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_release_tokens_token ON release_tokens(token);

-- Index for finding tokens by switch
CREATE INDEX IF NOT EXISTS idx_release_tokens_switch_id ON release_tokens(switch_id);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_release_tokens_expires_at ON release_tokens(expires_at);

COMMENT ON TABLE release_tokens IS 'Tokens for recipients to view released messages via web link';
COMMENT ON COLUMN release_tokens.token IS 'Unique token included in recipient email link';
COMMENT ON COLUMN release_tokens.message_content IS 'Decrypted message content for display';
COMMENT ON COLUMN release_tokens.viewed_at IS 'First view timestamp (for read receipts)';
COMMENT ON COLUMN release_tokens.view_count IS 'Number of times the message was viewed';
