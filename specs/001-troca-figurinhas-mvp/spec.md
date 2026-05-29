# Feature Specification: Plataforma de Troca de Figurinhas — MVP

**Feature Branch**: `001-troca-figurinhas-mvp`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: "Req. Troca Figurinhas.MD" — Plataforma web (PWA mobile-first) de matching para
álbum da Copa do Mundo FIFA 2026, conectando colecionadores para troca de figurinhas repetidas com
priorização de matches bilaterais e proximidade geográfica.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cadastro, Autenticação e Perfil (Priority: P1)

Um novo colecionador acessa o portal, cria uma conta (via e-mail/senha ou Google), completa o
onboarding informando nome de exibição, CEP e opcionalmente o número do WhatsApp, define se deseja
que seu WhatsApp seja exibido para matches, e aceita os Termos de Uso e a Política de Privacidade.
Ao retornar em sessões futuras, o usuário faz login e acessa diretamente seu painel.

**Why this priority**: Sem identidade autenticada nenhuma outra funcionalidade é acessível. É a porta
de entrada do produto e o bloco que garante privacidade e conformidade com a LGPD.

**Independent Test**: Pode ser validado isoladamente criando uma conta do zero, completando o
onboarding e confirmando que os dados de perfil ficam salvos e o login subsequente funciona.

**Acceptance Scenarios**:

1. **Given** um visitante sem conta, **When** ele escolhe "Criar conta com e-mail", **Then** o sistema
   cria a conta, inicia o fluxo de onboarding e só libera o painel após a conclusão do onboarding.
2. **Given** um visitante sem conta, **When** ele escolhe "Entrar com Google", **Then** o sistema
   autentica via OAuth 2.0, inicia o onboarding (se primeira vez) e libera o painel.
3. **Given** um usuário com conta existente, **When** ele faz login, **Then** o sistema o redireciona
   diretamente para o painel sem repetir o onboarding.
4. **Given** o fluxo de onboarding, **When** o usuário não aceita os Termos e Política de Privacidade,
   **Then** o sistema bloqueia o acesso ao painel e mantém o onboarding incompleto.
7. **Given** um usuário em estado `pending_parental_consent` cujo token expirou, **When** ele
   acessa a tela de espera e solicita reenvio, **Then** o sistema envia novo e-mail ao
   responsável e bloqueia novo reenvio por 24 horas.
5. **Given** o fluxo de onboarding, **When** o usuário omite o WhatsApp, **Then** o sistema conclui o
   onboarding sem WhatsApp e o usuário fica invisível para contato via WhatsApp em matches.
6. **Given** um usuário autenticado, **When** ele solicita "Excluir conta", **Then** o sistema remove
   todos os seus dados (perfil, coleção, histórico de matches) e revoga todas as sessões ativas.

---

### User Story 2 — Gerenciamento da Coleção (Priority: P1)

Um colecionador autenticado abre a interface visual do álbum, navega pelas seções (32 seleções +
figurinhas especiais) e marca cada figurinha com seu estado: não tenho, tenho ou repetida (com
quantidade). Ele pode usar marcação rápida por toque individual ou ações em lote para marcar/limpar
uma seleção inteira.

**Why this priority**: A coleção do usuário é o dado central de todo o sistema de matching. Sem ela,
nenhum match pode ser calculado. Junto com autenticação, forma o MVP mínimo.

**Independent Test**: Pode ser validado abrindo o álbum de um usuário recém-criado, marcando figurinhas
individualmente e em lote, e confirmando que os estados persistem após atualização da página.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado sem coleção registrada, **When** ele acessa o álbum, **Then** todas
   as figurinhas aparecem com estado "não tenho" por padrão.
2. **Given** uma figurinha no estado "não tenho", **When** o usuário toca uma vez nela, **Then** o
   estado muda para "tenho".
3. **Given** uma figurinha no estado "tenho", **When** o usuário pressiona longamente ou toca "+",
   **Then** o estado muda para "repetida" com quantidade 1; toques adicionais incrementam a quantidade.
