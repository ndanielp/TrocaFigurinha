# Research: Autenticação Exclusiva via Google

**Feature**: `002-google-only-auth`
**Phase**: 0 — Research
**Date**: 2026-05-29

---

## Questão 1: Remoção do CredentialsProvider no Auth.js v5

**Decisão**: Remover `CredentialsProvider` e manter apenas `GoogleProvider` na configuração do Auth.js.

**Rationale**: O `CredentialsProvider` é stateless por design no Auth.js v5 — não persiste no adapter. Removê-lo não causa efeito colateral no banco. O `PostgresAdapter` continua gerenciando `accounts`, `sessions` e `verification_tokens` para o fluxo Google.

**Alternativas consideradas**:
- Manter CredentialsProvider mas ocultar na UI: rejeitado — o endpoint `/api/auth/callback/credentials` continuaria acessível diretamente, violando FR-002.
- Feature flag para desabilitar em runtime: rejeitado — complexidade desnecessária (Princípio V).

---

## Questão 2: O que fazer com `verification_tokens` (tabela Auth.js)

**Decisão**: Manter a tabela `verification_tokens` — ela é parte do schema padrão do `@auth/pg-adapter` e pode ser usada internamente pelo Auth.js para fluxos futuros (ex: magic links se necessário). Não dropar.

**Rationale**: Tabela vazia não causa problema; remover exigiria fork do adapter ou migration que pode conflitar com atualizações do Auth.js.

---

## Questão 3: Colunas a remover da tabela `users`

**Decisão**: Remover via migration:
- `password_hash TEXT` — sem sentido sem CredentialsProvider
- `parental_email TEXT` — específica do fluxo de consentimento parental por e-mail
- `parental_consent BOOLEAN` — idem
- `age_group TEXT` — coletada apenas no cadastro email/senha; Google não fornece idade

**Manter**:
- `email_verified BOOLEAN` — Auth.js o usa internamente; setar sempre `true` para Google
- `account_status` — mantido, mas `pending_parental_consent` removido do CHECK constraint

**Alternativa considerada**: Manter colunas como nullable por retrocompatibilidade — rejeitado porque não há dados de produção e colunas mortas aumentam ruído no schema.

---

## Questão 4: Remoção da tabela `parental_consent_tokens`

**Decisão**: Dropar a tabela inteiramente. Sem cadastro por email/senha, nenhum token será gerado ou consumido.

**Rationale**: Tabela usada exclusivamente pelo fluxo de consentimento parental disparado em `/api/auth/register`. Com a rota removida, a tabela fica orfã.

---

## Questão 5: Dependência `bcrypt`

**Decisão**: Remover `bcrypt` (e `@types/bcrypt` se presente) do `package.json`.

**Rationale**: Único uso é em `src/lib/auth/config.ts` (authorize do CredentialsProvider) e `src/app/api/auth/register/route.ts`. Ambos são removidos. Manter a dependência sem uso viola Princípio V.

---

## Questão 6: Dependência `@sendgrid/mail`

**Decisão**: Remover `@sendgrid/mail` do `package.json` nesta feature.

**Rationale**: Os dois usos atuais (`sendParentalConsentEmail`, `sendVerificationEmail`) são ambos do fluxo de auth que está sendo removido. Não há uso de e-mail para outras funcionalidades no MVP atual. Se notificações de match forem adicionadas no futuro, a dependência pode ser re-introduzida com justificativa.

**Alternativa considerada**: Manter a dependência para "uso futuro" — rejeitado explicitamente pelo Princípio V (YAGNI).

---

## Questão 7: `account_status` — estado `pending_parental_consent`

**Decisão**: Remover o valor `'pending_parental_consent'` do CHECK constraint em `users.account_status`. Novos usuários Google entram como `'incomplete_onboarding'` e avançam para `'active'` após o onboarding.

**Estados restantes**: `incomplete_onboarding` | `active` | `suspended`

---

## Questão 8: Página `/aguardando-consentimento`

**Decisão**: Remover a página. Rota não tem mais propósito — nenhum fluxo leva a ela.

**Impacto**: Verificar se `middleware.ts` tem lógica específica para essa rota — deve ser limpo junto.

---

## Questão 9: Emenda da Constituição

**Decisão**: Emendar Princípio II da Constituição para refletir Google-only como única identidade suportada. Incremento de versão: MAJOR (1.0.0 → 2.0.0) pois é redefinição do princípio de autenticação.

**Processo**: Conforme Governance — PR com mudança em `.specify/memory/constitution.md`. Como não há segundo maintainer neste momento, a emenda é auto-aprovada com justificativa registrada no Complexity Tracking do plano.
