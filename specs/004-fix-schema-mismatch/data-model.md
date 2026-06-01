# Data Model: Corrigir Incompatibilidade de Schema do Banco de Dados

**Feature**: 004-fix-schema-mismatch | **Date**: 2026-05-30

## Alterações de Schema (Migration 003)

### Tabela `accounts` — renomear 2 colunas + adicionar `type` e `session_state`

⚠️ **Apenas** `user_id` e `provider_account_id` são renomeados. As colunas de token (`access_token`, `expires_at`, `refresh_token`, `id_token`, `scope`, `token_type`) **permanecem em snake_case** — é assim que o adapter as usa.

```sql
-- Antes                        → Depois
user_id             UUID        → "userId"             UUID
provider_account_id TEXT        → "providerAccountId"  TEXT
refresh_token       TEXT        → (mantém) refresh_token
access_token        TEXT        → (mantém) access_token
expires_at          BIGINT      → (mantém) expires_at
token_type          TEXT        → (mantém) token_type
id_token            TEXT        → (mantém) id_token
scope               TEXT        → (mantém) scope
*(ausente)*                     → type           TEXT NOT NULL DEFAULT 'oauth'
*(ausente)*                     → session_state  TEXT
```

A UNIQUE constraint `(provider, provider_account_id)` precisa ser recriada como `(provider, "providerAccountId")`.
A FK `user_id → users(id)` precisa ser recriada como `"userId" → users(id)`.

---

### Tabela `sessions` — renomear colunas

```sql
-- Antes                        → Depois
session_token TEXT              → "sessionToken"  TEXT
user_id       UUID              → "userId"        UUID
```

A FK `user_id → users(id)` precisa ser recriada como `"userId" → users(id)`.
O UNIQUE index em `session_token` precisa ser recriado em `"sessionToken"`.

---

### Tabela `verification_tokens` → renomear para `verification_token`

Nome da tabela muda de plural para singular. Colunas internas não precisam de alteração.

---

### Tabela `users` — renomear colunas + trocar tipo de `email_verified` + default em `cep`

```sql
-- Antes                        → Depois
display_name  TEXT              → name             TEXT
avatar_url    TEXT              → image            TEXT
email_verified BOOLEAN          → "emailVerified"  TIMESTAMPTZ (nullable)
cep CHAR(8) NOT NULL            → cep CHAR(8) NOT NULL DEFAULT ''
```

Regra de migração de dados para `"emailVerified"`:
- Se `email_verified = true` → `"emailVerified" = now()`
- Se `email_verified = false` → `"emailVerified" = NULL`

O índice e constraints em `email_verified` precisam ser dropados antes do rename.

**Por que `cep DEFAULT ''`**: o `createUser` do adapter insere apenas `(name, email, "emailVerified", image)`. Sem default, o `NOT NULL` de `cep` quebra o insert. O `cep` real é preenchido no onboarding.

⚠️ **Atenção ao índice**: `idx_users_cep` usa `LEFT(cep, 5)` — continua válido após o default, sem alteração.

---

## Schema Final das Tabelas Afetadas

### `accounts`
```sql
CREATE TABLE accounts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                 TEXT NOT NULL DEFAULT 'oauth',
  provider             TEXT NOT NULL,
  "providerAccountId"  TEXT NOT NULL,
  refresh_token        TEXT,
  access_token         TEXT,
  expires_at           BIGINT,
  token_type           TEXT,
  scope                TEXT,
  id_token             TEXT,
  session_state        TEXT,
  UNIQUE (provider, "providerAccountId")
);
```

### `sessions`
```sql
CREATE TABLE sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId"       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires        TIMESTAMPTZ NOT NULL
);
```

### `verification_token`
```sql
CREATE TABLE verification_token (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

### `users` (colunas afetadas)
```sql
-- Renomeadas / alteradas:
name            TEXT NOT NULL,        -- era display_name
image           TEXT,                 -- era avatar_url
"emailVerified" TIMESTAMPTZ,          -- era email_verified BOOLEAN
cep             CHAR(8) NOT NULL DEFAULT '',  -- adicionado DEFAULT ''
```

---

## Impacto em Queries da Aplicação

### `src/lib/auth/config.ts`

**Mudança estrutural**: o `signIn` callback hoje cria/atualiza o usuário manualmente (INSERT/UPDATE), o que **colide** com o `createUser` do adapter. Remover essa lógica; deixar o adapter gerenciar usuário e conta. O callback passa a apenas bloquear suspensos.

- `session` callback: `SELECT account_status, avatar_url` → `SELECT account_status, image`; `session.user.image = dbUser.avatar_url` → `session.user.image = dbUser.image`
- `signIn` callback: **remover** o `INSERT INTO users ... ON CONFLICT` e o `UPDATE users SET avatar_url`. Manter somente a verificação de suspensão:
  ```ts
  async signIn({ account, profile }) {
    if (account?.provider === "google" && profile?.email) {
      const existing = await pool.query(
        `SELECT account_status FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [profile.email]
      );
      if (existing.rows[0]?.account_status === "suspended") return false;
    }
    return true;
  }
  ```
  O adapter cuida de criar o usuário (com `cep` default) e vincular a conta Google.

### `src/lib/db/queries/users.ts`
- `email_verified AS "emailVerified"` → `"emailVerified"`
- `display_name AS "displayName"` → `name AS "displayName"`
- `avatar_url AS "avatarUrl"` → `image AS "avatarUrl"`
- `display_name = COALESCE(...)` → `name = COALESCE(...)`
- `display_name = 'Conta removida'` → `name = 'Conta removida'`

### `src/lib/db/queries/matches.ts`
- `b.display_name AS partner_name` → `b.name AS partner_name`
- `b.avatar_url AS partner_avatar_url` → `b.image AS partner_avatar_url`
- `SELECT display_name, avatar_url, ...` → `SELECT name, avatar_url AS "avatar_url", ...` *(ajustar alias)*
- `display_name: string` → `name: string` no tipo inline
- `partner.display_name` → `partner.name`
- `partner.avatar_url` → `partner.image`
