# Tasks: Corrigir Incompatibilidade de Schema do Banco de Dados

**Feature**: 004-fix-schema-mismatch | **Branch**: `004-fix-schema-mismatch`

**Input**: plan.md, spec.md, research.md, data-model.md

## Visão geral

Correção do schema do banco para compatibilizar com o `@auth/pg-adapter`, mais a remoção da criação manual de usuário no `signIn` callback. O fluxo de login dispara, em ordem: `getUserByAccount` → `getUserByEmail` → `createUser` → `linkAccount` → `createSession`. Cada tarefa abaixo destrava um desses pontos.

---

## Phase 1: Setup

- [ ] T001 Confirmar acesso ao Cloud SQL de staging (`trocafigurinhas-2026:southamerica-east1:trocafigurinhas-db`) via `gcloud sql connect` ou Cloud SQL Auth Proxy, para aplicar a migration.

---

## Phase 2: Foundational (bloqueia todas as user stories)

**Migration SQL — `infra/migrations/003_fix_auth_adapter_schema.sql`** (nova). Tudo dentro de uma transação (`BEGIN`/`COMMIT`).

- [X] T002 Criar `infra/migrations/003_fix_auth_adapter_schema.sql` com `BEGIN;` e `TRUNCATE TABLE accounts, sessions, verification_tokens, users CASCADE;` (dados descartáveis em staging).
- [X] T003 Na mesma migration, corrigir tabela `accounts`: drop UNIQUE `(provider, provider_account_id)`; drop FK de `user_id`; renomear **apenas** `user_id`→`"userId"` e `provider_account_id`→`"providerAccountId"`; **manter** `access_token`/`expires_at`/`refresh_token`/`id_token`/`scope`/`token_type` em snake_case; adicionar `type TEXT NOT NULL DEFAULT 'oauth'` e `session_state TEXT`; recriar UNIQUE `(provider, "providerAccountId")` e FK `"userId"→users(id) ON DELETE CASCADE`.
- [X] T004 Na mesma migration, corrigir tabela `sessions`: drop UNIQUE de `session_token`; drop FK de `user_id`; renomear `session_token`→`"sessionToken"` e `user_id`→`"userId"`; recriar UNIQUE em `"sessionToken"` e FK `"userId"→users(id) ON DELETE CASCADE`.
- [X] T005 Na mesma migration, renomear tabela `verification_tokens` → `verification_token` (singular).
- [X] T006 Na mesma migration, corrigir tabela `users`: renomear `display_name`→`name` e `avatar_url`→`image`; adicionar `"emailVerified" TIMESTAMPTZ` e migrar dados (`email_verified=true`→`now()`, `false`→`NULL`); drop coluna `email_verified`; adicionar `DEFAULT ''` em `cep`. Fechar com `COMMIT;`.

**Checkpoint**: Migration escrita e revisada. Ainda não aplicada (T013).

---

## Phase 3: User Story 1 — Login com Google OAuth (P1) 🎯 MVP

**Goal**: Usuário consegue logar com Google e chegar ao portal autenticado, sem erro de schema.

**Independent Test**: Em aba anônima no staging, clicar "Entrar com Google", autorizar, e chegar autenticado ao portal.

