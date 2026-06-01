# Implementation Plan: Corrigir Incompatibilidade de Schema do Banco de Dados

**Branch**: `004-fix-schema-mismatch` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-fix-schema-mismatch/spec.md`

## Summary

O banco de dados de staging foi criado com colunas em snake_case (`user_id`, `session_token`, `display_name`, `avatar_url`) e `email_verified` como BOOLEAN, mas o `@auth/pg-adapter` (Auth.js v5) espera colunas em camelCase com aspas duplas (`"userId"`, `"sessionToken"`, `"emailVerified"` como TIMESTAMPTZ, etc.) e a tabela `verification_token` no singular. Isso causa `AdapterError: column a.userId does not exist` a cada tentativa de login, bloqueando 100% do acesso ao portal.

Além dos nomes, há dois problemas secundários que o mesmo fluxo de login dispara em seguida: (a) o `createUser` do adapter insere só `(name, email, "emailVerified", image)`, mas `users.cep` é `NOT NULL` sem default → insert falha; (b) o `signIn` callback cria o usuário manualmente, colidindo com o `createUser` do adapter no `UNIQUE(email)`.

A correção envolve: (1) uma migration SQL que renomeia as colunas certas, adiciona `type`/`session_state` em `accounts` e `DEFAULT ''` em `users.cep`; (2) remover a criação manual de usuário do `signIn` callback, deixando o adapter gerenciar; (3) atualizar as queries que referenciam colunas renomeadas; (4) aplicar a migration em staging.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS

**Primary Dependencies**:
- `next@15` — framework full-stack
- `next-auth@5` (Auth.js) — autenticação Google OAuth
- `@auth/pg-adapter` — adaptador PostgreSQL para Auth.js; espera schema camelCase
- `pg` — cliente PostgreSQL para raw SQL do adapter

**Storage**: Cloud SQL (PostgreSQL 15) — schema a ser corrigido via migration

**Testing**: Verificação manual — login com conta Google no staging após migration e redeploy

**Target Platform**: Web — Cloud Run (southamerica-east1)

**Project Type**: Web application (Next.js monorepo full-stack)

**Performance Goals**: Login completo em < 10s; sem impacto nas queries existentes

**Constraints**:
- Staging tem dados descartáveis (ambiente inicial); truncar antes da migration é aceitável
- Fix não pode alterar o fluxo OAuth Google
- Colunas de `user_stickers`, `stickers`, `cep_centroids` não são afetadas

**Scale/Scope**: Mesmo escopo do MVP (1k–50k usuários)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Web-First Architecture | Sem alteração na camada web; apenas correção de schema | ✅ PASSA |
| II. Authentication & Identity | Google OAuth mantido; fix restaura o fluxo que nunca funcionou | ✅ PASSA |
| III. Security by Default | Nenhuma exposição nova; `"emailVerified"` como TIMESTAMPTZ é mais rico que BOOLEAN | ✅ PASSA |
| IV. Cloud-Native Deployment | Migration aplicada via Cloud SQL; sem alteração de infra | ✅ PASSA |
| V. Simplicity & Maintainability | Usa o adaptador oficial sem customização; 1 migration + ajustes em 3 arquivos | ✅ PASSA |

*Re-check pós-design (Phase 1)*:

| Princípio | Verificação Pós-Design | Status |
|-----------|------------------------|--------|
| II. Auth | Colunas corretas garantem criação de sessão e conta Google | ✅ |
| III. Security | `"emailVerified"` como timestamp é padrão OAuth2; sem regressão | ✅ |
| V. Simplicity | Sem abstrações novas; rename direto de colunas | ✅ |

## Complexity Tracking

Sem violações da constituição. Nenhuma entrada necessária.

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-schema-mismatch/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code — arquivos afetados

```text
infra/
└── migrations/
    └── 003_fix_auth_adapter_schema.sql   # NOVO: migration de correção

