# Feature Specification: Ordem do Álbum, Nome de Exibição, Match sem Reciprocidade e Redução de Custo

**Feature Branch**: `006-album-order-match-cost`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Times no álbum na ordem oficial da planilha; no onboarding mostrar o nome com opção de substituir ('Por qual nome gostaria de ser chamado?'); lista de match deve mostrar resultado mesmo sem reciprocidade (sem nome/detalhes, com chamada para incluir repetidas); reduzir custo de cloud usando instância Micro."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Álbum com times na ordem oficial (Priority: P1)

O usuário abre o álbum e vê as 48 seleções organizadas exatamente como no álbum físico oficial da Copa 2026: agrupadas por grupo (A a L), e dentro de cada grupo na ordem correta dos times. As seções especiais (abertura/história FWC e Coca-Cola) aparecem em suas posições corretas.

**Why this priority**: O álbum é a tela central do produto. Times na ordem errada (ou times de outra edição) tornam o álbum inutilizável para acompanhar a coleção real.

**Independent Test**: Abrir o álbum e conferir que os grupos A–L e os times de cada grupo batem com a planilha oficial (ex.: Grupo A = México, África do Sul, Coreia do Sul, Rep. Tcheca).

**Acceptance Scenarios**:

1. **Given** o álbum carregado, **When** o usuário percorre as seções, **Then** os grupos aparecem na ordem A, B, C … L.
2. **Given** o Grupo C, **When** exibido, **Then** mostra Brasil, Marrocos, Haiti, Escócia nessa ordem.
3. **Given** as seções especiais, **When** exibidas, **Then** as figurinhas FWC (história/abertura) e Coca-Cola aparecem em suas seções próprias, separadas das seleções.

---

### User Story 2 - Nome de exibição no onboarding (Priority: P2)

Durante o onboarding, o usuário vê o nome que veio da conta Google já preenchido em um campo rotulado "Por qual nome gostaria de ser chamado?" e pode mantê-lo ou substituí-lo. O nome escolhido é o usado em todo o sistema (incluindo na lista de matches, quando aplicável).

**Why this priority**: Personalização simples que melhora a experiência, mas não bloqueia o uso do álbum. Depende do onboarding já existente.

**Independent Test**: Logar com uma conta nova, chegar ao onboarding, confirmar que o campo de nome vem preenchido com o nome do Google e que é possível editá-lo antes de concluir.

**Acceptance Scenarios**:

1. **Given** um usuário novo no onboarding, **When** a tela carrega, **Then** o campo "Por qual nome gostaria de ser chamado?" aparece preenchido com o nome da conta Google.
2. **Given** o usuário edita o campo de nome, **When** conclui o onboarding, **Then** o novo nome é salvo e passa a ser exibido no sistema.
3. **Given** o usuário não altera o campo, **When** conclui o onboarding, **Then** o nome do Google é mantido.

---

### User Story 3 - Match sem reciprocidade (descoberta de demanda) (Priority: P1)

Mesmo quando não há troca recíproca completa, o usuário vê na lista de matches uma indicação de que existe alguém próximo com figurinhas que ele precisa — sem revelar o nome do parceiro nem permitir ver os detalhes. A entrada exibe uma chamada do tipo "Alguém próximo tem figurinhas que você precisa — inclua suas repetidas para ver". Quando há reciprocidade, o match completo (com nome e detalhes) é exibido normalmente.

**Why this priority**: Incentiva o usuário a cadastrar suas repetidas (gerando reciprocidade), resolvendo o problema atual de listas vazias e criando engajamento. É o motor de crescimento do uso.

**Independent Test**: Com um usuário A que tem repetidas e um usuário B que só marcou o que precisa (sem repetidas próprias), confirmar que B vê a entrada anônima de "alguém próximo tem o que você precisa" e que, ao adicionar repetidas que A precisa, o match passa a exibir nome e detalhes.

**Acceptance Scenarios**:

1. **Given** existe alguém próximo com figurinhas que eu preciso, mas eu não tenho repetidas que essa pessoa precisa, **When** abro a lista de matches, **Then** vejo uma entrada anônima com a chamada para incluir minhas repetidas, sem nome nem botão de detalhes.
2. **Given** uma entrada anônima de match, **When** tento ver detalhes, **Then** não há acesso aos detalhes nem ao nome do parceiro.
3. **Given** que passo a ter repetidas que o parceiro precisa (reciprocidade), **When** recarrego a lista, **Then** o match aparece completo com nome e opção de ver detalhes.
4. **Given** que não há ninguém próximo com figurinhas que eu preciso, **When** abro a lista, **Then** vejo a mensagem de lista vazia (nenhuma oportunidade).

---

### User Story 4 - Redução de custo de cloud (Priority: P3)

O ambiente roda com custo reduzido de infraestrutura, adequado ao estágio de MVP/poucos usuários, sem perda de funcionalidade perceptível para o usuário final.

**Why this priority**: Importante para o operador (custo), mas invisível para o usuário e não bloqueia funcionalidades. Feito por último para não arriscar estabilidade durante o desenvolvimento das outras histórias.

