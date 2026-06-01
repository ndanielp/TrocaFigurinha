# Implementation Plan: Ordem do Álbum, Nome de Exibição, Match sem Reciprocidade e Custo

**Branch**: `006-album-order-match-cost` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-album-order-match-cost/spec.md`

## Summary

Quatro frentes: (1) recriar o catálogo de figurinhas com os 48 times oficiais da Copa 2026 na ordem da planilha, ordenando o álbum por uma nova coluna `section_order`; (2) coletar o nome de exibição no onboarding ("Por qual nome gostaria de ser chamado?"); (3) exibir matches sem reciprocidade como entradas anônimas (sem nome/detalhes), com anonimato garantido no servidor; (4) reduzir custo de cloud com Cloud SQL `db-f1-micro` e Cloud Run scale-to-zero.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS
**Primary Dependencies**: next@15 (App Router), React 19, `postgres` (lib do client), `pg` (auth), Tailwind
**Storage**: Cloud SQL (PostgreSQL 15) — nova coluna `stickers.section_order`; recriação do seed
**Testing**: typecheck + verificação manual em staging
**Target Platform**: Web — Cloud Run (southamerica-east1)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: álbum carrega na ordem correta; matches respondem rápido sob carga leve
**Constraints**:
- Disco do Cloud SQL não reduz por patch (só cresce) — redução de disco exige recriar instância
- `db-f1-micro` é shared-core (~0.6GB RAM): aceitável para MVP
- Anonimato de match deve ser garantido no servidor (não só no front)
**Scale/Scope**: MVP, poucos usuários

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Web-First | Mudanças de UI + dados; sem app nativo | ✅ |
| II. Auth & Identity | Sem mudança no fluxo de login; onboarding já protegido | ✅ |
| III. Security by Default | Match anônimo reforça privacidade (omite identidade no servidor) | ✅ |
| IV. Cloud-Native | Redução de custo usa serviços gerenciados GCP (Cloud SQL/Run) | ✅ |
| V. Simplicity | Reusa coluna `name`, endpoint de coleção, query de matches; 1 coluna nova | ✅ |

*Re-check pós-design*: sem violações novas. ✅

## Complexity Tracking

Sem violações da constituição. Nenhuma entrada necessária.

## Project Structure

### Documentation (this feature)
```text
specs/006-album-order-match-cost/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md   (/speckit-tasks)
```

### Source Code — arquivos afetados
```text
infra/
├── migrations/004_add_section_order.sql        # NOVO: coluna stickers.section_order
└── seeds/stickers.sql                          # REESCRITO: 48 times 2026 + section_order

src/
├── lib/db/queries/
│   ├── stickers.ts          # MODIFICADO: getUserAlbum ORDER BY section_order
│   └── matches.ts           # MODIFICADO: incluir matches anônimos (eu_recebo>=1, eu_dou=0)
├── lib/
│   └── teams.ts             # NOVO (opcional): mapa team_slug → nome PT para a UI
├── app/(auth)/onboarding/
│   └── page.tsx             # MODIFICADO: campo de nome de exibição
├── app/api/user/profile/
│   └── route.ts             # MODIFICADO: completeOnboarding grava displayName
├── lib/db/queries/users.ts  # MODIFICADO: completeOnboarding aceita/grava name
├── app/api/matches/
│   ├── route.ts             # MODIFICADO: retornar entradas anônimas
│   └── [partnerId]/route.ts # MODIFICADO: recusar detalhe sem reciprocidade
├── app/(protected)/matches/
│   └── page.tsx             # MODIFICADO: renderizar card anônimo (CTA "inclua suas repetidas")
└── components/album/
    └── TeamSection.tsx      # MODIFICADO (se necessário): exibir nome PT do time
```

## Implementation Phases

### Fase A — Catálogo e ordem do álbum (US1, P1)
1. Migration `004_add_section_order.sql`: `ALTER TABLE stickers ADD COLUMN section_order INTEGER NOT NULL DEFAULT 0`.
2. Reescrever `infra/seeds/stickers.sql` com os 48 times 2026 (mapa em data-model.md), cada um 1–20, `group_code` e `section_order` calculados; manter FWC e CC. Gerar via script (não à mão) para evitar erro nas 960 linhas.
3. Recriar catálogo em staging: limpar `user_stickers`, remover seleções antigas, aplicar migration + seed.
4. `getUserAlbum`: trocar `ORDER BY section_type, group_code, team_slug, position_in_section` por `ORDER BY section_order`.
5. (UI) Exibir nome PT do time (mapa `team_slug`→nome) em `TeamSection`.

### Fase B — Nome de exibição no onboarding (US2, P2)
1. `onboarding/page.tsx`: adicionar campo "Por qual nome gostaria de ser chamado?", pré-preenchido com o nome da sessão; incluir `displayName` no payload.
2. `api/user/profile` + `completeOnboarding`: aceitar e gravar `name`.

### Fase C — Match sem reciprocidade (US3, P1)
1. `getMatches`/`matches.ts`: além dos completos (`eu_dou>=1 && eu_recebo>=1`), retornar oportunidades anônimas (`eu_recebo>=1 && eu_dou=0`) sem `partnerId`/nome/avatar/distância.
2. `api/matches/route.ts`: montar resposta com lista completa + entradas anônimas (ou contagem agregada).
3. `api/matches/[partnerId]/route.ts`: recusar (404/403) quando não há reciprocidade com aquele parceiro.
4. `matches/page.tsx`: renderizar card anônimo com a chamada "Alguém próximo tem figurinhas que você precisa — inclua suas repetidas para ver", sem nome nem botão de detalhes.

### Fase D — Redução de custo (US4, P3)
1. Cloud Run: `gcloud run services update trocafigurinhas-staging --min-instances=0`.
2. Cloud SQL: `gcloud sql instances patch trocafigurinhas-db --tier=db-f1-micro` (causa reinício breve).
3. Validar que login/álbum/onboarding/matches seguem funcionando.
4. (Opcional, fora do caminho principal) Reduzir disco só se recriar a instância — avaliar custo/benefício; não executar sem decisão explícita.

### Fase E — Validação
- `npx tsc --noEmit`; deploy staging; testar as 4 histórias.

## Verification (Success Criteria)
- **SC-001**: 12 grupos + 48 times conferem com a planilha (inspeção do álbum).
- **SC-002**: nome de exibição confirmável/editável no onboarding em < 30s.
- **SC-003**: usuário só com "preciso" vê oportunidade anônima quando ela existe.
- **SC-004**: payload de match anônimo não contém nada identificável (inspeção de rede).
- **SC-005**: custo mensal estimado cai; sem regressão funcional.
