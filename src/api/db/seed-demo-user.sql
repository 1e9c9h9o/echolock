-- Demo User Seed Script
-- Creates a demo account for testing
--
-- DEMO CREDENTIALS:
-- Email: demo@echolock.xyz
-- Password: DemoPass123

-- Insert demo user
-- Password hash for "DemoPass123" using bcrypt (cost factor 10)
INSERT INTO users (
  id,
  email,
  password_hash,
  email_verified,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@echolock.xyz',
  '$2b$10$8Nz/Bqn8bdNt3TVYUilLceAZhPl03Fbc3Y9fizerkozMjfOW1jxZm',
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  email_verified = EXCLUDED.email_verified;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo user created successfully!';
  RAISE NOTICE 'Email: demo@echolock.xyz';
  RAISE NOTICE 'Password: DemoPass123';
  RAISE NOTICE 'Email verified: true';
  RAISE NOTICE '========================================';
END $$;
