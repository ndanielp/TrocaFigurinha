# Tasks: Corrigir Erro 400 ao Abrir o Portal

**Input**: Design documents from `specs/003-fix-400-bad-request/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅

**Nota**: O fix de código já foi implementado (commit `ab0dba8` em `src/middleware.ts`). As tarefas abaixo cobrem validação em staging e promoção para produção.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executado em paralelo
- **[US1]**: User Story 1 — Abertura do Portal sem Erro
- **[US2]**: User Story 2 — Login com Google sem Erro

---

## Phase 1: Setup (Já Concluído)

**Purpose**: Fix implementado e branch enviado ao repositório remoto.

- [x] T001 Implementar padrão `auth(handler)` no middleware em `src/middleware.ts` *(commit ab0dba8)*
- [x] T002 Enviar branch `003-fix-400-bad-request` para o repositório remoto

**Checkpoint**: Branch com fix disponível para deploy ✅

---

## Phase 2: Foundational — Deploy em Staging

**Purpose**: Garantir que o Cloud Build executou e o serviço de staging está rodando a versão com o fix.

**⚠️ CRÍTICO**: Todas as validações dependem do deploy estar completo.

- [x] T003 Verificar status do Cloud Build para o branch `003-fix-400-bad-request` em `console.cloud.google.com/cloud-build/builds?project=trocafigurinhas-2026`
- [x] T004 Confirmar que a revisão ativa do `trocafigurinhas-staging` contém o commit `ab0dba8` via `gcloud run revisions list --service=trocafigurinhas-staging --region=southamerica-east1 --project=trocafigurinhas-2026`

**Checkpoint**: Staging rodando a versão com o fix — validações podem começar ✅

---

## Phase 3: User Story 1 — Abertura do Portal sem Erro (Priority: P1) 🎯 MVP

**Goal**: Confirmar que acessar a URL raiz do portal retorna redirecionamento (não erro 400).

**Independent Test**: Abrir `https://trocafigurinhas-staging-203084513594.southamerica-east1.run.app/` e verificar redirecionamento para `/login` com status 302/307.

### Validação US1

- [ ] T005 [US1] Acessar `https://trocafigurinhas-staging-203084513594.southamerica-east1.run.app/` no browser e confirmar redirecionamento para `/login` sem erro 400 (SC-001)
- [ ] T006 [P] [US1] Acessar uma rota protegida (ex: `/album`) sem sessão e confirmar redirecionamento para `/login?callbackUrl=/album` (FR-003)
- [ ] T007 [P] [US1] Verificar logs do Cloud Run: ausência de `ERR_HTTP_HEADERS_SENT` via `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=trocafigurinhas-staging" --project=trocafigurinhas-2026 --limit=50 --format="table(timestamp,httpRequest.status,textPayload)"` (SC-004)

**Checkpoint**: SC-001, SC-003, SC-004 confirmados — US1 validada ✅

---

## Phase 4: User Story 2 — Login com Google sem Erro (Priority: P2)

**Goal**: Confirmar que o fluxo OAuth completo funciona sem erros 400 em nenhuma etapa.

**Independent Test**: Clicar em "Entrar com Google" na página de login do staging e completar o fluxo até chegar em `/album`.

### Validação US2

- [ ] T008 [US2] Na página `/login` do staging, clicar em "Entrar com Google" e confirmar redirecionamento para o consentimento Google sem erro 400 (FR-004)
- [ ] T009 [US2] Completar autenticação com conta Google e confirmar criação de sessão e redirecionamento para `/album` (SC-002 — tempo < 30 segundos)
- [ ] T010 [US2] Verificar nos logs do Cloud Run que o callback `/api/auth/callback/google` retornou 200 (não 400)

**Checkpoint**: SC-002 confirmado — US2 validada. Staging completamente validado ✅

---

## Phase 5: Promoção para Produção

**Purpose**: Aplicar o fix no serviço de produção após staging validado.

**⚠️ Pré-requisito**: Phases 3 e 4 completas (SC-001 a SC-004 confirmados em staging).

- [ ] T011 Adicionar variáveis de ambiente ausentes no serviço de produção: `AUTH_URL` e `NEXTAUTH_URL` (atualmente ausentes em `trocafigurinhas-prod`): `gcloud run services update trocafigurinhas-prod --region=southamerica-east1 --project=trocafigurinhas-2026 --update-env-vars="NODE_ENV=production,AUTH_URL=https://trocafigurinhas-prod-203084513594.southamerica-east1.run.app,NEXTAUTH_URL=https://trocafigurinhas-prod-203084513594.southamerica-east1.run.app"`
- [ ] T012 Fazer merge do branch `003-fix-400-bad-request` em `main` via Pull Request
- [ ] T013 Aguardar deploy automático do `trocafigurinhas-prod` via Cloud Build após merge em `main`
- [ ] T014 [P] Adicionar URI de redirecionamento de produção no Google Console: `https://trocafigurinhas-prod-203084513594.southamerica-east1.run.app/api/auth/callback/google`
- [ ] T015 Verificar abertura do portal de produção sem erro 400 (mesmo critério do T005)
- [ ] T016 Verificar logs do Cloud Run de produção: ausência de `ERR_HTTP_HEADERS_SENT`

**Checkpoint**: Fix aplicado e validado em produção ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Concluída ✅
- **Phase 2 (Deploy Staging)**: Depende do Phase 1 — bloqueia todas as validações
- **Phase 3 (US1)**: Depende do Phase 2
- **Phase 4 (US2)**: Depende do Phase 2 — pode rodar em paralelo com Phase 3
- **Phase 5 (Produção)**: Depende da conclusão das Phases 3 e 4

### User Story Dependencies

- **US1 (P1)**: Pode começar após Phase 2 — sem dependências de US2
- **US2 (P2)**: Pode começar após Phase 2 — pode rodar em paralelo com US1

### Parallel Opportunities

- T006 e T007 podem rodar em paralelo com T005 (arquivos e sistemas diferentes)
- T014 (Google Console) pode rodar em paralelo com T012 e T013

---

## Parallel Example: Validação de Staging

```
# Após T004 (deploy confirmado), rodar em paralelo:
T005 — Abrir URL raiz no browser
T006 — Acessar rota protegida sem sessão
T007 — Verificar logs do Cloud Run
```

---

## Implementation Strategy

### MVP (US1 apenas)

1. Confirmar deploy (T003–T004)
2. Validar abertura sem 400 (T005–T007)
3. **PARAR E VALIDAR**: SC-001, SC-003, SC-004 confirmados

### Entrega Completa

1. Setup + Deploy Staging → Foundation pronta
2. Validar US1 → Portal abre sem erro
3. Validar US2 → Login funciona ponta-a-ponta
4. Promover para produção (Phase 5)

---

## Notes

- [P] = arquivos/sistemas diferentes, sem dependência entre si
- O serviço de produção tem um problema adicional: ausência de `AUTH_URL` (T011 corrige isso)
- A URI de callback de produção também precisa ser registrada no Google Console (T014)
- Fazer merge apenas após staging 100% validado (SC-001 a SC-004)
