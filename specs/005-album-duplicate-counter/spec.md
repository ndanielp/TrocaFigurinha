# Feature Specification: Contador de Figurinhas Repetidas no Álbum

**Feature Branch**: `005-album-duplicate-counter`

**Created**: 2026-05-31

**Status**: Draft

**Input**: User description: "No álbum, após o usuário marcar que possui uma figurinha, exibir botões + e - para incluir/remover repetidas (cada clique no + acrescenta uma repetida, cada clique no - subtrai uma)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adicionar figurinhas repetidas (Priority: P1)

O usuário, ao visualizar uma figurinha que já marcou como "tenho", vê um botão "+". A cada clique no "+", uma figurinha repetida é registrada (a contagem de repetidas aumenta de 1 em 1). Isso permite informar com precisão quantas repetidas tem daquela figurinha, base para o sistema de trocas.

**Why this priority**: A contagem de repetidas é o insumo central do matching de trocas — sem ela, o usuário não consegue oferecer figurinhas. É o coração desta feature.

**Independent Test**: Marcar uma figurinha como "tenho", clicar "+" três vezes e confirmar que a figurinha mostra 3 repetidas, persistindo após recarregar a página.

**Acceptance Scenarios**:

1. **Given** uma figurinha marcada como "tenho" (sem repetidas), **When** o usuário clica em "+", **Then** a figurinha passa a ter 1 repetida e o contador exibe esse valor.
2. **Given** uma figurinha com 2 repetidas, **When** o usuário clica em "+", **Then** passa a ter 3 repetidas.
3. **Given** qualquer alteração na contagem, **When** o usuário recarrega a página, **Then** a contagem exibida reflete o último valor registrado.

---

### User Story 2 - Remover figurinhas repetidas (Priority: P1)

O usuário vê um botão "-" junto à figurinha que possui. A cada clique no "-", uma repetida é removida (a contagem diminui de 1 em 1). Quando a contagem chega a zero, a figurinha volta ao estado "tenho" (sem repetidas), sem ser perdida da coleção.

**Why this priority**: Corrigir excesso de repetidas é tão essencial quanto adicioná-las; ambos compõem a mesma interação de ajuste fino e entregam valor juntos.

**Independent Test**: Em uma figurinha com 2 repetidas, clicar "-" até zerar e confirmar que ela permanece como "tenho" (não volta para "preciso").

**Acceptance Scenarios**:

1. **Given** uma figurinha com 3 repetidas, **When** o usuário clica em "-", **Then** passa a ter 2 repetidas.
2. **Given** uma figurinha com 1 repetida, **When** o usuário clica em "-", **Then** a contagem vai a zero e a figurinha fica no estado "tenho" (sem repetidas).
3. **Given** uma figurinha no estado "tenho" sem repetidas, **When** exibida, **Then** o botão "-" não reduz abaixo de zero (sem efeito ou desabilitado).

---

### Edge Cases

- O que acontece ao clicar "+" ou "-" rapidamente várias vezes seguidas? A contagem final deve refletir o número líquido de cliques, sem perder atualizações.
- O que acontece com uma figurinha ainda no estado "preciso" (não possuída)? Os botões "+"/"-" não devem estar disponíveis até ela ser marcada como "tenho".
- O que acontece se a atualização falhar (ex.: rede)? A contagem exibida deve retornar ao valor real registrado, sem enganar o usuário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exibir os controles "+" e "-" somente para figurinhas que o usuário marcou como possuídas ("tenho").
- **FR-002**: Cada acionamento do controle "+" MUST aumentar em 1 a quantidade de repetidas daquela figurinha.
- **FR-003**: Cada acionamento do controle "-" MUST diminuir em 1 a quantidade de repetidas daquela figurinha.
- **FR-004**: Quando a quantidade de repetidas atinge zero, o sistema MUST manter a figurinha como possuída ("tenho"), sem removê-la da coleção e sem revertê-la para "preciso".
- **FR-005**: O sistema MUST NOT permitir quantidade de repetidas negativa.
- **FR-006**: O sistema MUST exibir, de forma visível, a quantidade atual de repetidas de cada figurinha possuída.
- **FR-007**: As alterações na quantidade de repetidas MUST persistir e estar refletidas em recarregamentos subsequentes e no sistema de trocas.

### Key Entities

- **Figurinha do usuário (user_sticker)**: vínculo entre usuário e figurinha. Atributos relevantes: estado (preciso / tenho / repetida) e quantidade de repetidas. A quantidade de repetidas só é maior que zero quando o estado é "repetida".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário consegue registrar a quantidade exata de repetidas de uma figurinha em menos de 5 segundos a partir do estado "tenho".
- **SC-002**: 100% das alterações de contagem confirmadas persistem após recarregar a página.
- **SC-003**: Zerar as repetidas mantém a figurinha como possuída em 100% dos casos (nunca volta para "preciso").
- **SC-004**: A quantidade de repetidas exibida no álbum coincide com a usada pelo sistema de trocas.

## Assumptions

- O fluxo de marcar uma figurinha como "tenho" já existe e permanece como porta de entrada para os controles "+"/"-".
- A contagem de repetidas substitui o atual ciclo de clique único (preciso → tenho → repetida → preciso) para figurinhas possuídas; o ajuste de repetidas passa a ser explícito via "+"/"-". A forma de voltar uma figurinha de "tenho" para "preciso" é tratada como detalhe de implementação no plano.
- A persistência usa o mecanismo de coleção já existente, que aceita quantidade de repetidas.
- O valor inicial de repetidas para uma figurinha recém-marcada como "tenho" é zero.