4. **Given** uma seção (seleção) do álbum, **When** o usuário aciona "marcar seleção inteira como tenho",
   **Then** todas as figurinhas daquela seção recebem estado "tenho".
5. **Given** uma seção com figurinhas marcadas, **When** o usuário aciona "limpar seleção", **Then**
   todas as figurinhas daquela seção voltam para "não tenho" e quantidade de repetidas é zerada.
6. **Given** o usuário alterna entre seções, **When** retorna a uma seção já preenchida, **Then** os
   estados previamente marcados estão preservados.

---

### User Story 3 — Matching e Contato com Colecionadores (Priority: P2)

Um colecionador com coleção registrada acessa a lista de matches, vê colecionadores próximos
ranqueados por volume de troca bilateral, aplica filtros de distância e score mínimo, visualiza o
detalhe completo de um match (o que cada lado dá e recebe) e, se ambos optaram pelo WhatsApp,
inicia contato via WhatsApp.

**Why this priority**: É a proposta de valor central do produto — mas só agrega valor quando há
usuários com coleções registradas. Portanto depende de US1 e US2 estarem funcionais.

**Independent Test**: Pode ser validado com dois usuários de teste que têm coleções complementares,
confirmando que o match bilateral aparece na lista de ambos com score e distância corretos.

**Acceptance Scenarios**:

1. **Given** um usuário com coleção registrada, **When** ele acessa "Meus Matches", **Then** o sistema
   exibe cards de outros usuários ranqueados por `score_troca DESC, distancia_km ASC`.
2. **Given** a lista de matches, **When** o usuário aplica filtro de distância máxima, **Then** apenas
   matches dentro do raio selecionado aparecem.
3. **Given** a lista de matches, **When** o usuário aplica filtro de score mínimo, **Then** apenas
   matches com score ≥ ao valor informado aparecem.
4. **Given** um card de match, **When** o usuário toca "ver detalhe", **Then** vê a listagem completa
   de figurinhas que dará ↔ figurinhas que receberá naquele match.
5. **Given** dois usuários ambos com opt-in de WhatsApp, **When** um abre o detalhe do match,
   **Then** o botão "Abrir WhatsApp" aparece e abre `wa.me/<numero>` no sistema operacional.
6. **Given** um usuário sem opt-in de WhatsApp ou cujo match também não tem opt-in, **When** acessa
   o detalhe do match, **Then** o botão "Abrir WhatsApp" NÃO aparece.
7. **Given** matches unilaterais (usuário só dá ou só recebe), **When** o usuário acessa a aba
   "Matches unilaterais", **Then** estes aparecem separados dos matches bilaterais.

---

### User Story 4 — Painel e Estatísticas (Priority: P3)

Um colecionador autenticado acessa seu painel pessoal e visualiza o progresso do álbum: percentual
de conclusão, total de repetidas disponíveis para troca e as 5 figurinhas mais demandadas pela
comunidade entre suas repetidas.

**Why this priority**: Agrega valor em orientar o usuário sobre quão atrativo é para troca, mas não
é bloqueante para que matches aconteçam.

**Independent Test**: Pode ser validado com um usuário que tem coleção registrada e ao menos um
match, verificando que as estatísticas refletem o estado real da coleção.

**Acceptance Scenarios**:

1. **Given** um usuário com coleção parcialmente preenchida, **When** acessa o painel, **Then** vê
   o percentual de conclusão do álbum calculado corretamente.
2. **Given** um usuário com figurinhas repetidas, **When** acessa o painel, **Then** vê o total de
   repetidas disponíveis para troca.
3. **Given** um usuário com repetidas, **When** acessa o painel, **Then** vê as 5 figurinhas mais
   demandadas pela comunidade entre as suas repetidas (baseado na demanda de outros usuários).

---

### Edge Cases