**Independent Test**: Após a mudança, confirmar que login, álbum, onboarding e matches continuam funcionando, e que o custo mensal estimado da infraestrutura caiu.

**Acceptance Scenarios**:

1. **Given** a infraestrutura reconfigurada para menor custo, **When** o usuário usa o portal (login, álbum, matches), **Then** todas as funções operam normalmente.
2. **Given** períodos sem acesso, **When** não há tráfego, **Then** o serviço de aplicação escala para zero instâncias (sem custo de CPU ocioso).

### Edge Cases

- Times com nomes acentuados/compostos (ex.: "Rep. Tcheca", "Curaçao") devem exibir corretamente.
- Onboarding com nome do Google vazio ou ausente: o campo deve permitir digitar um nome (não pode ficar travado).
- Match anônimo não pode vazar nenhuma informação identificável do parceiro (nem nome, nem avatar, nem distância exata que permita deduzir quem é).
- Recriação do catálogo apaga as marcações de figurinhas existentes (ambiente de teste) — usuários precisarão remarcar.
- Sob a instância de menor capacidade, picos de acesso simultâneo podem ficar mais lentos; aceitável para o estágio atual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O catálogo de figurinhas MUST refletir as 48 seleções oficiais da Copa 2026, conforme a planilha de referência, substituindo o catálogo atual (que contém times de outra edição).
- **FR-002**: O álbum MUST exibir as seleções agrupadas por grupo, na ordem A→L, e os times na ordem correta dentro de cada grupo, conforme a planilha.
- **FR-003**: O álbum MUST manter as seções especiais (FWC e Coca-Cola) separadas das seleções, em suas posições próprias.
- **FR-004**: O onboarding MUST exibir um campo rotulado "Por qual nome gostaria de ser chamado?" pré-preenchido com o nome da conta Google.
- **FR-005**: O usuário MUST poder editar esse nome durante o onboarding; o valor final MUST ser persistido e usado como nome de exibição no sistema.
- **FR-006**: A lista de matches MUST incluir entradas para parceiros próximos que possuem figurinhas que o usuário precisa, mesmo sem reciprocidade.
- **FR-007**: Entradas de match sem reciprocidade MUST ser anônimas: sem nome, sem avatar e sem acesso a detalhes, exibindo uma chamada para o usuário incluir suas repetidas.
- **FR-008**: Entradas de match com reciprocidade MUST exibir nome do parceiro e permitir ver detalhes (comportamento atual).
- **FR-009**: O sistema MUST impedir o acesso aos detalhes/identidade de um parceiro enquanto a entrada estiver no estado anônimo.
- **FR-010**: A infraestrutura de banco de dados MUST ser reconfigurada para um nível de menor custo (instância Micro), e o serviço de aplicação MUST escalar para zero quando não houver tráfego.
- **FR-011**: Após a redução de custo, todas as funcionalidades (login, onboarding, álbum, matches) MUST permanecer operacionais.

### Key Entities

- **Figurinha (catálogo)**: item do álbum. Atributos relevantes: identificador, seção (seleção/FWC/Coca-Cola), grupo (A–L para seleções), time, posição dentro da seção/ordem oficial.
- **Usuário**: atributo relevante para esta feature — nome de exibição (escolhido no onboarding).
- **Match**: relação entre o usuário e um parceiro próximo. Estados: anônimo (parceiro tem o que eu preciso, sem reciprocidade) e completo (reciprocidade — exibe nome e detalhes).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos 12 grupos e 48 times do álbum coincidem com a planilha oficial (nome, grupo e ordem).
- **SC-002**: Um usuário novo consegue confirmar ou alterar seu nome de exibição no onboarding em menos de 30 segundos.
- **SC-003**: Um usuário que só cadastrou figurinhas que precisa (sem repetidas próprias) vê pelo menos uma indicação de oportunidade de match quando ela existe, em vez de lista vazia.
- **SC-004**: Nenhuma informação identificável do parceiro é exposta em entradas de match anônimas (verificável por inspeção do que a tela disponibiliza).
- **SC-005**: O custo mensal estimado da infraestrutura é reduzido em relação à configuração atual, sem regressão funcional.

## Assumptions

- A ordem oficial usada é a da planilha em `Modelos/Planilha de Controle de Figurinhas do Álbum da Copa do Mundo 2026.xlsx` (grupos A–L; 4 times por grupo; 20 figurinhas por time; FWC e Coca-Cola como seções especiais).
- O ambiente é de teste/MVP; recriar o catálogo e apagar as marcações atuais dos usuários é aceitável (não há dados de produção a preservar).
- "Próximo" no contexto de match anônimo segue a mesma noção de proximidade já usada nos matches recíprocos (distância por CEP, tolerando CEP sem centroide).
- "Instância Micro" refere-se ao menor nível de banco gerenciado disponível na mesma plataforma de nuvem já usada.
- O disco do banco gerenciado não pode ser reduzido sem recriar a instância; "reduzir disco" só se aplica se a instância for recriada do zero. Caso contrário, a economia vem do nível Micro + escala-a-zero da aplicação.
- A privacidade do match anônimo não deve permitir inferência de identidade (ex.: não expor distância exata que isole um único parceiro).
