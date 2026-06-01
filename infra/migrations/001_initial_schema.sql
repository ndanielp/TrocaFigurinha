-- Migration: 001_initial_schema
-- PostgreSQL 15, Cloud SQL

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             TEXT NOT NULL UNIQUE,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash     TEXT,
  google_id         TEXT UNIQUE,
  display_name      TEXT NOT NULL,
  cep               CHAR(8) NOT NULL,
  whatsapp          TEXT,
  whatsapp_opt_in   BOOLEAN NOT NULL DEFAULT FALSE,
  age_group         TEXT NOT NULL CHECK (age_group IN ('teen_13_15', 'adult_16_plus')),
  parental_email    TEXT,
  parental_consent  BOOLEAN NOT NULL DEFAULT FALSE,
  account_status    TEXT NOT NULL DEFAULT 'incomplete_onboarding'
                      CHECK (account_status IN (
                        'incomplete_onboarding',
                        'pending_parental_consent',
                        'active',
                        'suspended'
                      )),
  avatar_url        TEXT,
  terms_accepted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_cep ON users(LEFT(cep, 5));
CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status) WHERE deleted_at IS NULL;

-- Auth.js adapter tables
CREATE TABLE IF NOT EXISTS accounts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT NOT NULL UNIQUE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- stickers
CREATE TABLE IF NOT EXISTS stickers (
  id                  SERIAL PRIMARY KEY,
  natural_key         VARCHAR(6) NOT NULL UNIQUE,
  section_type        TEXT NOT NULL CHECK (section_type IN (
                        'national_team',
                        'tournament_special',
                        'promotional'
                      )),
  team_slug           CHAR(3),
  group_code          CHAR(1),
  position_in_section SMALLINT NOT NULL,
  position_role       TEXT NOT NULL CHECK (position_role IN (
                        'badge',
                        'team_photo',
                        'player',
                        'intro',
                        'history',
                        'promo'
                      )),
  sticker_name        TEXT NOT NULL,
  is_official_album   BOOLEAN NOT NULL DEFAULT TRUE,
  release_batch       TEXT NOT NULL DEFAULT 'original'
                        CHECK (release_batch IN ('original', 'coca_cola', 'update_team')),
  rarity              TEXT NOT NULL DEFAULT 'regular'
                        CHECK (rarity IN ('regular', 'gold'))
);

CREATE INDEX IF NOT EXISTS idx_stickers_team ON stickers(team_slug) WHERE team_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stickers_group ON stickers(group_code) WHERE group_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stickers_official ON stickers(is_official_album);

-- user_stickers
CREATE TABLE IF NOT EXISTS user_stickers (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id      INTEGER NOT NULL REFERENCES stickers(id),
  status          TEXT NOT NULL CHECK (status IN ('needs', 'owned', 'duplicate')),
  duplicate_count SMALLINT NOT NULL DEFAULT 0
                    CHECK (
                      (status = 'duplicate' AND duplicate_count >= 1) OR
                      (status != 'duplicate' AND duplicate_count = 0)
                    ),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sticker_id)
);

CREATE INDEX IF NOT EXISTS idx_user_stickers_user ON user_stickers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_stickers_duplicates ON user_stickers(user_id)
  WHERE status = 'duplicate';

-- cep_centroids
CREATE TABLE IF NOT EXISTS cep_centroids (
  cep_prefix CHAR(5) PRIMARY KEY,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  locality   TEXT
);

-- parental_consent_tokens
CREATE TABLE IF NOT EXISTS parental_consent_tokens (
  token        TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pct_user ON parental_consent_tokens(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
