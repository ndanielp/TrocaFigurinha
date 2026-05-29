# Implementation Plan: Corrigir Erro 400 ao Abrir o Portal

**Branch**: `003-fix-400-bad-request` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-fix-400-bad-request/spec.md`

## Summary

O portal retornava HTTP 400 em todas as requisições à rota raiz (`/`) porque o middleware de autenticação usava o padrão `await auth()` diretamente, causando `ERR_HTTP_HEADERS_SENT`. No NextAuth v5, `auth()` sem argumentos dentro de middleware customizado tenta escrever cookies de sessão na resposta depois que o ciclo já foi iniciado. A correção envolve o middleware com `auth(handler)` — padrão canônico do NextAuth v5 que coordena a escrita de cookies dentro do próprio ciclo de vida da resposta e expõe a sessão via `req.auth`.

**Status do fix**: Implementado — commit `ab0dba8`. Pendente: validação em staging e promoção para produção.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS

**Primary Dependencies**:
- `next@15` — framework full-stack
- `next-auth@5` (Auth.js) — autenticação Google OAuth exclusivo
- `pg` — cliente PostgreSQL para adapter de sessão

**Storage**: Cloud SQL (PostgreSQL 15) — sem alterações de schema

**Testing**: Verificação manual via Cloud Logging após deploy em staging

**Target Platform**: Web — Cloud Run (southamerica-east1)

**Project Type**: Web application (Next.js monorepo full-stack)

**Performance Goals**: Redirecionamentos do middleware em <100ms

**Constraints**:
- Fix não pode quebrar o fluxo OAuth existente
- DB indisponível → redirecionar para `/login` (fail safe, não expõe rotas protegidas)
- Produção só recebe o fix após staging validado (SC-001 a SC-004 confirmados)

**Scale/Scope**: Mesmo escopo do MVP (1k–50k usuários)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Web-First Architecture | Sem alteração na arquitetura web | ✅ PASSA |
| II. Authentication & Identity | Google OAuth mantido; sessões obrigatórias em rotas protegidas | ✅ PASSA |
| III. Security by Default | Fix fecha bug de headers; fail safe para DB indisponível | ✅ PASSA |
| IV. Cloud-Native Deployment | Sem alteração de infra; deploy via Cloud Run existente | ✅ PASSA |
| V. Simplicity & Maintainability | Adota padrão canônico NextAuth v5; 3 linhas alteradas | ✅ PASSA |

*Re-check pós-design (Phase 1)*:

| Princípio | Verificação Pós-Design | Status |
|-----------|------------------------|--------|
| II. Auth | `auth(handler)` garante que rotas protegidas exigem sessão válida | ✅ |
| III. Security | Falha silenciosa de DB redireciona para login sem expor dados | ✅ |
| V. Simplicity | Uma mudança de 3 linhas em um arquivo; sem abstrações adicionais | ✅ |

## Complexity Tracking

Sem violações da constituição. Nenhuma entrada necessária.

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-400-bad-request/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (sem alterações de schema)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code — arquivos afetados

```text
src/
└── middleware.ts        # MODIFICADO: auth(handler) em vez de await auth()
```

Nenhum outro arquivo foi alterado. Sem migrations, rotas ou componentes novos.

**Structure Decision**: Next.js monorepo padrão. Apenas `src/middleware.ts` foi tocado.
