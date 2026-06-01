# Feature Specification: Autenticação Exclusiva via Google

**Feature Branch**: `002-google-only-auth`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Remover verificação por e-mail. Permitir somente cadastro integrado pelo google."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Novo usuário se cadastra via Google (Priority: P1)

Um visitante que nunca usou o sistema acessa a plataforma e clica em "Entrar com Google". Após autenticar com sua conta Google, é redirecionado para o onboarding (CEP e nome de exibição) e em seguida para o álbum.

**Why this priority**: É o único fluxo de entrada do sistema. Sem ele, ninguém consegue usar a plataforma.

**Independent Test**: Pode ser testado criando uma conta nova do zero — acesso à tela inicial, autenticação com Google, conclusão do onboarding e visualização do álbum entrega valor completo.

**Acceptance Scenarios**:

1. **Given** o usuário acessa a página inicial sem sessão ativa, **When** clica em "Entrar com Google" e autoriza o acesso, **Then** uma conta é criada automaticamente e ele é redirecionado para o onboarding.
2. **Given** o usuário completa o onboarding com CEP e nome válidos, **When** salva, **Then** é redirecionado para `/album` com sessão ativa.
3. **Given** o usuário cancela o fluxo de autenticação no Google, **When** retorna ao sistema, **Then** permanece na tela inicial sem conta criada.

---

### User Story 2 - Usuário existente faz login via Google (Priority: P1)

Um usuário já cadastrado acessa a plataforma e clica em "Entrar com Google". O sistema reconhece o e-mail da conta Google e inicia a sessão diretamente.

**Why this priority**: Fluxo de retorno de todos os usuários cadastrados — sem ele o sistema fica inacessível após o primeiro acesso.

**Independent Test**: Pode ser testado realizando login com uma conta Google já associada a um usuário existente e verificando que sessão é iniciada sem onboarding.

**Acceptance Scenarios**:

1. **Given** o usuário possui conta vinculada ao e-mail Google, **When** autentica via Google, **Then** sessão é iniciada e ele é redirecionado para `/album`.
2. **Given** o usuário tenta acessar rota protegida sem sessão, **When** é redirecionado para o login e autentica via Google, **Then** é enviado de volta à rota original.

---

### User Story 3 - Tentativa de acesso por método não permitido (Priority: P2)

Um usuário tenta acessar o sistema por qualquer método que não seja Google OAuth (ex: digitando diretamente uma URL de login por e-mail/senha, ou chamando endpoints de registro via e-mail).

**Why this priority**: Garante que o sistema não permite cadastro ou login por métodos legados após a remoção.

**Independent Test**: Pode ser testado verificando que rotas e endpoints de autenticação por e-mail/senha retornam erro ou não estão disponíveis.

**Acceptance Scenarios**:

1. **Given** qualquer rota de autenticação por e-mail/senha, **When** acessada diretamente, **Then** retorna erro ou redireciona para o login Google.
2. **Given** a tela de login, **When** visualizada, **Then** exibe apenas a opção "Entrar com Google", sem campos de e-mail/senha.

---

### Edge Cases

- O que acontece se o usuário revogar a permissão do aplicativo nas configurações do Google? → Sessão expira normalmente no próximo acesso; usuário deve re-autorizar via Google.
- O que acontece se o e-mail da conta Google mudar? → O sistema deve usar o identificador único do Google (não o e-mail) como chave primária de identidade.
- O que acontece se o serviço do Google OAuth estiver indisponível? → Sistema exibe mensagem de erro amigável e orienta o usuário a tentar mais tarde.
- O que acontece com contas existentes criadas por e-mail/senha (se houver)? → Essas contas são desativadas ou migradas; usuários são orientados a usar Google.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE oferecer exclusivamente o Google OAuth como método de autenticação.
- **FR-002**: O sistema DEVE remover ou desabilitar todos os formulários e rotas de cadastro e login por e-mail/senha.
- **FR-003**: O sistema DEVE remover o fluxo de verificação de e-mail (envio e confirmação de link).
- **FR-004**: O sistema DEVE criar automaticamente uma conta de usuário no primeiro acesso via Google, usando o identificador único fornecido pelo Google.
- **FR-005**: O sistema DEVE iniciar sessão automaticamente para usuários já cadastrados que autentiquem via Google.
- **FR-006**: O sistema DEVE exibir mensagem de erro amigável quando o fluxo de autenticação Google falhar ou for cancelado.
- **FR-007**: O sistema DEVE redirecionar usuários não autenticados para o login ao acessar rotas protegidas, e após autenticação devolvê-los à rota original.
- **FR-008**: O sistema DEVE remover qualquer dependência do serviço de envio de e-mail transacional para o fluxo de autenticação.

### Key Entities

- **Usuário**: Identificado pelo ID único fornecido pelo Google (não pelo e-mail). Atributos: id, google_id, nome, e-mail (somente leitura, vindo do Google), avatar_url, criado_em.
- **Sessão**: Vinculada ao usuário autenticado via Google. Atributos: token, usuário_id, expira_em.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um novo usuário consegue criar conta e acessar o sistema em menos de 2 minutos, usando apenas a autenticação Google.
- **SC-002**: Nenhuma rota ou interface do sistema oferece cadastro ou login por e-mail/senha após a mudança.
- **SC-003**: 100% dos acessos ao sistema passam pelo fluxo Google OAuth — nenhum método alternativo está acessível.
- **SC-004**: O sistema não realiza nenhum envio de e-mail transacional relacionado à autenticação.
- **SC-005**: Usuários existentes com conta Google vinculada conseguem fazer login sem nenhuma ação adicional.

## Assumptions

- Todos os usuários possuem ou estão dispostos a criar uma conta Google para acessar a plataforma.
- Contas existentes criadas por e-mail/senha (se existirem em ambiente de desenvolvimento) serão descartadas — não há migração de dados de produção neste momento.
- O aplicativo Google OAuth já está ou será configurado no Google Cloud Console com as URIs de redirecionamento corretas.
- A dependência do SendGrid para autenticação pode ser removida completamente; notificações de match (uso futuro) estão fora do escopo desta feature.
- O identificador único do Google (sub/provider_account_id) será usado como chave de identidade, permitindo que o usuário mude o e-mail Google sem perder a conta.
