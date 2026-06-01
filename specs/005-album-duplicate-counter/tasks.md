# Tasks: Contador de Figurinhas Repetidas no Álbum

**Feature**: 005-album-duplicate-counter | **Branch**: `005-album-duplicate-counter`

**Input**: plan.md, spec.md, research.md, data-model.md

## Visão geral

Feature majoritariamente de UI. Sem alteração de schema ou backend. Três controles novos no `StickerCard`:
- **Corpo do card** (clique): `needs → owned`
- **Botão X** (canto superior): `owned`/`duplicate → needs`
- **Botões +/-** (rodapé): incrementa/decrementa `duplicateCount`

Callback propaga `(stickerId, status, duplicateCount)` até `album/page.tsx`.

---

## Phase 1: Setup

- [X] T001 Confirmar que `npx tsc --noEmit` passa sem erros na branch `005-album-duplicate-counter` antes de iniciar as mudanças.

---

## Phase 2: Foundational

- [X] T002 Em `src/app/(protected)/album/page.tsx`, estender `handleStickerChange` para aceitar o terceiro argumento `duplicateCount?: number` e incluí-lo no payload do `PATCH /api/collection/sticker` (corpo: `{ stickerId, status, duplicateCount }`). Atualizar o estado local otimista para refletir o novo `duplicateCount` recebido.

---

## Phase 3: User Story 1 — Adicionar figurinhas repetidas (P1)

**Goal**: Usuário vê botão "+" na figurinha possuída e cada clique incrementa `duplicateCount`.

**Independent Test**: Marcar figurinha como "tenho", clicar "+" 3x → exibe "+3". Recarregar → persiste.

- [X] T003 [US1] Em `src/components/album/StickerCard.tsx`, atualizar a interface `StickerCardProps`: trocar `onStatusChange: (stickerId, status) => void` por `onStatusChange: (stickerId: number, status: "needs" | "owned" | "duplicate", duplicateCount: number) => void`.
- [X] T004 [US1] Em `src/components/album/StickerCard.tsx`, reestruturar o componente: trocar o `<button>` único por um `<div>` clicável (corpo) que só age quando `status === 'needs'` (chama `onStatusChange(id, 'owned', 0)`). Quando `status !== 'needs'`, o clique no corpo não faz nada.
- [X] T005 [US1] Em `src/components/album/StickerCard.tsx`, adicionar botão "+" no rodapé do card, visível apenas quando `status !== 'needs'`. Clique: calcula `newCount = duplicateCount + 1`, chama `onStatusChange(id, 'duplicate', newCount)` com `e.stopPropagation()`.
- [X] T006 [US1] Em `src/components/album/StickerCard.tsx`, exibir a contagem atual de repetidas usando o `Badge` existente (`+{n}`) quando `duplicateCount > 0`. Quando `duplicateCount === 0` e `status === 'owned'`, exibir badge "✓" ou nenhum badge (manter o visual verde já existente).

---

## Phase 4: User Story 2 — Remover figurinhas repetidas (P1)

**Goal**: Botão "-" subtrai uma repetida; ao chegar a zero, figurinha fica como "tenho" (não reverte para "preciso").

**Independent Test**: Figurinha com 2 repetidas → clicar "-" 2x → exibe "✓" (owned, sem repetidas). Recarregar → persiste como "tenho".

- [X] T007 [US2] Em `src/components/album/StickerCard.tsx`, adicionar botão "-" no rodapé do card, ao lado do "+", visível quando `status !== 'needs'`. Clique: calcula `newCount = duplicateCount - 1`; se `newCount <= 0` → `onStatusChange(id, 'owned', 0)`; senão → `onStatusChange(id, 'duplicate', newCount)`. Usar `e.stopPropagation()`. Botão desabilitado (ou `opacity-50`) quando `duplicateCount === 0`.
- [X] T008 [US2] Em `src/components/album/StickerCard.tsx`, adicionar botão "×" (remover) no canto superior direito do card, visível apenas quando `status !== 'needs'`. Clique: chama `onStatusChange(id, 'needs', 0)` com `e.stopPropagation()`. Isso desmarca a posse.

---

## Phase 5: Propagação do callback (integração)

- [X] T009 Em `src/components/album/TeamSection.tsx`, atualizar a interface `TeamSectionProps`: prop `onStickerChange` passa de `(stickerId, status) => void` para `(stickerId: number, status: "needs" | "owned" | "duplicate", duplicateCount: number) => void`. Repassar para `StickerCard`.
- [X] T010 Em `src/app/(protected)/album/page.tsx`, confirmar que a assinatura de `handleStickerChange` e sua passagem para `TeamSection` está alinhada com a nova interface de T002 e T009.

---

## Phase 6: Validação

- [X] T011 Rodar `npx tsc --noEmit` e corrigir qualquer erro de tipo.
- [X] T012 Fazer deploy no staging (`gcloud run deploy trocafigurinhas-staging --source . --region=southamerica-east1 --project=trocafigurinhas-2026`) e testar manualmente: marcar figurinha, usar +/- várias vezes, usar X para remover, recarregar e confirmar persistência.

---

## Dependencies & Ordem de Execução

```
T001 (typecheck baseline)
  └─> T002 (handler page.tsx)
        └─> T003 (props StickerCard)
              ├─> T004 [US1] (corpo card)
              ├─> T005 [US1] (botão +)       ← paralelos entre si (mesmo arquivo,
              ├─> T006 [US1] (badge count)      sequenciais na prática por ser 1 arquivo)
              ├─> T007 [US2] (botão -)
              └─> T008 [US2] (botão X)
                    └─> T009 (TeamSection props)
                          └─> T010 (page.tsx alinhamento)
                                └─> T011 (tsc)
                                      └─> T012 (deploy + teste)
```

## MVP

US1 + US2 juntos formam o MVP (P1 na spec). Ao concluir T012, a feature está completa e validada em staging.
