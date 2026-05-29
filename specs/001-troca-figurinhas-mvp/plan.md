# Implementation Plan: Plataforma de Troca de Figurinhas — MVP

**Branch**: `001-troca-figurinhas-mvp` | **Date**: 2026-05-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-troca-figurinhas-mvp/spec.md`

## Summary

Portal web PWA mobile-first que conecta colecionadores do álbum Panini FIFA 2026 para troca
de figurinhas repetidas. Usuários autenticados registram sua coleção (figurinhas que têm,
precisam e têm repetidas), e a plataforma calcula matches bilaterais ranqueados por volume
de troca e proximidade geográfica (CEP). Contato via WhatsApp é habilitado quando ambos os
lados optam por isso.

**Technical approach**: Next.js 15 (TypeScript) full-stack com App Router, PostgreSQL 15
no Cloud SQL (matching via SQL com extensão earthdistance), Auth.js v5 para autenticação
email/Google, PWA via next-pwa, deploy no Cloud Run. Catálogo: 994 figurinhas (980 oficiais
Panini + 14 promocionais Coca-Cola), chave natural `{PREFIX}{N}` (ex: BRA1, FWC0, CC7).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS

**Primary Dependencies**:
- `next@15` — framework full-stack (frontend + API routes)
- `next-pwa` — service worker e manifest para PWA
- `next-auth@5` (Auth.js) — autenticação email/senha e Google OAuth 2.0
- `postgres@3` (postgres.js) — cliente PostgreSQL sem ORM
- `zod@3` — validação de schema em todas as boundaries de API
- `bcrypt` — hash de senhas (cost factor 12)
- `@sendgrid/mail` — e-mail transacional (verificação, consentimento parental)
- `node-pg-migrate` — migrations de banco de dados

**Storage**: Cloud SQL (PostgreSQL 15) com extensões `cube` + `earthdistance`

**Local dev**: Cloud SQL Auth Proxy conectando ao Cloud SQL de staging (sem Docker). Requer
`gcloud auth application-default login` e o proxy binário instalado localmente.

**Testing**:
- Jest + React Testing Library (unitário e integração de API)
- Playwright (E2E — fluxos críticos: cadastro, coleção, matching)

**Target Platform**: Web (mobile-first PWA) — Cloud Run (southamerica-east1)

**Project Type**: Web application (full-stack Next.js monorepo)

**Performance Goals**:
- Lista de matches: ≤ 3s para usuário com coleção completa (SC-003)
- Carregamento inicial do álbum: ≤ 2s em conexão 4G

**Constraints**:
- Escopo Brasil: CEP-based geolocation apenas
- LGPD: CEP armazenado (não endereço), WhatsApp nunca exposto sem opt-in bilateral
- Consentimento parental obrigatório para 13–15 anos

**Scale/Scope**: MVP — estimativa 1k–50k usuários no lançamento (temporada Copa 2026)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Web-First Architecture | Next.js PWA; core renderizado server-side (sem JS requerido); mobile-first | ✅ PASSA |
| II. Authentication & Identity | Auth.js: credentials (bcrypt cost 12) + Google OAuth; tokens Google não armazenados raw; middleware bloqueia rotas protegidas | ✅ PASSA |
| III. Security by Default | HTTPS via Cloud Run; rate limiting em `/api/auth`; sessões com lifetime limitado; secrets via Secret Manager; Zod em todas as boundaries | ✅ PASSA |
| IV. Cloud-Native Deployment | Cloud Run (compute), Cloud SQL PG15 (DB), Cloud Build (CI/CD), Cloud Logging + Monitoring | ✅ PASSA |
| V. Simplicity & Maintainability | Monorepo único Next.js; sem ORM; sem serviço separado de backend; dependências justificadas | ✅ PASSA |

**Resultado**: Todas as gates passam. Complexity Tracking vazio.

*Re-check pós-design (Phase 1)*:

| Princípio | Verificação Pós-Design | Status |
|-----------|------------------------|--------|
| II. Auth | Auth.js adapter PostgreSQL; `account_status` bloqueia `pending_parental_consent` | ✅ |
| III. Security | `whatsapp_link` nunca retornado sem opt-in bilateral verificado no servidor | ✅ |
| V. Simplicity | Matching como query SQL direta (sem cache layer); lateral joins justificados por necessidade do algoritmo | ✅ |

## Project Structure

### Documentation (this feature)

```text
specs/001-troca-figurinhas-mvp/
├── plan.md              # Este arquivo
├── research.md          # Decisões de tecnologia e arquitetura
├── data-model.md        # Schema PostgreSQL e query de matching
├── quickstart.md        # Setup de desenvolvimento e deploy
├── contracts/
│   └── api.md           # Contratos HTTP de todos os endpoints
└── tasks.md             # A ser gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                     # Rotas públicas de autenticação
│   │   ├── login/
│   │   ├── register/
│   │   └── onboarding/
│   ├── (protected)/                # Rotas protegidas (requerem sessão ativa)
│   │   ├── dashboard/
│   │   ├── album/
│   │   └── matches/
│   │       └── [partnerId]/        # Detalhe de match
│   ├── api/
│   │   ├── auth/[...nextauth]/     # Handler Auth.js
│   │   ├── auth/parental-consent/  # Confirmação consentimento parental
│   │   ├── collection/             # GET, PATCH /:sticker_id, PUT /bulk
│   │   ├── matches/                # GET, GET /unilateral, GET /:partner_id
│   │   ├── stickers/               # GET (catálogo estático)
│   │   └── user/                   # GET /stats, PUT /profile, DELETE
│   ├── layout.tsx
│   └── manifest.ts                 # PWA manifest
├── components/
│   ├── album/
│   │   ├── AlbumSection.tsx        # Seção de uma seleção
│   │   ├── StickerCard.tsx         # Card individual de figurinha
│   │   └── BulkActionBar.tsx       # Barra de ações em lote
│   ├── matches/
│   │   ├── MatchCard.tsx           # Card de match na lista
│   │   ├── MatchFilters.tsx        # Filtros de distância e score
│   │   └── MatchDetail.tsx         # Detalhe completo de troca
│   └── ui/                         # Componentes compartilhados (Button, Input, etc.)
├── lib/
│   ├── auth/
│   │   ├── config.ts               # Configuração Auth.js (providers, adapter)
│   │   └── middleware.ts           # Proteção de rotas e rate limiting
│   ├── db/
│   │   ├── client.ts               # Instância postgres.js
│   │   └── queries/                # Funções de query por domínio
│   │       ├── users.ts
│   │       ├── collection.ts
│   │       └── matches.ts
│   ├── matching/
│   │   └── compute.ts              # Wrapper da SQL query de matching
│   ├── geo/
│   │   └── cep.ts                  # Lookup de centroide por CEP
│   └── email/
│       └── sender.ts               # Wrapper SendGrid
└── types/
    └── index.ts                    # Tipos TypeScript compartilhados

tests/
├── integration/
│   ├── collection.test.ts
│   ├── matches.test.ts
│   └── auth.test.ts
├── unit/
│   ├── matching.test.ts
│   └── geo.test.ts
└── e2e/
    ├── registration.spec.ts
    ├── collection.spec.ts
    └── matching.spec.ts

infra/
├── cloudbuild.yaml
├── migrations/
│   └── 001_initial_schema.sql
└── seeds/
    ├── stickers.sql
    └── cep_centroids.sql

scripts/
└── setup-gcloud.sh             # Provisionamento completo do ambiente GCloud
```

**Structure Decision**: Monorepo Next.js único com App Router. Frontend e API no mesmo projeto.
Sem separação backend/frontend em serviços distintos — alinhado ao Princípio V (Simplicidade).
Estrutura de pastas por domínio dentro de `src/lib/` e `src/components/`. Sem Docker — o
ambiente local usa o Cloud SQL Auth Proxy apontando para o banco de staging no GCloud.
O script `scripts/setup-gcloud.sh` provê todo o ambiente GCloud necessário do zero.

## Complexity Tracking

> Não há violações da constituição neste plano.
