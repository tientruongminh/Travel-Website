-- Migration: Add OAuth support to users table
-- Created: 2025-11-29

-- Add OAuth-specific fields (without UNIQUE constraint to avoid SQLite limitations)
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login DATETIME;

-- Update existing users to have email provider
UPDATE users SET provider = 'email' WHERE provider IS NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

