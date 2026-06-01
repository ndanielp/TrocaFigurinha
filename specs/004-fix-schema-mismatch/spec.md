# Feature Specification: Corrigir Incompatibilidade de Schema do Banco de Dados

**Feature Branch**: `004-fix-schema-mismatch`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "fix the schema mismatch"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login com Google OAuth (Priority: P1)

Um usuário acessa o portal, clica em "Entrar com Google", é redirecionado ao Google, autoriza o acesso e retorna ao portal autenticado, com sessão criada e perfil visível.

**Why this priority**: Sem login funcional, nenhuma outra funcionalidade do portal é acessível. É o pré-requisito de todo o MVP.

**Independent Test**: Pode ser testado abrindo o portal em aba anônima, clicando em "Entrar com Google" e verificando que o usuário chega à tela inicial autenticado.

**Acceptance Scenarios**:

1. **Given** um visitante não autenticado na página de login, **When** clica em "Entrar com Google" e autoriza no Google, **Then** é redirecionado ao portal autenticado sem mensagem de erro.
2. **Given** um usuário que já fez login antes, **When** retorna ao portal com sessão ativa, **Then** permanece autenticado sem precisar logar novamente.
3. **Given** um usuário que tenta logar, **When** o banco de dados está indisponível, **Then** é redirecionado para a tela de login com mensagem de erro amigável (sem exposição de detalhes técnicos).

---

### User Story 2 - Persistência de Sessão (Priority: P2)

Após login, a sessão do usuário deve ser salva no banco de dados e recuperada em acessos subsequentes dentro do prazo de validade (24h).

**Why this priority**: Sessões são essenciais para não forçar o usuário a logar a cada visita.

**Independent Test**: Pode ser testado fazendo login, fechando e reabrindo o browser, e verificando que o usuário permanece autenticado.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** fecha e reabre o browser antes de 24h, **Then** permanece autenticado.
2. **Given** um usuário autenticado há mais de 24h, **When** acessa o portal, **Then** é redirecionado para login (sessão expirada).

---

### Edge Cases

- O que acontece se o usuário já existe no banco com email igual mas sem conta Google vinculada?
- O que acontece se o banco de dados não tiver as tabelas criadas (schema não aplicado)?
- O que acontece se o Google retornar um perfil sem e-mail?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE criar e recuperar sessões de usuário persistidas no banco de dados após autenticação via Google OAuth.
- **FR-002**: O sistema DEVE armazenar a conta Google vinculada ao usuário para uso em logins futuros.
- **FR-003**: O sistema DEVE criar automaticamente um registro de usuário no primeiro login via Google, caso não exista.
- **FR-004**: O sistema DEVE rejeitar login de usuários com status `suspended`.
- **FR-005**: O schema do banco de dados DEVE ser compatível com os nomes de colunas e tabelas esperados pelo adaptador de autenticação.
- **FR-006**: O schema DEVE conter todas as colunas obrigatórias para o fluxo de sessão de banco de dados (`accounts`, `sessions`, `users`, `verification_token`).

### Key Entities

- **users**: Representa o usuário do sistema. Atributos-chave para autenticação: identificador único, e-mail, nome de exibição, foto de perfil, status da conta, data de verificação do e-mail.
- **accounts**: Vínculo entre usuário e provedor OAuth (Google). Atributos: provedor, ID da conta no provedor, tipo de conta, tokens de acesso.
- **sessions**: Sessão ativa de um usuário. Atributos: token de sessão único, referência ao usuário, data de expiração.
- **verification_token**: Token de verificação de identidade (nome no singular, sem "s" no final).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue completar o fluxo de login com Google em menos de 10 segundos, do clique ao portal autenticado.
- **SC-002**: 100% das tentativas de login com conta Google válida e não suspensa resultam em sessão criada com sucesso.
- **SC-003**: Sessões persistem corretamente pelo período configurado (24h), sem deslogar o usuário prematuramente.
- **SC-004**: Zero erros de "column does not exist" ou "table does not exist" nos logs após a correção aplicada.

## Assumptions

- O adaptador de autenticação utilizado segue convenções de nomes de colunas em camelCase com aspas duplas no SQL (ex: `"userId"`, `"sessionToken"`, `"emailVerified"`).
- A tabela de tokens de verificação deve se chamar `verification_token` (singular), não `verification_tokens` (plural).
- A coluna `emailVerified` na tabela `users` deve armazenar uma timestamp (TIMESTAMPTZ), não um booleano.
- A coluna `name` na tabela `users` é o nome de exibição do adaptador (mapeado do campo `display_name` atual).
- A coluna `image` na tabela `users` é a foto de perfil do adaptador (mapeado do campo `avatar_url` atual).
- A tabela `accounts` deve incluir a coluna `type` (ex: `"oauth"`), ausente no schema atual.
- As migrações SQL serão aplicadas manualmente no banco de staging após geradas.
- Dados existentes no banco (se houver) podem ser descartados, pois é ambiente de staging em fase inicial.
