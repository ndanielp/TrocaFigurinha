# Tasks: Autenticação Exclusiva via Google

**Input**: Design documents from `specs/002-google-only-auth/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅

**Organization**: Tarefas agrupadas por user story para entrega incremental independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: User story correspondente (US1, US2, US3)
- Caminhos relativos à raiz do repositório

---

## Phase 1: Setup (Dependências e Infraestrutura)

**Purpose**: Remover dependências obsoletas e preparar a migration de banco.

- [x] T001 Remover `bcrypt` e `@sendgrid/mail` de `package.json` e rodar `npm install`
- [x] T002 [P] Criar migration `infra/migrations/002_remove_email_auth.sql` com o SQL de `data-model.md`

---

## Phase 2: Foundational (Pré-requisitos Bloqueantes)

**Purpose**: Base de código e schema limpos — obrigatórios antes de qualquer user story.

**⚠️ CRÍTICO**: Nenhuma user story pode ser implementada antes desta fase estar completa.

- [ ] T003 Aplicar migration `infra/migrations/002_remove_email_auth.sql` no banco de desenvolvimento (`npm run db:migrate`) — **MANUAL: requer banco ativo**
- [x] T004 [P] Remover funções `sendParentalConsentEmail` e `sendVerificationEmail` de `src/lib/email/sender.ts` (e o arquivo inteiro se ficar vazio)
- [x] T005 [P] Remover função `createUser` de `src/lib/db/queries/users.ts` (usada exclusivamente pela rota de registro removida)
- [x] T006 Emendar `.specify/memory/constitution.md` — atualizar Princípio II para Google OAuth exclusivo, incrementar versão para 2.0.0

**Checkpoint**: Schema atualizado, dependências removidas, código base limpo — user stories podem começar.

---

## Phase 3: User Stories 1 e 2 — Login e Cadastro Google (Priority: P1) 🎯 MVP

**Goal**: O único fluxo de entrada e retorno ao sistema é o Google OAuth. Novos usuários têm conta criada automaticamente; usuários existentes têm sessão iniciada.

**Independent Test**: Acessar `http://localhost:3000/login`, clicar "Entrar com Google", completar o fluxo OAuth e verificar redirecionamento para `/album` (usuário existente) ou onboarding (usuário novo).

### Implementação US1 + US2

- [x] T007 [US1] Modificar `src/lib/auth/config.ts`: remover `CredentialsProvider`, imports de `bcrypt` e `z` (se não usado em outro lugar), manter apenas `GoogleProvider` com o callback `signIn` e `session` existentes
- [x] T008 [P] [US2] Modificar `src/app/(auth)/login/page.tsx`: remover form de email/senha, manter apenas botão "Entrar com Google" e mensagens de erro/sucesso do OAuth

**Checkpoint**: `npm run dev` → `/login` exibe apenas botão Google → fluxo OAuth completo → sessão iniciada.

---

## Phase 4: User Story 3 — Bloquear Métodos Legados (Priority: P2)

**Goal**: Nenhuma rota ou interface do sistema oferece cadastro ou login por email/senha após a mudança.

**Independent Test**: Acessar diretamente `/register`, `/api/auth/register` (POST), `/api/auth/parental-consent/confirm` e `/aguardando-consentimento` — todos devem retornar 404 ou redirecionar para `/login`.

### Implementação US3

- [x] T009 [P] [US3] Remover arquivo `src/app/api/auth/register/route.ts`
- [x] T010 [P] [US3] Remover arquivo `src/app/api/auth/parental-consent/confirm/route.ts`
- [x] T011 [P] [US3] Remover arquivo `src/app/api/auth/parental-consent/resend/route.ts`
- [x] T012 [P] [US3] Remover arquivo `src/app/(auth)/register/page.tsx`
- [x] T013 [P] [US3] Remover arquivo `src/app/(auth)/aguardando-consentimento/page.tsx`
- [x] T014 [US3] Revisar `src/middleware.ts`: remover qualquer referência a `/register`, `/aguardando-consentimento` ou lógica de `pending_parental_consent`

