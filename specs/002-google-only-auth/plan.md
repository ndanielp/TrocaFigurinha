# Implementation Plan: Autenticação Exclusiva via Google

**Branch**: `002-google-only-auth` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-google-only-auth/spec.md`

## Summary

Simplificação do sistema de autenticação: remoção do fluxo email+senha (cadastro, login,
verificação de e-mail, consentimento parental) e manutenção exclusiva do Google OAuth 2.0.
O resultado é um sistema de identidade mais simples, sem dependência de SendGrid para auth,
e sem os estados intermediários `pending_parental_consent` e `pending_email_verification`.

**Decisão técnica**: Remover `CredentialsProvider` do Auth.js, apagar rotas e páginas de
cadastro/consentimento, dropar `parental_consent_tokens` e colunas não mais necessárias em
`users`. Emitir migration SQL para limpeza do schema.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS

**Primary Dependencies**:
- `next@15` — framework full-stack
- `next-auth@5` (Auth.js) — GoogleProvider exclusivo após esta feature
- `postgres@3` (postgres.js) — cliente PostgreSQL
- `zod@3` — validação de schema
- `@auth/pg-adapter` — adapter Auth.js → PostgreSQL
- `bcrypt` — **REMOVIDO** (não há mais senha para hashear)
- `@sendgrid/mail` — **REMOVIDO do fluxo auth** (sem e-mails de cadastro/consentimento)

**Storage**: Cloud SQL (PostgreSQL 15) — migration de cleanup necessária

**Testing**:
- Jest + React Testing Library (unitário)
- Playwright (E2E — fluxo de login Google mockado)

**Target Platform**: Web (mobile-first PWA) — Cloud Run (southamerica-east1)

**Project Type**: Web application (full-stack Next.js monorepo)

**Performance Goals**: Sem alteração em relação ao MVP (SC-001: login completo < 2 min)

**Constraints**:
- Usuários existentes com `password_hash` mas sem `google_id`: não há dados de produção ainda
  — colunas podem ser dropadas sem migração de dados
- `age_group` e consentimento parental: removidos do escopo (Google OAuth não distingue faixa etária)

**Scale/Scope**: Mesmo escopo do MVP (1k–50k usuários)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Web-First Architecture | Sem alteração — Next.js PWA mantido | ✅ PASSA |
| II. Authentication & Identity | **VIOLAÇÃO**: Constituição exige email+senha E Google OAuth. Esta feature remove email+senha. | ⚠️ VIOLAÇÃO JUSTIFICADA |
| III. Security by Default | HTTPS, rate limiting mantidos; remoção de credenciais simplifica superfície de ataque | ✅ PASSA |
| IV. Cloud-Native Deployment | Sem alteração na infra | ✅ PASSA |
| V. Simplicity & Maintainability | Reduz código, estados e dependências — alinha com o princípio | ✅ PASSA |

**Resultado**: Uma violação justificada — ver Complexity Tracking. **Constituição deve ser
emendada** como parte desta feature (tarefa incluída no plano).

*Re-check pós-design (Phase 1)*:

| Princípio | Verificação Pós-Design | Status |
|-----------|------------------------|--------|
| II. Auth | Constituição emendada para Google-only nesta feature; Princípio II atualizado | ✅ |
| III. Security | Remoção de password_hash reduz superfície; rate limiting mantido no signIn do Google | ✅ |
| V. Simplicity | 5 arquivos removidos, 4 modificados, 1 migration — mudança contida | ✅ |

## Complexity Tracking

| Violação | Por que necessária | Alternativa mais simples rejeitada porque |
|----------|--------------------|------------------------------------------|
| Princípio II: remoção de email+senha | Decisão de produto: Google OAuth é suficiente para o MVP, elimina complexidade de verificação de e-mail e consentimento parental, e remove dependência do SendGrid | Manter ambos aumentaria superfície de ataque e exigiria manutenção do fluxo de senha sem uso real |

## Project Structure

### Documentation (this feature)

```text
specs/002-google-only-auth/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code — arquivos afetados

```text
src/
├── lib/
│   ├── auth/
│   │   └── config.ts           # MODIFICAR: remover CredentialsProvider e bcrypt
│   ├── email/
│   │   └── sender.ts           # MODIFICAR: remover sendVerificationEmail e sendParentalConsentEmail
│   └── db/
│       └── queries/
│           └── users.ts        # MODIFICAR: remover createUser (só usada pelo register route)
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx        # MODIFICAR: UI Google-only (remover form email/senha)
│   │   ├── register/
│   │   │   └── page.tsx        # REMOVER
│   │   └── aguardando-consentimento/
│   │       └── page.tsx        # REMOVER
│   └── api/
│       └── auth/
│           ├── register/
│           │   └── route.ts    # REMOVER
│           └── parental-consent/
│               ├── confirm/
│               │   └── route.ts  # REMOVER
│               └── resend/
│                   └── route.ts  # REMOVER

infra/
└── migrations/
    └── 002_remove_email_auth.sql  # CRIAR: drop parental_consent_tokens, colunas email auth

.specify/memory/
└── constitution.md             # EMENDAR: Princípio II → Google OAuth exclusivo
```
