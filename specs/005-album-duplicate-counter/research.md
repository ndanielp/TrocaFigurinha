# Research: Contador de Figurinhas Repetidas no Álbum

**Feature**: 005-album-duplicate-counter | **Date**: 2026-05-31

## Questão 1: Como reverter "tenho" → "preciso" sem o ciclo de clique único?

**Decisão**: Um **botão extra (lixeira/X)** no card remove a figurinha da coleção (volta `owned`/`duplicate` → `needs`). O clique no **corpo do card** continua marcando posse de `needs` → `owned`. Os botões `+`/`-` controlam apenas a quantidade de repetidas.

**Rationale**: Escolha do usuário. Torna a remoção explícita e intencional (evita reverter posse por engano ao mexer nas repetidas). Os controles de repetidas (`+`/`-`) e o de remoção (X) ficam visualmente separados.

**Layout do card** (estado possuído):
```
┌────────────┐
│        [x] │ ← remove (→ needs)
│  ⚽ ABC-01  │ ← corpo: needs→owned ao clicar
│  [-] 2 [+] │ ← repetidas
└────────────┘
```

**Alternativas consideradas**:
- Clique no corpo para alternar `owned`↔`needs` → rejeitada: risco de reverter posse sem querer; remoção implícita demais.
- Long-press → rejeitada: pouco descobrível em web/mobile.

**Atenção de implementação**: o card é pequeno (grid 5 col mobile). O X, o corpo e os botões `+`/`-` precisam de áreas de toque distintas com `stopPropagation` para não dispararem ações umas das outras.

---

## Questão 2: Mapeamento de estados com `+`/`-`

**Decisão**: A interação passa a ser:

| Estado atual | Ação | Novo estado | duplicateCount |
|--------------|------|-------------|----------------|
| `needs` | clique no corpo | `owned` | 0 |
| `owned` ou `duplicate` | clique no **X** | `needs` | 0 |
| `owned` | clique `+` | `duplicate` | 1 |
| `duplicate` (n) | clique `+` | `duplicate` | n+1 |
| `duplicate` (n>1) | clique `-` | `duplicate` | n−1 |
| `duplicate` (1) | clique `-` | `owned` | 0 |
| `owned` | clique `-` | `owned` (sem efeito) | 0 |

**Rationale**: Reflete FR-002 a FR-005. O `status` continua sendo derivado da contagem: `duplicateCount > 0` ⟺ `duplicate`; `=0` com posse ⟺ `owned`.

---

## Questão 3: Reuso do backend existente

**Decisão**: Nenhuma alteração de backend. `updateStickerStatus(userId, stickerId, status, duplicateCount?)` (em `src/lib/db/queries/stickers.ts`) e o endpoint `PATCH /api/collection/sticker` já aceitam `status` + `duplicateCount`.

**Ajuste necessário**: o schema Zod do endpoint hoje é `duplicateCount: z.number().int().min(1).optional()` e a chamada do front (`album/page.tsx`) só envia `{ stickerId, status }`. Será preciso o front passar `duplicateCount` junto. O `min(1)` é coerente (só se envia count quando `status='duplicate'`).

**Rationale**: O insumo de matching (FR-007/SC-004) já lê `user_stickers.duplicate_count`; manter o mesmo caminho garante consistência com o sistema de trocas.

---

## Questão 4: Atualização otimista e corridas de clique

**Decisão**: Manter o padrão otimista já usado em `album/page.tsx` (atualiza estado local, depois faz `fetch`). Para cliques rápidos em `+`/`-`, o estado local é a fonte da verdade incremental; cada clique computa o novo count a partir do estado atual e envia o valor absoluto resultante.

**Rationale**: Enviar o valor absoluto (não "incremento") evita perda de atualizações concorrentes (edge case da spec). Em falha de rede, recarregar reflete o valor persistido (FR exibição honesta).
