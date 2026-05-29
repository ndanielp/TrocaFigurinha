-- Migration 002: Remove email/password auth artifacts
-- Feature: 002-google-only-auth
-- Description: Drop parental_consent_tokens table and email/password columns from users.
--              Simplify account_status CHECK constraint.

BEGIN;

-- 1. Drop parental consent table (no longer has a producer after register route removal)
DROP TABLE IF EXISTS parental_consent_tokens;

-- 2. Remove email/password auth columns from users
ALTER TABLE users
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS parental_email,
  DROP COLUMN IF EXISTS parental_consent,
  DROP COLUMN IF EXISTS age_group;

-- 3. Replace account_status CHECK to remove 'pending_parental_consent'
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN (
    'incomplete_onboarding',
    'active',
    'suspended'
  ));

-- 4. Move any stuck 'pending_parental_consent' accounts to 'suspended'
UPDATE users
  SET account_status = 'suspended',
      updated_at     = now()
WHERE account_status = 'pending_parental_consent';

-- 5. Mark all Google users as email_verified = true
UPDATE users
  SET email_verified = true,
      updated_at     = now()
WHERE google_id IS NOT NULL
  AND email_verified = false;

COMMIT;
