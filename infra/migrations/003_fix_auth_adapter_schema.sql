-- Migration 003: Fix Auth.js adapter schema mismatch
-- Feature: 004-fix-schema-mismatch
-- Description: Alinha o schema das tabelas do Auth.js (@auth/pg-adapter) com os
--              nomes de coluna/tabela que o adapter realmente usa (verificado no
--              código-fonte node_modules/@auth/pg-adapter/index.js):
--                - accounts: "userId", "providerAccountId" (camelCase com aspas);
--                  type e session_state adicionados; colunas de token permanecem
--                  em snake_case (access_token, expires_at, refresh_token, id_token,
--                  scope, token_type).
--                - sessions: "sessionToken", "userId".
--                - verification_tokens -> verification_token (singular).
--                - users: display_name -> name, avatar_url -> image,
--                  email_verified (BOOLEAN) -> "emailVerified" (TIMESTAMPTZ),
--                  cep ganha DEFAULT '' (createUser do adapter nao preenche cep).
-- Nota: staging em fase inicial; dados das tabelas auth/users sao descartaveis.

BEGIN;

-- 0. Limpar dados (descartaveis em staging); evita conflitos de FK/UNIQUE no rename
TRUNCATE TABLE accounts, sessions, verification_tokens, users CASCADE;

-- 1. accounts -----------------------------------------------------------------
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_provider_provider_account_id_key;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;

ALTER TABLE accounts RENAME COLUMN user_id TO "userId";
ALTER TABLE accounts RENAME COLUMN provider_account_id TO "providerAccountId";

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'oauth';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS session_state TEXT;

ALTER TABLE accounts
  ADD CONSTRAINT accounts_provider_provideraccountid_key
  UNIQUE (provider, "providerAccountId");

ALTER TABLE accounts
  ADD CONSTRAINT accounts_userid_fkey
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- 2. sessions -----------------------------------------------------------------
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_session_token_key;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

ALTER TABLE sessions RENAME COLUMN session_token TO "sessionToken";
ALTER TABLE sessions RENAME COLUMN user_id TO "userId";

ALTER TABLE sessions
  ADD CONSTRAINT sessions_sessiontoken_key UNIQUE ("sessionToken");

ALTER TABLE sessions
  ADD CONSTRAINT sessions_userid_fkey
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- 3. verification_tokens -> verification_token (singular) ----------------------
ALTER TABLE verification_tokens RENAME TO verification_token;

-- 4. users --------------------------------------------------------------------
ALTER TABLE users RENAME COLUMN display_name TO name;
ALTER TABLE users RENAME COLUMN avatar_url TO image;

ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMPTZ;
-- Migrar dados booleanos -> timestamp (no-op apos TRUNCATE, mantido por seguranca)
UPDATE users SET "emailVerified" = now() WHERE email_verified = true;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;

-- createUser do adapter insere apenas (name, email, "emailVerified", image);
-- cep e preenchido depois no onboarding.
ALTER TABLE users ALTER COLUMN cep SET DEFAULT '';

COMMIT;