- [X] T007 [US1] Em `src/lib/auth/config.ts`, reescrever o `signIn` callback para **apenas** bloquear suspensos: `SELECT account_status FROM users WHERE email = $1 AND deleted_at IS NULL`; `return false` se `suspended`, senão `return true`. Remover o INSERT e o UPDATE manuais de `users` (colidem com o `createUser` do adapter).
- [X] T008 [US1] Em `src/lib/auth/config.ts`, ajustar o `session` callback: `SELECT account_status, image FROM users ...` e `session.user.image = dbUser.image` (era `avatar_url`).
- [X] T009 [P] [US1] Em `src/lib/db/queries/users.ts`, atualizar os 3 SELECTs e o UPDATE: `email_verified AS "emailVerified"` → `"emailVerified"`; `display_name AS "displayName"` → `name AS "displayName"`; `avatar_url AS "avatarUrl"` → `image AS "avatarUrl"`; `display_name = ...` → `name = ...` (em `updateUserProfile` e `softDeleteUser`).
- [X] T010 [P] [US1] Em `src/lib/db/queries/matches.ts`, atualizar SELECTs e tipos inline: `b.display_name`→`b.name`, `b.avatar_url`→`b.image`, `SELECT display_name, avatar_url`→`SELECT name, image`, e os acessos `partner.display_name`/`partner.avatar_url` → `partner.name`/`partner.image`.
- [X] T011 [P] [US1] Em `src/types` (ver `src/types/index.ts` e `src/types/next-auth.d.ts`), ajustar o tipo `User`: `emailVerified` passa de `boolean` para `Date | null` (coluna virou TIMESTAMPTZ). Verificar se `displayName`/`avatarUrl` continuam como aliases válidos.
- [X] T012 [US1] Rodar `npm run build` (ou `tsc --noEmit`) localmente e corrigir qualquer erro de tipo remanescente das renomeações.

**Checkpoint**: Código compila; queries alinhadas ao novo schema.

---

## Phase 4: Deploy & Validação em staging

- [X] T013 Aplicar `infra/migrations/003_fix_auth_adapter_schema.sql` no Cloud SQL de staging.
- [X] T014 Fazer redeploy do serviço `trocafigurinhas-staging` (Cloud Run, southamerica-east1) para subir o código atualizado.
- [X] T015 [US1] Testar login com Google em aba anônima em `https://trocafigurinhas-staging-qpnb3tgjcq-rj.a.run.app/` e confirmar acesso autenticado (SC-001, SC-002). ✅ Login confirmado funcionando.
- [X] T016 [US1] Verificar nos Cloud Logs de staging ausência de `AdapterError` / `column ... does not exist` após o login (SC-004 da spec). ✅ Sem erros nos logs durante o login.

---

## Phase 5: User Story 2 — Persistência de Sessão (P2)

**Goal**: Sessão persiste no banco e sobrevive a fechar/reabrir o browser por 24h.

**Independent Test**: Após login, fechar e reabrir o browser antes de 24h e continuar autenticado.

- [ ] T017 [US2] Confirmar criação de linha em `sessions` após login (consulta direta no banco) e que `getSessionAndUser` recupera a sessão (reabrir o browser mantém login). Valida SC-003.

---

## Phase 6: Polish & Cross-Cutting

- [X] T021 [US1] **(descoberto na validação)** Corrigir `src/lib/db/client.ts`: a lib `postgres` não interpretava `?host=/cloudsql/...` como socket Unix e tentava TCP em `localhost:5432` (ECONNREFUSED em todas as rotas além do login — onboarding, álbum, matches, stats). Passar a parsear a URL manualmente e usar opções explícitas (host=socket, sem port/SSL), espelhando `src/lib/auth/config.ts`.
- [ ] T018 Atualizar `infra/migrations/001_initial_schema.sql` (ou criar nota) para que novos ambientes já nasçam com o schema correto do adapter — evitar repetir o bug em produção.
- [ ] T019 Aplicar a mesma migration `003` em produção (`trocafigurinhas-prod`) quando o serviço de prod for promovido, garantindo paridade de schema.
- [ ] T020 [P] Remover do código eventuais referências mortas a `google_id` se não forem mais usadas no login (identidade agora vive em `accounts`). Verificar antes de remover.

---

## Dependencies & Ordem de Execução

```
Setup (T001)
   └─> Foundational / Migration escrita (T002→T006)
          └─> US1 código (T007, T008, [T009, T010, T011 em paralelo], T012)
                 └─> Deploy & Validação (T013→T016)   ← MVP entregue aqui
                        └─> US2 validação (T017)
                               └─> Polish (T018, T019, T020)
```

**Paralelizáveis** (arquivos distintos, sem dependência mútua): T009, T010, T011.

## MVP

**User Story 1 (Phases 2→4)** = MVP. Ao concluir T016, o login com Google volta a funcionar de ponta a ponta em staging — que é o objetivo central desta feature.