- O que acontece quando dois usuários têm match bilateral mas um exclui a conta antes do contato?
- Como o sistema se comporta se o CEP informado for inválido ou não reconhecido?
- O que acontece quando um usuário remove opt-in do WhatsApp depois de já aparecer como contato em matches?
- Como o ranking de matches se comporta para usuário com coleção vazia (sem repetidas)?
- O que acontece com figurinhas já marcadas se o álbum oficial sofrer atualização de conteúdo?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema MUST permitir criação de conta com e-mail e senha. A conta fica ativa
  imediatamente após o registro — verificação de e-mail é opcional e não bloqueia o acesso.
  Um badge "e-mail não verificado" DEVE ser exibido no perfil enquanto o e-mail não for
  confirmado, mas não impede onboarding nem uso da plataforma.
- **FR-002**: Sistema MUST oferecer autenticação via Google OAuth 2.0 como alternativa à senha.
- **FR-003**: Usuário MUST completar onboarding informando nome de exibição e CEP antes de acessar
  o painel; WhatsApp e opt-in são opcionais.
- **FR-004**: Sistema MUST exigir aceite explícito dos Termos de Uso e Política de Privacidade no
  onboarding; sem aceite, o acesso é bloqueado.
- **FR-005**: Sistema MUST confirmar que o usuário tem ao menos 13 anos durante o onboarding.
  Usuário em estado `pending_parental_consent` MUST poder solicitar reenvio do e-mail de
  consentimento ao responsável, com cooldown de 24 horas entre reenvios.
  Usuários entre 13 e 15 anos MUST ter consentimento de responsável legal verificado antes de
  acessar o painel, conforme LGPD art. 14 §1. Usuários menores de 13 anos MUST ser bloqueados.
- **FR-006**: Sistema MUST exibir interface visual do álbum organizada por seções: 48 seleções
  nacionais (organizadas em 12 grupos A–L), figurinhas especiais do torneio (FWC) e figurinhas
  promocionais Coca-Cola (CC) — 994 figurinhas no catálogo total.
- **FR-007**: Cada figurinha MUST ter três estados possíveis: `não tenho`, `tenho`, `repetida`
  (com quantidade inteira ≥ 1).
- **FR-008**: Sistema MUST suportar marcação rápida: toque único = `tenho`; long-press ou botão
  "+" = incrementa repetida.
- **FR-009**: Sistema MUST suportar ações em lote por seção: "marcar tudo como tenho" e "limpar
  seção".
- **FR-010**: Sistema MUST calcular score bilateral entre pares de usuários:
  `score = min(|figurinhas que eu dou|, |figurinhas que eu recebo|)`. O cálculo inclui
  todas as 994 figurinhas do catálogo (oficiais Panini + promocionais Coca-Cola) — qualquer
  figurinha marcada como `duplicate` entra no algoritmo independentemente do tipo.
- **FR-011**: Sistema MUST calcular distância entre usuários usando centroides de CEP (fórmula
  haversine).
- **FR-012**: Lista de matches MUST ser ranqueada por `score DESC, distância ASC` como padrão.
- **FR-013**: Sistema MUST permitir filtragem de matches por distância máxima (5/10/25/50/100/200 km
  ou qualquer) e score mínimo.
- **FR-014**: Matches bilaterais MUST aparecer na lista principal; matches unilaterais em aba
  separada.
- **FR-015**: Card de match MUST exibir: avatar/nome do outro usuário, score, distância, prévia das
  figurinhas a trocar.
- **FR-016**: Botão de contato WhatsApp MUST aparecer no detalhe do match somente quando AMBOS os
  usuários têm opt-in ativo.
- **FR-017**: Detalhe do match MUST exibir lista completa: figurinhas que eu dou ↔ figurinhas que
  eu recebo.
- **FR-018**: Painel MUST exibir: percentual de conclusão do álbum oficial (980 figurinhas
  Panini; exclui as 14 promocionais Coca-Cola), total de repetidas disponíveis para troca,
  top 5 figurinhas mais demandadas entre as repetidas do usuário.
- **FR-019**: Sistema MUST armazenar apenas o CEP do usuário (não endereço completo).
- **FR-020**: Número de WhatsApp MUST ser revelado apenas em matches reais quando ambos têm opt-in;
  nunca exposto publicamente no perfil.
- **FR-021**: Sistema MUST oferecer exclusão de conta que remove todos os dados do usuário
  (perfil, coleção, matches) e revoga todas as sessões ativas.
