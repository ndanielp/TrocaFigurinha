# Tasks: Ordem do Álbum, Nome de Exibição, Match sem Reciprocidade e Custo

**Feature**: 006-album-order-match-cost | **Branch**: `006-album-order-match-cost`

**Input**: plan.md, spec.md, research.md, data-model.md

## Visão geral

4 histórias independentes. US1 e US3 são P1 (núcleo). US2 é P2. US4 é P3 (infra).
Backend de matches e onboarding já existem; a maior parte é ajuste de query/UI + recriação do catálogo.

---

## Phase 1: Setup

- [X] T001 Confirmar `npx tsc --noEmit` sem erros na branch antes de iniciar.
- [X] T002 Confirmar acesso ao Cloud SQL de staging (proxy) e ao `gcloud` para as tarefas de dados/infra.

---

## Phase 2: Foundational (bloqueia US1)

- [X] T003 Criar `infra/migrations/004_add_section_order.sql`: `ALTER TABLE stickers ADD COLUMN IF NOT EXISTS section_order INTEGER NOT NULL DEFAULT 0;`
- [X] T004 Criar script gerador `scripts/gen-stickers-seed.mjs` que produz `infra/seeds/stickers.sql` a partir do mapa de 48 times (data-model.md): FWC0–19 (section_order 0–19), 48 times × 20 figurinhas (`<SLUG><n>`, group_code, position_in_section=n, section_order=100+idx*20+(n-1), national_team, official=true), CC0–13 (promotional, official=false, section_order 2000+). Rodar o script e gerar o novo seed.

---

## Phase 3: User Story 1 — Álbum na ordem oficial (P1) 🎯

**Goal**: Álbum mostra 48 times 2026 nos grupos A–L na ordem da planilha.

**Independent Test**: Abrir álbum → Grupo A = MEX, RSA, KOR, CZE; Grupo C = BRA, MAR, HAI, SCO.

- [X] T005 [US1] Recriar catálogo em staging: limpar `user_stickers`, remover `stickers` de seleções antigas, aplicar migration 004 e o novo `infra/seeds/stickers.sql`.
- [X] T006 [US1] Em `src/lib/db/queries/stickers.ts`, alterar `getUserAlbum` para `ORDER BY s.section_order` (em vez de `section_type, group_code, team_slug, position_in_section`); incluir `section_order` no SELECT se necessário.
- [X] T007 [P] [US1] Criar `src/lib/teams.ts` com o mapa `team_slug → nome PT` (48 times, ver data-model.md).
- [X] T008 [US1] Em `src/components/album/TeamSection.tsx`, exibir o nome PT do time (via `teams.ts`) em vez do slug; manter o grupo visível.

**Checkpoint**: Álbum confere com a planilha (SC-001).

---

## Phase 4: User Story 3 — Match sem reciprocidade (P1) 🎯

**Goal**: Usuário sem repetidas vê oportunidade anônima ("inclua suas repetidas para ver"), sem nome/detalhes.

**Independent Test**: Usuário B (só "preciso") vê card anônimo quando A tem o que B precisa; ao B adicionar repetidas que A precisa, vira match completo com nome.

- [X] T009 [US3] Em `src/lib/db/queries/matches.ts`, estender `getMatches`: retornar também oportunidades anônimas (`eu_recebo >= 1 && eu_dou = 0`) — sem `partner_id`/nome/avatar/distância; tipar resultado discriminando completo vs anônimo.
- [X] T010 [US3] Em `src/app/api/matches/route.ts`, montar a resposta com matches completos + entradas anônimas (omitindo no servidor qualquer campo identificável). Atualizar tipos em `src/types`.
- [X] T011 [US3] Em `src/app/api/matches/[partnerId]/route.ts`, recusar (404) detalhe quando não há reciprocidade com aquele parceiro (impede acesso direto por URL).
- [X] T012 [US3] Em `src/app/(protected)/matches/page.tsx`, renderizar card anônimo com a chamada "Alguém próximo tem figurinhas que você precisa — inclua suas repetidas para ver", sem nome nem botão "Ver".

**Checkpoint**: Oportunidade anônima aparece e não vaza identidade (SC-003, SC-004).

---

## Phase 5: User Story 2 — Nome de exibição no onboarding (P2)

**Goal**: Onboarding pré-preenche o nome do Google e permite editar.

**Independent Test**: Conta nova → campo "Por qual nome gostaria de ser chamado?" vem preenchido e é editável; nome salvo aparece no sistema.

- [X] T013 [US2] Em `src/app/(auth)/onboarding/page.tsx`, adicionar campo "Por qual nome gostaria de ser chamado?" pré-preenchido com o nome da sessão; incluir `displayName` no payload de `complete_onboarding`. Obter o nome via `useSession`/props.
- [X] T014 [US2] Em `src/app/api/user/profile/route.ts`, incluir `displayName` no `onboardingSchema` e passar a `completeOnboarding`.
- [X] T015 [US2] Em `src/lib/db/queries/users.ts`, `completeOnboarding` passa a gravar `name = COALESCE(displayName, name)`.

**Checkpoint**: Nome de exibição editável no onboarding (SC-002).

---

## Phase 6: User Story 4 — Redução de custo (P3)

**Goal**: Infra mais barata sem regressão.

**Independent Test**: Após mudanças, login/álbum/onboarding/matches funcionam; custo estimado cai.

- [X] T016 [US4] Cloud Run: `gcloud run services update trocafigurinhas-staging --min-instances=0 --region=southamerica-east1 --project=trocafigurinhas-2026` (scale-to-zero).
- [X] T017 [US4] Cloud SQL: `gcloud sql instances patch trocafigurinhas-db --tier=db-f1-micro --project=trocafigurinhas-2026` (reinício breve esperado).
- [X] T018 [US4] Validar pós-mudança: login, álbum, onboarding e matches operacionais; registrar custo estimado antes/depois. ✅ db-f1-micro RUNNABLE, sem erros nos logs.

---

## Phase 7: Validação & Deploy

- [X] T019 Rodar `npx tsc --noEmit` e corrigir erros de tipo.
- [X] T020 Deploy staging (`gcloud run deploy trocafigurinhas-staging --source . ...`) e testar as 4 histórias de ponta a ponta.

---

## Dependencies & Ordem

```
Setup (T001,T002)
  └─> Foundational (T003 migration, T004 gerar seed)
        ├─> US1 (T005 recriar catalogo → T006 ordenar, [T007 teams.ts ∥], T008 UI)   ← P1
        ├─> US3 (T009 query → T010 API → T011 detalhe → T012 UI)                      ← P1 (independe de US1)
        ├─> US2 (T013 → T014 → T015)                                                  ← P2
        └─> US4 (T016, T017, T018)                                                    ← P3 (independe das demais)
              └─> Validação (T019 tsc, T020 deploy+teste)
```

**Paralelizável**: T007 (arquivo novo). US2, US3, US4 são independentes entre si; US1 depende da Foundational.

## MVP

US1 + US3 (P1). Entregam álbum correto + descoberta de demanda no match — o núcleo de valor. US2 e US4 são incrementos.
