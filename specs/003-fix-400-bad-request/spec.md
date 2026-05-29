# Feature Specification: Corrigir Erro 400 ao Abrir o Portal

**Feature Branch**: `003-fix-400-bad-request`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Analiza o projeto para identicar o motivo de 400 bad request ao abrir o portal"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abertura do Portal sem Erro (Priority: P1)

Um usuário não autenticado acessa a URL do portal e é redirecionado corretamente para a página de login, sem receber erro 400 ou tela em branco.

**Why this priority**: O erro 400 impede qualquer acesso ao portal, bloqueando todos os usuários. É a falha mais crítica possível — sem isso, o sistema é inutilizável.

**Independent Test**: Pode ser testado acessando a URL raiz do portal em ambiente de staging e verificando se a resposta é um redirecionamento 302/307 para `/login`, não um erro 400.

**Acceptance Scenarios**:

1. **Given** um usuário não autenticado, **When** ele acessa a URL raiz (`/`) do portal, **Then** é redirecionado para `/login` com status 302/307, sem erros 400.
2. **Given** um usuário não autenticado, **When** ele acessa qualquer rota protegida, **Then** é redirecionado para `/login?callbackUrl=<rota>` sem erros 400.
3. **Given** um usuário autenticado com status `incomplete_onboarding`, **When** ele acessa uma rota protegida, **Then** é redirecionado para `/onboarding` sem erros 400.

---

### User Story 2 - Login com Google sem Erro (Priority: P2)

Um usuário clica em "Entrar com Google" na página de login e completa o fluxo OAuth sem erros 400 em nenhuma etapa.

**Why this priority**: Mesmo que a abertura do portal funcione, o login precisa funcionar para o usuário acessar o conteúdo.

**Independent Test**: Pode ser testado clicando em "Entrar com Google" e verificando que o fluxo completo (redirect ao Google → callback → sessão criada → redirect para `/album`) ocorre sem erros.

**Acceptance Scenarios**:

1. **Given** um usuário na página `/login`, **When** ele clica em "Entrar com Google", **Then** é redirecionado para o consentimento Google sem erros 400.
2. **Given** o callback do Google retornando com código de autorização, **When** o portal processa o callback, **Then** a sessão é criada e o usuário é redirecionado para `/album` ou a URL de callback original.

---

### Edge Cases

- **DB indisponível**: Quando o banco de dados não está acessível durante a validação de sessão, o middleware trata a sessão como ausente e redireciona para `/login` (fail safe — não expõe rotas protegidas, não bloqueia totalmente o acesso).
- O que acontece quando o `AUTH_SECRET` não está configurado no ambiente de produção/staging?
- O que acontece quando a URI de redirecionamento OAuth não está cadastrada no Google Console?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O middleware de autenticação DEVE processar cada requisição sem gerar conflitos de headers HTTP.
- **FR-002**: Requisições para rotas públicas (`/login`, `/api/auth/*`) DEVEM passar sem verificação de sessão.
- **FR-003**: Requisições para rotas protegidas sem sessão válida DEVEM redirecionar para `/login` com a rota original como `callbackUrl`, incluindo quando o banco de dados estiver indisponível.
- **FR-004**: O fluxo OAuth do Google DEVE completar com sucesso quando a URI de callback está corretamente cadastrada no Google Console.
- **FR-005**: As variáveis de ambiente `AUTH_URL` e `AUTH_SECRET` DEVEM estar presentes e corretas no ambiente de deploy.

### Key Entities

- **Middleware de Autenticação**: Intercepta todas as requisições, verifica sessão e aplica redirecionamentos conforme regras de acesso.
- **Sessão**: Registro da identidade autenticada do usuário, armazenado no banco de dados.
- **URI de Redirecionamento OAuth**: URL registrada no Google Console para o callback do fluxo de autenticação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Acessar a URL raiz do portal retorna redirecionamento (não erro 400) em 100% das tentativas.
- **SC-002**: O fluxo completo de login com Google (da página de login até o portal) é concluído com sucesso em menos de 30 segundos.
- **SC-003**: Nenhuma requisição à aplicação retorna erro 400 gerado internamente pelo middleware de autenticação.
- **SC-004**: Após o deploy, verificação manual nos logs do Cloud Run confirma ausência de entradas `ERR_HTTP_HEADERS_SENT` relacionadas ao middleware.

## Assumptions

- O banco de dados Cloud SQL está acessível a partir do ambiente de staging durante a execução do middleware.
- As variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretamente configuradas no gerenciador de segredos do Cloud Run.
- A URI `https://trocafigurinhas-staging-203084513594.southamerica-east1.run.app/api/auth/callback/google` está cadastrada como URI de redirecionamento autorizada no Google Console.
- O ambiente de staging utiliza a mesma configuração de autenticação que o ambiente de produção.
- O fix será aplicado em produção somente após validação bem-sucedida em staging (SC-001 a SC-004 confirmados).

## Clarifications

### Session 2026-05-29

- Q: Quando o banco de dados estiver indisponível, o middleware deve bloquear, permitir ou redirecionar? → A: Redirecionar para `/login` tratando como sessão ausente (fail safe).
- Q: Como validar SC-004 (ausência de ERR_HTTP_HEADERS_SENT) em staging? → A: Verificação manual nos logs do Cloud Run após deploy (única vez).
- Q: Quando aplicar o fix no serviço de produção? → A: Após validação bem-sucedida em staging.

## Root Cause Analysis

**Causa identificada**: O middleware de autenticação chamava `auth()` diretamente como função assíncrona (`await auth()`). No NextAuth v5, esse padrão faz com que o framework tente escrever cookies de sessão na resposta após o middleware já ter iniciado o envio da resposta, resultando em `ERR_HTTP_HEADERS_SENT` e status 400.

**Correção aplicada**: O middleware foi refatorado para usar o padrão `auth(handler)` — o handler é envolvido pelo NextAuth, que gerencia o ciclo de vida da resposta de forma coordenada, e a sessão é acessada via `req.auth` em vez de uma chamada de função separada.

**Commit**: `ab0dba8` — `fix: use auth() wrapper pattern in middleware to prevent 400/ERR_HTTP_HEADERS_SENT`
