# Research: Ordem do Álbum, Nome de Exibição, Match sem Reciprocidade e Custo

**Feature**: 006-album-order-match-cost | **Date**: 2026-06-01

## Questão 1: Ordem oficial e estrutura dos times (planilha 2026)

**Decisão**: Usar os 48 times em 12 grupos (A–L), 4 por grupo, 20 figurinhas numeradas (1–20) cada. Confirmado lendo a aba "Home" da planilha — cada linha de time tem colunas 1..20, sem nomes de jogadores (só números). Slugs de 3 letras vindos da própria planilha.

**Ordem oficial (grupo: times):**
- A: México (MEX), África do Sul (RSA), Coreia do Sul (KOR), Rep. Tcheca (CZE)
- B: Canadá (CAN), Bósnia (BIH), Catar (QAT), Suíça (SUI)
- C: Brasil (BRA), Marrocos (MAR), Haiti (HAI), Escócia (SCO)
- D: Estados Unidos (USA), Paraguai (PAR), Austrália (AUS), Turquia (TUR)
- E: Alemanha (GER), Curaçao (CUW), Costa do Marfim (CIV), Equador (ECU)
- F: Holanda (NED), Japão (JPN), Suécia (SWE), Tunísia (TUN)
- G: Bélgica (BEL), Egito (EGY), Irã (IRN), Nova Zelândia (NZL)
- H: Espanha (ESP), Cabo Verde (CPV), Arábia Saudita (KSA), Uruguai (URU)
- I: França (FRA), Senegal (SEN), Iraque (IRQ), Noruega (NOR)
- J: Argentina (ARG), Argélia (ALG), Áustria (AUT), Jordânia (JOR)
- K: Portugal (POR), Congo (COD), Uzbequistão (UZB), Colômbia (COL)
- L: Inglaterra (ENG), Croácia (CRO), Gana (GHA), Panamá (PAN)

**Seções especiais** (mantidas):
- FWC (tournament_special): figurinhas de abertura/história, 20 itens (FWC0–FWC19).
- Coca-Cola (promotional, is_official_album=false): 14 itens (CC0–CC13).

**Rationale**: É a fonte de verdade pedida pelo usuário. O catálogo atual no banco é de outra edição e será substituído (decisão do usuário: recriar catálogo completo).

**Alternativas consideradas**: extrair nomes de jogadores → impossível (planilha só tem números).

---

## Questão 2: Como recriar o catálogo sem quebrar referências

**Decisão**: Reescrever `infra/seeds/stickers.sql` com os 48 times corretos (mantendo o bloco FWC e CC já existentes). Como `user_stickers` referencia `stickers(id)` e o id é `SERIAL`, a recriação limpa exige: limpar `user_stickers`, remover os `stickers` de seleções antigas e reinserir. Em staging os dados de marcação são descartáveis (decisão do usuário).

**Naming key**: manter o padrão `<SLUG><n>` (ex.: `BRA1`..`BRA20`) para `natural_key`. `position_in_section` = número (1–20). `group_code` = letra do grupo. A ordenação do álbum usa `ORDER BY` por uma ordem de grupo + ordem de time.

**Problema de ordenação**: a query atual (`getUserAlbum`) ordena por `s.section_type, s.group_code, s.team_slug, s.position_in_section`. Ordenar por `team_slug` alfabético **quebra** a ordem oficial (ex.: no grupo C, BRA < MAR < SCO mas HAI deveria vir antes de SCO). Solução: adicionar uma coluna de ordenação explícita `team_order` (ou `section_order`) na tabela `stickers`, refletindo a posição oficial do time, e ordenar por ela.

**Rationale**: ordenar por slug é frágil; uma coluna numérica de ordem é determinística e casa 100% com a planilha (SC-001).

**Alternativa considerada**: ordenar via CASE/array fixo na query → rejeitada (lógica de ordem espalhada na query; coluna é mais limpa e reutilizável).

---

## Questão 3: Nome de exibição no onboarding

**Decisão**: Adicionar o campo "Por qual nome gostaria de ser chamado?" no `onboarding/page.tsx`, pré-preenchido com o nome da sessão (`session.user.name`, vindo do adapter/Google). Enviar `displayName` no payload de `complete_onboarding`. O backend (`completeOnboarding` em `users.ts`) passa a gravar `name`.

**Estado atual**: o onboarding hoje só coleta CEP/WhatsApp; o `completeOnboarding` não atualiza `name`. O endpoint `PATCH /api/user/profile` já tem `updateUserProfile` que aceita `displayName` → reaproveitar a coluna `name`.

**Rationale**: reuso máximo do que existe; uma coluna (`users.name`) já é o nome de exibição (usada em matches).

---

## Questão 4: Match sem reciprocidade (entrada anônima)

**Decisão**: Adicionar uma segunda consulta (ou estender a existente) que encontra parceiros próximos que têm duplicatas que o usuário precisa (`eu_recebo >= 1`), **independente** de `eu_dou`. Classificar cada resultado:
- `eu_dou >= 1 E eu_recebo >= 1` → match **completo** (nome + detalhes), como hoje.
- `eu_recebo >= 1 E eu_dou = 0` → entrada **anônima** (sem nome, avatar, distância exata, sem link de detalhes).

A API retorna entradas anônimas com campos identificáveis **omitidos no servidor** (não apenas escondidos no front) — FR-009/SC-004. A entrada anônima carrega só um indicador de que existe oportunidade (ex.: contagem agregada), nunca `partnerId`.

**Proteção de detalhes**: o endpoint `/api/matches/[partnerId]` deve recusar (404/403) quando não há reciprocidade com aquele parceiro, para impedir acesso direto por URL.

**Rationale**: mover a decisão de anonimato para o servidor evita vazamento via inspeção de rede (a spec exige que nenhuma info identificável seja exposta).

**Alternativa considerada**: esconder só no front → rejeitada (vaza no payload da API).

---

## Questão 5: Redução de custo (Cloud SQL Micro + scale-to-zero)

**Decisão**:
1. **Cloud Run**: definir `min-instances=0` (scale-to-zero) no serviço — sem CPU ociosa custando. `maxScale` permanece baixo.
2. **Cloud SQL**: migrar tier `db-g1-small` → `db-f1-micro` via `gcloud sql instances patch`.
3. **Disco**: o disco do Cloud SQL **não pode ser reduzido** por patch (só cresce). Hoje são 10GB SSD. Para reduzir, seria preciso recriar a instância (dump → nova instância menor → restore). Avaliar se vale o esforço; o ganho principal vem do tier Micro + scale-to-zero.

**Rationale**: tier Micro + scale-to-zero entregam a maior parte da economia com baixo risco e sem downtime relevante. Recriar a instância só pelo disco tem custo/risco alto para ganho pequeno no estágio atual.

**Atenção**: `db-f1-micro` é shared-core (~0.6GB RAM). Pode ficar lento sob carga; aceitável para MVP/poucos usuários (assumido na spec). A migração de tier causa um breve reinício da instância.

**Alternativa considerada**: recriar instância já no disco mínimo → documentado como opcional; não no caminho principal.
