# Research: Corrigir Incompatibilidade de Schema do Banco de Dados

**Feature**: 004-fix-schema-mismatch | **Date**: 2026-05-30

## Questão 1: Quais colunas o `@auth/pg-adapter` espera exatamente?

**Decisão**: Os nomes foram confirmados lendo o **código-fonte real** em `node_modules/@auth/pg-adapter/index.js` (não documentação). O adapter usa um **padrão MISTO**: chaves de relacionamento em camelCase com aspas (`"userId"`, `"providerAccountId"`, `"sessionToken"`, `"emailVerified"`), mas as colunas de token em **snake_case** (`access_token`, `expires_at`, etc.).

**Colunas esperadas por tabela** (✅ = já correta no schema atual, ⚠️ = precisa mudar):

| Tabela | Coluna adaptador | Coluna atual no schema | Ação |
|--------|-----------------|------------------------|------|
| `accounts` | `"userId"` | `user_id` | ⚠️ renomear |
| `accounts` | `"providerAccountId"` | `provider_account_id` | ⚠️ renomear |
| `accounts` | `type` | *(ausente)* | ⚠️ **adicionar** |
| `accounts` | `session_state` | *(ausente)* | ⚠️ **adicionar** |
| `accounts` | `access_token` | `access_token` | ✅ manter |
| `accounts` | `expires_at` | `expires_at` | ✅ manter |
| `accounts` | `refresh_token` | `refresh_token` | ✅ manter |
| `accounts` | `id_token` | `id_token` | ✅ manter |
| `accounts` | `scope` | `scope` | ✅ manter |
| `accounts` | `token_type` | `token_type` | ✅ manter |
| `sessions` | `"sessionToken"` | `session_token` | ⚠️ renomear |
| `sessions` | `"userId"` | `user_id` | ⚠️ renomear |
| `verification_token` *(singular)* | — | `verification_tokens` *(plural)* | ⚠️ renomear tabela |
| `users` | `name` | `display_name` | ⚠️ renomear |
| `users` | `image` | `avatar_url` | ⚠️ renomear |
| `users` | `"emailVerified"` (TIMESTAMPTZ) | `email_verified` (BOOLEAN) | ⚠️ trocar tipo |

**Correção crítica vs. versão anterior deste research**: as colunas `access_token`, `expires_at`, `refresh_token`, `id_token`, `token_type` **NÃO** devem ser renomeadas para camelCase — o adapter as usa em snake_case (ver `linkAccount`, linhas 105-150 do index.js). Renomeá-las quebraria o `linkAccount`.

**Alternativas consideradas**: Escrever um custom adapter que mapeia snake_case → rejeitada (mantém código extra fora da biblioteca oficial; diverge do padrão Auth.js).

---

## Questão 2: Qual estratégia de migração para a tabela `users`?

**Decisão**: Renomear colunas diretamente na tabela `users` e atualizar todas as queries da aplicação.

- `display_name` → `name`
- `avatar_url` → `image`
- `email_verified` (BOOLEAN) → substituir por `"emailVerified"` (TIMESTAMPTZ)

**Rationale**: Evita duplicação de dados (manter dois conjuntos de colunas para o mesmo valor). As queries da aplicação já usam aliases (`AS "displayName"`, `AS "avatarUrl"`), então o impacto no TypeScript é mínimo.

**Alternativas consideradas**:
- Adicionar colunas `name`/`image`/`"emailVerified"` em paralelo, mantendo `display_name`/`avatar_url`/`email_verified` → rejeitada (duplicação e risco de drift de dados).
- View com mapeamento de aliases → rejeitada (complexidade desnecessária; adiciona indireção).

---

## Questão 3: Escopo de arquivos de código a atualizar

**Decisão**: 4 arquivos de código-fonte precisam de atualização após a migration:

1. `src/lib/auth/config.ts` — queries raw SQL que referenciam `display_name`, `avatar_url`, `email_verified`
2. `src/lib/db/queries/users.ts` — queries com aliases das colunas renomeadas
3. `src/lib/db/queries/matches.ts` — queries com `display_name`, `avatar_url`
4. `infra/migrations/003_fix_auth_adapter_schema.sql` — nova migration

`src/lib/db/queries/stickers.ts` e `src/lib/db/queries/stats.ts` referenciam apenas `user_id` em `user_stickers`, que não é afetado.

---

## Questão 4: Dados existentes em staging

**Decisão**: Truncar as tabelas adapter (`accounts`, `sessions`, `verification_token`) antes da migration, pois estão vazias (staging em fase inicial). A tabela `users` também pode ser truncada (nenhum usuário real cadastrado ainda).

**Rationale**: Simplifica a migration — sem necessidade de backfill complexo de dados. A migration pode renomear colunas diretamente, sem preocupação com dados existentes.

---

## Questão 5: O `createUser` do adapter falha com colunas NOT NULL sem default

**Decisão**: Tornar `cep` aceitar default vazio (`DEFAULT ''`) na tabela `users`, e remover a criação manual de usuário do `signIn` callback.

**Problema**: O `createUser` do adapter (index.js linhas 42-55) insere **apenas** `(name, email, "emailVerified", image)`. A tabela `users` tem `cep CHAR(8) NOT NULL` **sem default** → o insert do adapter falha com `null value in column "cep"`. As demais colunas obrigatórias já têm default (`account_status DEFAULT 'incomplete_onboarding'`, `whatsapp_opt_in DEFAULT FALSE`, timestamps).

**Rationale**: O `cep` é preenchido depois, no onboarding (status inicial `incomplete_onboarding`). Um default vazio é coerente com o fluxo. Tornar `cep` nullable seria alternativa equivalente.

---

## Questão 6: Conflito entre `signIn` callback e o `createUser` do adapter

**Decisão**: Remover o INSERT/UPDATE manual de `users` do `signIn` callback em `config.ts`. Deixar o adapter gerenciar criação de usuário e conta. O callback fica responsável **apenas** por bloquear contas suspensas.

**Problema**: Hoje `config.ts:56-79` faz `INSERT INTO users ... ON CONFLICT (email)` manualmente. Com o adapter ativo, o core do Auth.js também chama `createUser` para usuário novo. Os dois colidem no `UNIQUE(email)` — um dos inserts falha. É um conflito de responsabilidade: ou o adapter gerencia usuários, ou o callback, não ambos.

**Rationale**: O adapter é o caminho canônico (Princípio V — usar a biblioteca, não duplicar). A identidade Google fica na tabela `accounts` (via `providerAccountId`), tornando o INSERT manual e o campo `google_id` redundantes para o login. O `session` callback continua enriquecendo a sessão a partir do banco.

**Alternativas consideradas**:
- Manter o INSERT manual e remover o adapter → rejeitada (perde gerenciamento de sessão de banco do Auth.js; exigiria reescrever sessions/accounts à mão).
- Usar `events.createUser` para preencher `cep` depois → desnecessário; o default resolve.