- **FR-022**: Usuário autenticado MUST poder editar seu perfil a qualquer momento após o
  onboarding: nome de exibição, CEP, número de WhatsApp e opt-in de WhatsApp. Alteração de
  CEP recalcula a posição geográfica nos matches subsequentes.
- **FR-023**: Avatar do usuário exibido em cards de match MUST ser: a foto de perfil do Google
  (para usuários autenticados via Google OAuth), ou iniciais do nome de exibição geradas
  automaticamente com cor derivada do hash do ID (para usuários com email/senha). Não há
  upload de foto de perfil no MVP.

### Key Entities

- **Usuário**: nome de exibição, e-mail, método de autenticação, CEP, número do WhatsApp
  (opcional), flag de opt-in WhatsApp, confirmação de idade, aceite de termos, data de criação.
- **Figurinha**: seção do álbum (seleção/especial), número, nome.
- **Figurinha do Usuário**: usuário, figurinha, estado (`não_tenho`/`tenho`/`repetida`),
  quantidade (relevante apenas para `repetida`).
- **Match**: par de usuários, score bilateral, distância em km, lista de figurinhas trocadas
  (A→B e B→A).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Novos usuários completam cadastro e onboarding em menos de 3 minutos.
- **SC-002**: Usuários conseguem registrar toda a sua coleção em menos de 10 minutos usando a
  interface visual.
- **SC-003**: A lista de matches carrega em até 3 segundos para usuários com coleção completa.
- **SC-004**: 90% dos usuários com ao menos 10 figurinhas repetidas têm ao menos um match
  bilateral visível.
- **SC-005**: Exclusão de conta completa em até 30 segundos removendo todos os dados pessoais.
- **SC-006**: O percentual de conclusão exibido no painel reflete com precisão o estado atual
  da coleção do usuário.
- **SC-007**: O botão de contato via WhatsApp só aparece quando ambos os usuários têm opt-in
  ativo — nunca em nenhuma outra condição.

---

## Assumptions

- A plataforma atende exclusivamente usuários no Brasil (geolocalização baseada em CEP).
- O álbum oficial Panini da Copa do Mundo FIFA 2026 contém 980 figurinhas (48 seleções × 20
  figurinhas + 20 especiais do torneio FWC). O catálogo do sistema inclui ainda 14 figurinhas
  promocionais Coca-Cola (fora do álbum oficial), totalizando 994 figurinhas.
- O matching é calculado sob demanda quando o usuário abre a tela de matches (não há push
  em tempo real para MVP).
- WhatsApp é o único canal de contato direto entre usuários para o MVP.
- O produto deve funcionar plenamente em dispositivos móveis com navegador moderno (mobile-first).
- Português (Brasil) é o único idioma suportado no MVP.
- Usuários que não informam WhatsApp ou não ativam opt-in permanecem disponíveis para matching,
  mas não para contato direto.
- A privacidade do CEP é preservada: apenas a distância calculada é exibida, nunca o CEP bruto.

## Clarifications

### Session 2026-05-28

- Q: Verificação de e-mail é obrigatória antes do onboarding ou opcional? → A: Opcional — conta ativa imediatamente; badge "e-mail não verificado" exibido mas sem bloqueio de acesso.
- Q: Figurinhas Coca-Cola (CC) entram no algoritmo de matching bilateral? → A: Sim — todas as 994 figurinhas do catálogo (oficiais + CC) são elegíveis para troca.
- Q: Usuário pode editar CEP, WhatsApp e opt-in após o onboarding? → A: Sim — perfil totalmente editável via página de configurações; alteração de CEP impacta matches subsequentes.
- Q: Avatar nos cards de match — foto de perfil, iniciais ou foto do Google? → A: Foto do Google para usuários OAuth; iniciais geradas por hash para usuários email/senha; sem upload de foto no MVP.
- Q: Token de consentimento parental expirado — reenvio disponível ou usuário deve recriar conta? → A: Reenvio disponível na tela de espera; cooldown de 24h entre reenvios.
