---
description: "Task list for Plataforma de Troca de Figurinhas — MVP"
---

# Tasks: Plataforma de Troca de Figurinhas — MVP

**Input**: Design documents from `specs/001-troca-figurinhas-mvp/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

**Tests**: Não solicitados explicitamente no spec — tarefas de teste omitidas por padrão.
E2E mínimo incluído na fase de Polish como gate de CI (constituição).

**Organization**: Tasks agrupadas por user story para enable implementação e teste independentes.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story a que a tarefa pertence (US1–US4)
- Paths relativos ao root do repositório

## Path Conventions

- App: `src/app/`, `src/components/`, `src/lib/`, `src/types/`
- Infra: `infra/migrations/`, `infra/seeds/`, `infra/cloudbuild.yaml`
- Scripts GCloud: `scripts/setup-gcloud.sh`
- Testes: `tests/e2e/`, `tests/integration/`, `tests/unit/`

---

## Phase 1: Setup (Inicialização do Projeto)

**Purpose**: Criar a base do projeto Next.js e a infraestrutura GCloud.

- [ ] T001 Inicializar projeto Next.js 15 com TypeScript: `npx create-next-app@latest . --typescript --app --src-dir --tailwind --eslint`
- [ ] T002 [P] Configurar ESLint + Prettier com regras strict em `.eslintrc.json` e `.prettierrc`
- [ ] T003 [P] Instalar e configurar `@ducanh2912/next-pwa` em `next.config.ts` e criar `src/app/manifest.ts`
- [ ] T004 Criar estrutura de diretórios conforme plan.md: `src/components/album/`, `src/components/matches/`, `src/components/ui/`, `src/lib/auth/`, `src/lib/db/queries/`, `src/lib/matching/`, `src/lib/geo/`, `src/lib/email/`, `src/types/`, `infra/migrations/`, `infra/seeds/`, `tests/e2e/`, `tests/integration/`, `tests/unit/`, `scripts/`
- [ ] T005 Escrever `scripts/setup-gcloud.sh` provisionando: Cloud SQL PG15 (extensões `cube`+`earthdistance`), banco `trocafigurinhas`, Cloud Run services (staging + production), Artifact Registry, Secret Manager secrets (`DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SENDGRID_API_KEY`), Cloud Build trigger, Service Account com roles mínimas (`roles/cloudsql.client`, `roles/secretmanager.secretAccessor`, `roles/run.invoker`)
- [ ] T006 [P] Escrever `infra/cloudbuild.yaml` com steps: lint → `npm run build` → `gcloud run deploy --source . trocafigurinhas-staging`
- [ ] T007 [P] Criar `.env.example` com todas as variáveis necessárias e instruções para Cloud SQL Auth Proxy no `quickstart.md`
- [ ] T008 [P] Instalar dependências: `postgres@3`, `next-auth@5`, `@auth/pg-adapter`, `bcrypt`, `@sendgrid/mail`, `zod`, `node-pg-migrate` e seus `@types`

---

## Phase 2: Fundação (Pré-requisitos Bloqueantes)

**Purpose**: Banco de dados, migrations, seeds e infra de autenticação — sem isso nenhuma user story pode começar.

**⚠️ CRITICAL**: Nenhuma user story pode ser iniciada até esta fase estar completa.

- [ ] T009 Escrever `infra/migrations/001_initial_schema.sql` com DDL completo: extensions (`uuid-ossp`, `cube`, `earthdistance`), tabelas `users`, `accounts`, `sessions`, `verification_tokens`, `stickers`, `user_stickers`, `cep_centroids`, `parental_consent_tokens` — conforme data-model.md
- [ ] T010 [P] Escrever `infra/seeds/stickers.sql` com INSERT de 994 figurinhas: 48 seleções × 20 (natural_key `BRA1`–`BRA20`, etc.), 20 FWC (`FWC0`–`FWC19`), 14 CC (`CC0`–`CC13`); campos `group_code`, `position_role`, `is_official_album`, `release_batch`, `rarity` conforme data-model.md
- [ ] T011 [P] Escrever `infra/seeds/cep_centroids.sql` com centroides lat/lng por prefixo de 5 dígitos do CEP (dados IBGE/OpenStreetMap); mínimo de cobertura: todos os estados brasileiros
- [ ] T012 Configurar scripts no `package.json`: `db:migrate` (`node-pg-migrate up`), `db:seed` (executa seeds via psql/postgres.js), `db:reset` (drop + migrate + seed, apenas dev)
- [ ] T013 Implementar `src/lib/db/client.ts` — instância singleton `postgres.js` com pool de conexões; ler `DATABASE_URL` da env; exportar `sql` tagged template
- [ ] T014 [P] Implementar `src/lib/auth/config.ts` — configuração Auth.js v5: `CredentialsProvider` (verifica email+bcrypt, lê `account_status`, bloqueia se não `active`), `GoogleProvider` (OAuth 2.0), `@auth/pg-adapter` apontando para `src/lib/db/client.ts`; sessão: 24h lifetime
- [ ] T015 Implementar `src/middleware.ts` — Next.js middleware protegendo todas as rotas `/(protected)/*` e `/api/*` (exceto `/api/auth/*` e `/api/auth/parental-consent`); redirecionar para `/login` se sem sessão
- [ ] T016 [P] Implementar rate limiting em `src/lib/auth/middleware.ts` — máximo 10 tentativas/min por IP nas rotas `/api/auth/callback/credentials` e `/api/auth/register`; retornar `429` com `Retry-After` header
- [ ] T017 [P] Criar `src/types/index.ts` com tipos TypeScript: `User`, `Sticker`, `UserSticker`, `Match`, `MatchDetail`, `AlbumSection`, `AccountStatus`, `AgeGroup`, `StickerStatus`, `SectionType`, `PositionRole`
- [ ] T018 [P] Criar componentes UI base em `src/components/ui/`: `Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`, `Spinner.tsx`, `Modal.tsx`

**Checkpoint**: Banco migrado + seed executado + middleware funcionando → user stories podem começar.

---

## Phase 3: User Story 1 — Cadastro, Autenticação e Perfil (Priority: P1) 🎯 MVP

**Goal**: Usuário cria conta (email/senha ou Google), completa onboarding (nome, CEP, WhatsApp,
idade, termos) e pode excluir a conta — fluxo completo de identidade e conformidade LGPD.

**Independent Test**: Criar conta do zero, completar onboarding, fazer logout, fazer login
novamente — dados devem persistir. Verificar que rotas protegidas redirecionam para login.

### Implementação da User Story 1

- [ ] T019 [P] [US1] Implementar funções de query em `src/lib/db/queries/users.ts`: `createUser(email, passwordHash)`, `getUserByEmail(email)`, `upsertProfile(userId, data)`, `softDeleteUser(userId)`, `setAccountStatus(userId, status)`, `setAvatarUrl(userId, avatarUrl)` — chamado pelo Auth.js callback Google com `profile.image`
- [ ] T020 [P] [US1] Implementar `src/lib/email/sender.ts` — wrapper SendGrid: `sendVerificationEmail(to, token)`, `sendParentalConsentEmail(parentEmail, token, childName)`
- [ ] T021 [US1] Implementar rota `POST /api/auth/register` em `src/app/api/auth/register/route.ts` — recebe `{email, password}`, valida com Zod, verifica unicidade, cria `user` com `bcrypt.hash(password, 12)`, envia e-mail de verificação, retorna `201`
- [ ] T022 [US1] Implementar rota `PUT /api/user/profile` em `src/app/api/user/profile/route.ts` — recebe dados de onboarding, valida CEP (lookup em `cep_centroids`), processa `age_group`: se `teen_13_15` → envia e-mail parental + status `pending_parental_consent`; se `adult_16_plus` → status `active`; valida `terms_accepted = true`
- [ ] T023 [US1] Implementar rota `DELETE /api/user` em `src/app/api/user/route.ts` — soft delete em `users` (`deleted_at = now()`), apaga `user_stickers`, `accounts`, `sessions`, `parental_consent_tokens` do usuário; invalida sessão atual
- [ ] T024 [US1] Implementar rota `GET /api/auth/parental-consent` em `src/app/api/auth/parental-consent/route.ts` — valida token (não expirado, não usado), atualiza `parental_consent_tokens.used_at`, chama `setAccountStatus(userId, 'active')`, redireciona para `/parental-consent/success`
- [ ] T025 [P] [US1] Construir página de login em `src/app/(auth)/login/page.tsx` — form email/senha + botão "Entrar com Google" (Auth.js `signIn`); link para cadastro; exibir erro de credenciais inválidas e `account_status` bloqueado
- [ ] T026 [P] [US1] Construir página de cadastro em `src/app/(auth)/register/page.tsx` — form email + senha + confirmação; validação client-side (Zod); POST para `/api/auth/register`
- [ ] T027 [US1] Construir página de onboarding em `src/app/(auth)/onboarding/page.tsx` — campos: nome de exibição, CEP (8 dígitos), WhatsApp (opcional), toggle opt-in WhatsApp, seletor de grupo de idade (`adult_16_plus` | `teen_13_15`) + campo e-mail parental (condicional), checkbox termos; PUT para `/api/user/profile`; redirecionar para `/dashboard` em sucesso ou exibir tela de "aguardando consentimento parental"
- [ ] T028 [P] [US1] Construir página de confirmação parental em `src/app/(auth)/parental-consent/success/page.tsx` e `src/app/(auth)/parental-consent/expired/page.tsx`; construir tela de espera `src/app/(auth)/parental-consent/pending/page.tsx` com botão "Reenviar e-mail" (POST `/api/auth/parental-consent/resend`), exibindo cooldown restante quando `429`
- [ ] T029 [US1] Construir página de configurações de perfil em `src/app/(protected)/dashboard/settings/page.tsx` com: formulário de edição de nome, CEP, WhatsApp e opt-in (PUT `/api/user/profile`); botão "Excluir conta" com confirmação modal (DELETE `/api/user`, redirect para `/login`)
- [ ] T029B [US1] Implementar rota `POST /api/auth/parental-consent/resend` em `src/app/api/auth/parental-consent/resend/route.ts` — verificar `account_status = pending_parental_consent`; checar cooldown 24h via `parental_consent_tokens.created_at`; gerar novo token; enviar e-mail; retornar `next_resend_allowed_at`; responder `429` com `Retry-After` se dentro do cooldown

**Checkpoint**: User Story 1 totalmente funcional — cadastro, login, onboarding, exclusão de conta.

---

## Phase 4: User Story 2 — Gerenciamento da Coleção (Priority: P1)

**Goal**: Usuário navega pelo álbum visual (48 seleções + FWC + CC), marca figurinhas como
tenho/repetida (com quantidade), usa ações em lote por seção — dados persistem.

**Independent Test**: Marcar 5 figurinhas da seção BRA como `owned`, 2 como `duplicate` qty=3,
usar "marcar tudo como tenho" na seção ARG, limpar seção ARG — verificar persistência após reload.

### Implementação da User Story 2

- [ ] T030 [P] [US2] Implementar funções de query em `src/lib/db/queries/collection.ts`: `getUserCollection(userId)` (retorna todas as 994 figurinhas com status do usuário), `upsertUserSticker(userId, stickerId, status, duplicateCount)`, `bulkUpsertSection(userId, teamSlug | sectionType, action: 'mark_all_owned' | 'clear')`
- [ ] T031 [US2] Implementar rota `GET /api/stickers` em `src/app/api/stickers/route.ts` — retorna catálogo completo agrupado por seção com `group_code`, `position_role`, `is_official_album`, `rarity`; header `Cache-Control: max-age=86400`
- [ ] T032 [US2] Implementar rota `GET /api/collection` em `src/app/api/collection/route.ts` — chama `getUserCollection`, mescla catálogo com estados do usuário (ausência de linha = `needs`)
- [ ] T033 [US2] Implementar rota `PATCH /api/collection/[stickerId]` em `src/app/api/collection/[stickerId]/route.ts` — valida status + duplicate_count com Zod, chama `upsertUserSticker`
- [ ] T034 [US2] Implementar rota `PUT /api/collection/bulk` em `src/app/api/collection/bulk/route.ts` — valida `action` + `team_slug`, chama `bulkUpsertSection`
- [ ] T035 [P] [US2] Construir `src/components/album/StickerCard.tsx` — exibe figurinha com estado visual (cinza=needs, verde=owned, azul+badge=duplicate); tap → `owned`; long-press ou botão "+" → incrementa `duplicate_count`; PATCH otimista com rollback em erro
- [ ] T036 [P] [US2] Construir `src/components/album/BulkActionBar.tsx` — botões "Marcar tudo como tenho" e "Limpar seção"; dispara PUT /api/collection/bulk
- [ ] T037 [P] [US2] Construir `src/components/album/AlbumSection.tsx` — grid de StickerCards para uma seção; cabeçalho com nome da seleção + grupo; exibe BulkActionBar; skeleton loading state
- [ ] T038 [US2] Construir página do álbum em `src/app/(protected)/album/page.tsx` — nav lateral/dropdown por grupo (A–L) + seções FWC e CC; lazy-load por seção (Intersection Observer); GET /api/collection na montagem; atualização otimista de estado local

**Checkpoint**: User Story 2 funcional — álbum visual completo, marcação persiste, bulk actions funcionam.

---

## Phase 5: User Story 3 — Matching e Contato (Priority: P2)

**Goal**: Usuário vê lista de matches bilaterais ranqueados (score DESC, distância ASC), filtra
por distância e score mínimo, vê detalhe completo de um match e, se ambos optaram pelo WhatsApp,
abre link de contato.

**Independent Test**: Com dois usuários de teste com coleções complementares — verificar que o
match bilateral aparece na lista de ambos com score e distância corretos. Verificar que botão
WhatsApp aparece apenas quando ambos têm opt-in.

### Implementação da User Story 3

- [ ] T039 [P] [US3] Implementar `src/lib/geo/cep.ts` — `getCepCentroid(cep: string): Promise<{lat, lng} | null>` usando query em `cep_centroids`; retornar `null` se CEP prefix não encontrado
- [ ] T040 [P] [US3] Implementar `src/lib/matching/compute.ts` — wrapper da query SQL de matching bilateral e unilateral de data-model.md; parâmetros: `userId`, `maxDistanceKm?`, `minScore?`, `page`, `perPage`; retornar `{matches, total}`
- [ ] T041 [P] [US3] Implementar funções de query em `src/lib/db/queries/matches.ts`: `getBilateralMatches(userId, filters)`, `getUnilateralMatches(userId, filters)`, `getMatchDetail(userId, partnerId)` — conforme query SQL de data-model.md; `getMatchDetail` inclui listas completas `eu_dou` e `eu_recebo` e `whatsapp_link` (somente se ambos `whatsapp_opt_in = true` e ambos têm `whatsapp` não-nulo)
- [ ] T042 [US3] Implementar rota `GET /api/matches` em `src/app/api/matches/route.ts` — query params: `max_distance_km`, `min_score`, `page`, `per_page`; validação Zod; chama `getBilateralMatches`; preview de até 3 figurinhas em `preview_give` e `preview_receive`; `whatsapp_available` boolean sem expor número
- [ ] T043 [US3] Implementar rota `GET /api/matches/unilateral` em `src/app/api/matches/unilateral/route.ts` — mesmos filtros; adiciona campo `direction: 'give' | 'receive'`
- [ ] T044 [US3] Implementar rota `GET /api/matches/[partnerId]` em `src/app/api/matches/[partnerId]/route.ts` — retorna detalhe completo; `whatsapp_link` apenas quando ambos opt-in E ambos têm número; retornar `403 NO_MATCH` se sem troca possível
- [ ] T045 [P] [US3] Construir `src/components/matches/MatchFilters.tsx` — slider de distância máxima (5/10/25/50/100/200 km / qualquer) + input de score mínimo; debounce 300ms antes de disparar nova busca
- [ ] T046 [P] [US3] Construir `src/components/matches/MatchCard.tsx` — avatar: `<img src={partner_avatar_url}>` se URL presente (usuários Google), senão iniciais do nome com cor derivada de hash do `partner_id`; score badge, distância, prévia de até 3 figurinhas de cada lado; botão "Ver detalhe"; botão "WhatsApp" visível apenas quando `whatsapp_available = true`
- [ ] T047 [US3] Construir página de matches em `src/app/(protected)/matches/page.tsx` — tab "Bilaterais" (padrão) + tab "Unilaterais"; GET /api/matches com paginação infinita (load more); MatchFilters + lista de MatchCards; estado vazio se sem matches
- [ ] T048 [US3] Construir página de detalhe do match em `src/app/(protected)/matches/[partnerId]/page.tsx` — GET /api/matches/[partnerId]; duas colunas: "Eu dou" ↔ "Eu recebo" com lista de figurinhas (natural_key + nome); botão "Abrir WhatsApp" (`href="https://wa.me/..."`, `target="_blank"`) somente quando `whatsapp_available = true`

**Checkpoint**: User Story 3 funcional — lista de matches com filtros, detalhe de match, contato via WhatsApp condicional.

---

## Phase 6: User Story 4 — Painel e Estatísticas (Priority: P3)

**Goal**: Usuário acessa painel com % de conclusão do álbum oficial (980 stickers Panini),
total de repetidas e top 5 figurinhas mais demandadas pela comunidade entre suas repetidas.

**Independent Test**: Com usuário que tem 200 stickers `owned`, 40 `duplicate` — verificar que
% oficial é calculado corretamente (exclui CC), total de repetidas é 40 e top 5 reflete demanda real.

### Implementação da User Story 4

- [ ] T049 [P] [US4] Adicionar função `getUserStats(userId)` em `src/lib/db/queries/users.ts` — executa as duas queries de stats de data-model.md: `album_completion_pct` (filtra `is_official_album = true`), `total_duplicates`, `top_demanded_stickers` (top 5); retornar objeto tipado `UserStats`
- [ ] T050 [US4] Implementar rota `GET /api/user/stats` em `src/app/api/user/stats/route.ts` — chama `getUserStats`; resposta conforme contracts/api.md
- [ ] T051 [US4] Construir painel em `src/app/(protected)/dashboard/page.tsx` — widget de stats: barra de progresso % álbum oficial, contagem de repetidas, lista top 5 figurinhas demandadas (nome + contagem + ícone da seleção); links rápidos para `/album` e `/matches`; skeleton loading

**Checkpoint**: User Story 4 funcional — painel exibe estatísticas corretas do álbum oficial.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade, segurança, observabilidade e validação da constituição.

- [ ] T052 [P] Implementar `src/lib/logger.ts` — wrapper de logging estruturado JSON (compatível com Cloud Logging); logar eventos de segurança: login, logout, falha de auth, exclusão de conta, consentimento parental; NUNCA incluir PII nos logs
- [ ] T053 [P] Adicionar step de `npm audit` no `infra/cloudbuild.yaml` antes do build (gate de segurança de dependências)
- [ ] T054 [P] Revisar todos os API routes contra OWASP Top 10: verificar parameterização de queries (postgres.js tagged template = safe), ausência de XSS em respostas JSON, CSRF (Auth.js handles), broken access control (middleware + ownership checks em `user_stickers`)
- [ ] T055 [P] Configurar Playwright em `playwright.config.ts`; escrever E2E mínimos em `tests/e2e/`: `registration.spec.ts` (cadastro + onboarding), `collection.spec.ts` (marcar figurinha + bulk action), `matching.spec.ts` (verificar match bilateral entre 2 usuários de teste)
- [ ] T056 Atualizar `scripts/setup-gcloud.sh` para criar dashboards Cloud Monitoring: error rate e latência do Cloud Run service `trocafigurinhas-staging`
- [ ] T057 [P] Validar `quickstart.md` executando o fluxo completo do zero: `setup-gcloud.sh` → Auth Proxy → `db:migrate` → `db:seed` → `npm run dev` → fluxo de registro → marcar figurinhas → ver matches

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — iniciar imediatamente
- **Fundação (Phase 2)**: Depende de Phase 1 completa — **BLOQUEIA todas as user stories**
- **US1 (Phase 3)**: Depende de Phase 2 — não depende de US2, US3, US4
- **US2 (Phase 4)**: Depende de Phase 2 — não depende de US1 (pode ser implementada em paralelo)
- **US3 (Phase 5)**: Depende de Phase 2 **e** requer dados de coleção (US2 completa é necessária para testar de forma significativa, mas a implementação pode iniciar após Phase 2)
- **US4 (Phase 6)**: Depende de Phase 2; requer dados de coleção (US2) para teste real
- **Polish (Phase 7)**: Depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **US1 (P1)**: Pode iniciar após Fundação — independente
- **US2 (P1)**: Pode iniciar após Fundação — independente (paralela com US1 se houver dois devs)
- **US3 (P2)**: Pode iniciar após Fundação; testes significativos requerem US2 completa
- **US4 (P3)**: Pode iniciar após Fundação; testes de stats requerem US2 completa

### Within Each User Story

- Queries do banco → routes da API → componentes UI → página
- Componentes paralelos (`[P]`) podem ser desenvolvidos simultaneamente
- Commit após cada task ou grupo lógico

### Parallel Opportunities

```bash
# Phase 1 — Setup (tudo em paralelo exceto T001 e T004)
T002, T003, T006, T007, T008  # rodam em paralelo após T001

# Phase 2 — Fundação (paralelos após T009)
T010, T011  # seeds podem ser escritos em paralelo com migration
T013, T014, T016, T017, T018  # após T012 (package.json scripts)

# US1 — tasks paralelas
T019, T020  # queries + email wrapper
T025, T026  # páginas de login e register

# US2 — tasks paralelas
T030  # queries collection
T031  # GET /api/stickers (independente de T030)
T035, T036, T037  # componentes UI (independentes entre si)

# US3 — tasks paralelas
T039, T040, T041  # geo + matching + queries (independentes)
T045, T046  # componentes MatchFilters e MatchCard

# Polish — tudo em paralelo
T052, T053, T054, T055, T056  # cross-cutting, arquivos diferentes
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Completar Phase 1: Setup
2. Completar Phase 2: Fundação (**crítico — bloqueia tudo**)
3. Completar Phase 3: US1 (autenticação + perfil)
4. Completar Phase 4: US2 (coleção)
5. **PARAR e VALIDAR**: usuário pode se cadastrar, completar onboarding e marcar toda a coleção
6. Deploy em staging — MVP funcional mesmo sem matching

### Incremental Delivery

1. Setup + Fundação → base pronta
2. US1 → autenticação funcional → deploy staging
3. US2 → álbum funcional → deploy staging (coleta de coleções começa!)
4. US3 → matching funcional → deploy staging (valor principal liberado)
5. US4 → painel → deploy staging
6. Polish → hardening → deploy produção

### Parallel Team Strategy

Com dois desenvolvedores após Phase 2:
- Dev A: US1 (autenticação, onboarding, perfil)
- Dev B: US2 (catálogo, coleção, componentes de álbum)

---

## Notes

- `[P]` = arquivos diferentes, sem dependências incompletas
- `[Story]` mapeia tarefa para user story para rastreabilidade
- Cada user story é independentemente testável após Phase 2
- Seed de stickers (`T010`) requer dados oficiais Panini confirmados antes do lançamento em produção
- `whatsapp_link` NUNCA exposto sem validação bilateral de opt-in no servidor (ver T044)
- `album_completion_pct` SEMPRE filtra `is_official_album = true` — CC não conta para % do álbum (ver T049)