**Checkpoint**: Todas as rotas legadas retornam 404. Build sem erros de import quebrado.

---

## Phase 5: Polish e Cross-Cutting

**Purpose**: Consistência do projeto após a remoção do fluxo de email.

- [x] T015 [P] Atualizar `.env.example` e `.env.local.example`: remover variáveis `SENDGRID_API_KEY` e `SENDGRID_FROM_EMAIL`
- [x] T016 [P] Atualizar `specs/001-troca-figurinhas-mvp/quickstart.md`: remover instruções de cadastro email/senha, ajustar fluxo de teste para Google OAuth
- [x] T017 Verificar build de produção sem erros: `npm run build` e `npm run lint` — erros existentes são pré-existentes, nenhum introduzido por esta feature
- [ ] T018 Marcar secret `SENDGRID_API_KEY` como obsoleto no Secret Manager (ou deletar) via `gcloud secrets delete SENDGRID_API_KEY --project=trocafigurinhas-2026` — **MANUAL**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 — bloqueia todas as user stories
- **US1+US2 (Phase 3)**: Depende de Phase 2
- **US3 (Phase 4)**: Depende de Phase 2 — pode rodar em paralelo com Phase 3
- **Polish (Phase 5)**: Depende de Phase 3 e 4 completas

### User Story Dependencies

- **US1+US2 (P1)**: Compartilham a mesma implementação (`config.ts` + `login/page.tsx`) — tratadas como uma fase
- **US3 (P2)**: Independente de US1/US2 (arquivos diferentes) — pode começar assim que Phase 2 terminar

### Within Each Phase

- Tarefas marcadas `[P]` podem rodar em paralelo
- T003 (migration) deve completar antes de T007 (auth config) para garantir schema consistente
- T009–T013 (remoções) são todas paralelas entre si

### Parallel Opportunities

```bash
# Phase 1 (paralelo):
T001: remover dependências package.json
T002: criar migration SQL

# Phase 2 (T003 primeiro, depois T004+T005 em paralelo):
T003: aplicar migration
T004 + T005: limpar email sender e users queries (em paralelo após T003)
T006: emendar constituição (independente, pode rodar em paralelo com T004+T005)

# Phase 3 e 4 (após Phase 2):
T007: config.ts auth        ← Phase 3
T008: login/page.tsx        ← Phase 3, paralelo com T007
T009–T013: remoções         ← Phase 4, todas paralelas entre si
T014: middleware.ts         ← Phase 4, após T009–T013

# Phase 5 (após Phase 3+4):
T015 + T016: env + quickstart (paralelo)
T017: build check
T018: secret manager cleanup
```

---

## Implementation Strategy

### MVP First (US1+US2 — Login Google Funcional)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003–T006)
3. Phase 3: US1+US2 (T007–T008)
4. **PARAR e VALIDAR**: Login Google funcionando end-to-end
5. Continuar para Phase 4 (US3) e Phase 5

### Incremental Delivery

1. Setup + Foundational → base limpa
2. Phase 3 → login Google funciona → **MVP validável**
3. Phase 4 → rotas legadas bloqueadas → **feature completa**
4. Phase 5 → polish → **pronto para merge**

---

## Notes

- `[P]` = arquivos diferentes, sem dependência entre si
- `[US1]`, `[US2]`, `[US3]` mapeiam para user stories em `spec.md`
- T007 e T008 servem tanto US1 quanto US2 — o mesmo código cobre cadastro e login Google
- Nenhum arquivo novo de código precisa ser criado — esta feature é inteiramente de remoção e simplificação
- Commit após cada fase ou grupo lógico (ex.: após T003, após T007+T008)
- Total: **18 tarefas** | Phase 1: 2 | Phase 2: 4 | Phase 3: 2 | Phase 4: 6 | Phase 5: 4
