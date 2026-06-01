# Implementation Plan: Contador de Figurinhas Repetidas no Álbum

**Branch**: `005-album-duplicate-counter` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-album-duplicate-counter/spec.md`

## Summary

Substituir o ciclo de clique único do card de figurinha (`needs → owned → duplicate → needs`) por controles explícitos. Clique no **corpo do card** marca posse (`needs → owned`); um **botão X** remove a figurinha (`owned`/`duplicate → needs`); botões `+`/`-` controlam a quantidade de repetidas. Ao zerar as repetidas, a figurinha permanece como `owned`. O backend já suporta (`updateStickerStatus` com `duplicateCount`); a feature é majoritariamente de UI.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS

**Primary Dependencies**: `next@15` (App Router, client components), React 19, Tailwind CSS

**Storage**: Cloud SQL (PostgreSQL 15) — tabela `user_stickers` existente, sem alteração de schema

**Testing**: Verificação manual no álbum (staging) + typecheck

**Target Platform**: Web — Cloud Run (southamerica-east1)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Atualização otimista; resposta visual imediata (< 100ms percebido)

**Constraints**:
- Card é pequeno (grid 5 col mobile / 10 col desktop) — X + corpo + `+`/`-` devem caber
- X e botões `+`/`-` não podem disparar o clique do corpo (`stopPropagation`)
- Sem alteração de schema; reusar endpoint `PATCH /api/collection/sticker`

**Scale/Scope**: Mesmo escopo do MVP

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Web-First Architecture | Mudança puramente na UI web | ✅ PASSA |
| II. Authentication & Identity | Endpoint já exige sessão; sem mudança | ✅ PASSA |
| III. Security by Default | Validação Zod no endpoint mantida; sem nova superfície | ✅ PASSA |
| IV. Cloud-Native Deployment | Sem alteração de infra | ✅ PASSA |
| V. Simplicity & Maintainability | Reusa backend; muda 1 componente + handler; sem schema | ✅ PASSA |

*Re-check pós-design (Phase 1)*: sem violações novas. ✅

## Complexity Tracking

Sem violações da constituição. Nenhuma entrada necessária.

## Project Structure

### Documentation (this feature)

```text
specs/005-album-duplicate-counter/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md   (/speckit-tasks)
```

### Source Code — arquivos afetados

```text
src/
├── components/album/
│   └── StickerCard.tsx          # MODIFICADO: corpo toggle needs↔owned; botões +/-
├── app/(protected)/album/
│   └── page.tsx                 # MODIFICADO: handler aceita duplicateCount; envia no fetch
└── app/api/collection/sticker/
    └── route.ts                 # VERIFICAR: schema já aceita duplicateCount (sem mudança esperada)
```

## Implementation Phases

### Fase 1 — `StickerCard.tsx` (núcleo da feature)

- Trocar o `<button>` único que cicla status por uma estrutura: corpo clicável (`needs → owned`) + botão **X** de remover (canto, visível quando `status !== 'needs'`) + área de controles `+`/`-` (visível quando `status !== 'needs'`).
- Corpo: clique em `needs` → `owned`. (Em `owned`/`duplicate` o corpo não reverte — quem remove é o X.)
- X: `owned`/`duplicate` → `needs`, count 0.
- `+`: novo count = `duplicateCount + 1`, status `duplicate`.
- `-`: novo count = `duplicateCount - 1`; se chegar a 0 → status `owned`; nunca abaixo de 0.
- X e botões `+`/`-` chamam `e.stopPropagation()` para não disparar o clique do corpo.
- Exibir contagem atual (reusar `Badge` `+{n}` já presente).
- Nova prop de callback que comunica `(stickerId, status, duplicateCount)` ao pai.

### Fase 2 — `album/page.tsx` (handler + propagação)

- Estender `handleStickerChange` (ou criar handler dedicado) para receber `duplicateCount` e:
  - atualizar o estado local otimista com `status` e `duplicateCount` corretos
  - enviar `{ stickerId, status, duplicateCount }` no `PATCH`
- Passar o novo callback por `TeamSection` → `StickerCard` (ajustar a assinatura em `TeamSection.tsx`).

### Fase 3 — Endpoint (verificação)

- Confirmar que `PATCH /api/collection/sticker` aceita `duplicateCount` (schema atual: `z.number().int().min(1).optional()`). Sem mudança esperada; ajustar só se o front precisar enviar count em estado `owned` (não precisa — em `owned` o count é 0 e o schema exige `min(1)` apenas quando enviado).

### Fase 4 — Validação

- `npx tsc --noEmit`
- Deploy staging + teste manual: marcar posse, `+` várias vezes, `-` até zerar (continua `owned`), recarregar e conferir persistência.

## Verification (Success Criteria)

- **SC-001**: Registrar quantidade de repetidas em < 5s a partir de "tenho".
- **SC-002**: 100% das alterações persistem após reload.
- **SC-003**: Zerar repetidas mantém `owned` (nunca volta a `needs`).
- **SC-004**: Contagem no álbum == contagem usada no matching.
