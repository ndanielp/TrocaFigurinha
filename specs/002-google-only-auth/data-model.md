# Data Model: Autenticação Exclusiva via Google

**Feature**: `002-google-only-auth`
**Phase**: 1 — Design
**Date**: 2026-05-29
**Database**: PostgreSQL 15 (Cloud SQL)

---

## Resumo das Mudanças

Esta feature é um **cleanup de schema** — remove artefatos do fluxo email+senha que não têm
mais uso após a migração para Google OAuth exclusivo.

---

## Migration: `002_remove_email_auth.sql`

```sql
-- ============================================================
-- Migration 002: Remove email/password auth artifacts
-- ============================================================

BEGIN;

-- 1. Drop tabela de consentimento parental (dependências primeiro)
DROP TABLE IF EXISTS parental_consent_tokens;

-- 2. Remover colunas de auth email/senha da tabela users
ALTER TABLE users
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS parental_email,
  DROP COLUMN IF EXISTS parental_consent,
  DROP COLUMN IF EXISTS age_group;

-- 3. Atualizar CHECK constraint de account_status
--    Remover 'pending_parental_consent' dos valores válidos
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN (
    'incomplete_onboarding',
    'active',
    'suspended'
  ));

-- 4. Atualizar usuários com status 'pending_parental_consent' para 'suspended'
--    (segurança: sem consentimento confirmado, conta não fica ativa)
UPDATE users
  SET account_status = 'suspended',
      updated_at     = now()
WHERE account_status = 'pending_parental_consent';

-- 5. Garantir que todos os usuários Google tenham email_verified = true
UPDATE users
  SET email_verified = true,
      updated_at     = now()
WHERE google_id IS NOT NULL
  AND email_verified = false;

COMMIT;
```

---

## Schema Resultante — tabela `users`

```sql
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             TEXT NOT NULL UNIQUE,
  email_verified    BOOLEAN NOT NULL DEFAULT TRUE,   -- sempre true via Google
  google_id         TEXT UNIQUE NOT NULL,             -- obrigatório (único método de auth)
  display_name      TEXT NOT NULL,
  cep               CHAR(8) NOT NULL,
  whatsapp          TEXT,
  whatsapp_opt_in   BOOLEAN NOT NULL DEFAULT FALSE,
  account_status    TEXT NOT NULL DEFAULT 'incomplete_onboarding'
                      CHECK (account_status IN (
                        'incomplete_onboarding',
                        'active',
                        'suspended'
                      )),
  avatar_url        TEXT,
  terms_accepted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
```

> **Nota**: `google_id` passa a ser `NOT NULL` logicamente — todos os usuários chegam via Google.
> O campo já existe; a constraint NOT NULL pode ser adicionada após a migration confirmar que
> não há rows com `google_id IS NULL` (verificação segura no script de migration).

---

## Tabelas Removidas

| Tabela | Motivo |
|--------|--------|
| `parental_consent_tokens` | Usada exclusivamente pelo fluxo de consentimento por e-mail |

---

## Tabelas Mantidas sem Alteração

| Tabela | Observação |
|--------|-----------|
| `accounts` | Auth.js adapter — registra o provider `google` por usuário |
| `sessions` | Auth.js adapter — sessões de database strategy mantidas |
| `verification_tokens` | Auth.js adapter — mantida por compatibilidade, pode ficar vazia |
| `stickers` | Sem relação com auth |
| `user_stickers` | Sem relação com auth |
| `cep_centroids` | Sem relação com auth |

---

## State Transitions — `account_status` (pós-migration)

```
[Google OAuth] → incomplete_onboarding
                      │
                      ▼ (onboarding: CEP + nome)
                   active
                      │
                      ▼ (admin / violação)
                  suspended
```

Removido: `pending_parental_consent` (não tem mais produtor nem consumidor).