src/
├── lib/
│   ├── auth/
│   │   └── config.ts                     # MODIFICADO: signIn deixa de criar usuário; session usa image
│   └── db/
│       └── queries/
│           ├── users.ts                   # MODIFICADO: aliases de colunas renomeadas
│           └── matches.ts                 # MODIFICADO: display_name → name, avatar_url → image
```

> **Nota sobre nomes de coluna**: na tabela `accounts`, só `user_id` e `provider_account_id` viram camelCase (`"userId"`, `"providerAccountId"`). As colunas de token permanecem snake_case (`access_token`, `expires_at`, etc.) — confirmado no código-fonte do adapter (`linkAccount`).

## Implementation Phases

### Fase 1 — Migration SQL (`infra/migrations/003_fix_auth_adapter_schema.sql`)

Criar a migration dentro de uma transação:

1. **Truncar tabelas adapter** (dados descartáveis em staging):
   ```sql
   TRUNCATE TABLE accounts, sessions, verification_tokens CASCADE;
   TRUNCATE TABLE users CASCADE;
   ```

2. **Corrigir tabela `accounts`** (⚠️ NÃO renomear colunas de token — o adapter as usa em snake_case):
   - Drop UNIQUE constraint `(provider, provider_account_id)`
   - Drop FK `user_id → users(id)`
   - Renomear **apenas**: `user_id` → `"userId"`, `provider_account_id` → `"providerAccountId"`
   - **Manter** `access_token`, `expires_at`, `refresh_token`, `id_token`, `scope`, `token_type` em snake_case
   - Adicionar colunas `type TEXT NOT NULL DEFAULT 'oauth'` e `session_state TEXT`
   - Recriar UNIQUE em `(provider, "providerAccountId")`
   - Recriar FK `"userId" → users(id) ON DELETE CASCADE`

3. **Corrigir tabela `sessions`**:
   - Drop UNIQUE em `session_token`
   - Drop FK `user_id → users(id)`
   - Renomear: `session_token` → `"sessionToken"`, `user_id` → `"userId"`
   - Recriar UNIQUE em `"sessionToken"`
   - Recriar FK `"userId" → users(id) ON DELETE CASCADE`

4. **Renomear tabela** `verification_tokens` → `verification_token`

5. **Corrigir tabela `users`**:
   - Renomear: `display_name` → `name`, `avatar_url` → `image`
   - Adicionar coluna `"emailVerified" TIMESTAMPTZ` e migrar dados (`true` → `now()`, `false` → `NULL`)
   - Drop coluna `email_verified` (boolean, substituída)
   - Adicionar `DEFAULT ''` em `cep` (o `createUser` do adapter não preenche `cep`)

### Fase 2 — Atualizar queries da aplicação

**`src/lib/auth/config.ts`** — mudança estrutural:
- `session` callback: `SELECT account_status, avatar_url` → `SELECT account_status, image`; `dbUser.avatar_url` → `dbUser.image`
- `signIn` callback: **remover** o INSERT manual de usuário e o UPDATE de avatar (colidem com o `createUser` do adapter). Manter apenas a checagem de `account_status === 'suspended'` → `return false`. O adapter passa a criar o usuário e vincular a conta.

**`src/lib/db/queries/users.ts`** — aliases e UPDATE:
- `email_verified AS "emailVerified"` → `"emailVerified"`
- `display_name AS "displayName"` → `name AS "displayName"`
- `avatar_url AS "avatarUrl"` → `image AS "avatarUrl"`
- `display_name = COALESCE(...)` → `name = COALESCE(...)`
- `display_name = 'Conta removida'` → `name = 'Conta removida'`

**`src/lib/db/queries/matches.ts`** — SELECT e tipo inline:
- `b.display_name AS partner_name` → `b.name AS partner_name`
- `b.avatar_url AS partner_avatar_url` → `b.image AS partner_avatar_url`
- `SELECT display_name, avatar_url, ...` → `SELECT name, image, ...`
- Tipos inline e acessos: `display_name` → `name`, `avatar_url` → `image`

### Fase 3 — Aplicar migration e validar em staging

1. Aplicar `003_fix_auth_adapter_schema.sql` no Cloud SQL de staging
2. Fazer redeploy do serviço staging
3. Testar login em aba anônima
4. Confirmar nos Cloud Logs ausência de `AdapterError`

## Verification (Success Criteria)

- **SC-001**: Login com conta Google completa em < 10s no staging
- **SC-002**: Zero erros `column does not exist` nos Cloud Logs após migration
- **SC-003**: Sessão persiste — fechar e reabrir o browser mantém autenticação por 24h
- **SC-004**: Rotas protegidas redirecionam para `/login` quando sem sessão
