# Data Model: Corrigir Erro 400 ao Abrir o Portal

**Phase 1 Output** | **Branch**: `003-fix-400-bad-request` | **Date**: 2026-05-29

## Alterações de Schema

**Nenhuma alteração de schema necessária.**

Este bug fix é puramente de código de aplicação (`src/middleware.ts`). Nenhuma tabela, coluna, índice ou migration foi criada ou modificada.

## Entidades Relevantes (sem alteração)

As seguintes entidades do banco de dados são utilizadas pelo middleware de autenticação, mas não foram modificadas:

| Entidade | Tabela | Uso no Middleware |
|---|---|---|
| Sessão | `sessions` | Lida pelo `@auth/pg-adapter` para validar `req.auth` |
| Usuário | `users` | Consultada no callback `session` para enriquecer `req.auth.user` |

## Fluxo de Dados no Middleware (após o fix)

```
Requisição HTTP
      ↓
auth(handler) [NextAuth v5]
      ↓
  Lê cookie de sessão
      ↓
  Consulta sessions + users no Cloud SQL
      ↓
  Popula req.auth (ou null se sem sessão / DB indisponível)
      ↓
handler customizado
      ↓
  isPublic? → NextResponse.next()
  sem sessão? → redirect /login
  incomplete_onboarding? → redirect /onboarding
  autenticado? → NextResponse.next()
```

Quando o banco de dados estiver indisponível, `req.auth` retorna `null` e o middleware redireciona para `/login` (fail safe).
