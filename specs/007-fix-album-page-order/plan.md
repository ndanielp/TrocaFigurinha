# Implementation Plan: Correção da Ordem do Álbum por Páginas

**Branch**: `007-fix-album-page-order` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-fix-album-page-order/spec.md`

## Summary

Correção do seed e da ordenação do álbum para refletir a estrutura real de 99 páginas do álbum físico. O FWC está dividido: FWC00–FWC08 na página 1 (introdução) e FWC09–FWC19 na página 98 (história), após todos os 48 times. Natural keys passam a usar zero-padding (`MEX01` em vez de `MEX1`, `FWC00` em vez de `FWC0`, `CC01` em vez de `CC0`). Sem alteração de schema — apenas `section_order` e natural keys mudam.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20 LTS; script gerador em Node.js ESM
**Primary Dependencies**: `postgres` (lib do client), seed SQL
**Storage**: Cloud SQL (PostgreSQL 15) — apenas dados de `stickers` mudam
**Testing**: Verificação manual no álbum staging
**Target Platform**: Cloud Run (southamerica-east1)
**Constraints**:
- Sem alteração de schema (coluna `section_order` já existe)
- Staging com dados descartáveis; DELETE + INSERT é seguro
- Natural keys mudam: `user_stickers` referencia por `sticker_id` (FK numérica), não por `natural_key`, então a troca de natural_key não quebra referências existentes de stickers já marcados — **mas** os IDs numéricos mudam com o DELETE/INSERT, então `user_stickers` precisa ser limpo antes

## Constitution Check

| Princípio | Gate | Status |
|-----------|------|--------|
| I. Web-First | Apenas dados; sem mudança de UI | ✅ |
| II. Auth & Identity | Sem alteração | ✅ |
| III. Security | Sem nova superfície | ✅ |
| IV. Cloud-Native | Dado gerenciado via Cloud SQL | ✅ |
| V. Simplicity | Apenas 1 script + reaplicação de dados | ✅ |

## Complexity Tracking

Sem violações. Nenhuma entrada necessária.

## Project Structure

### Documentation
```text
specs/007-fix-album-page-order/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md   (/speckit-tasks)
```

### Source Code — arquivos afetados
```text
scripts/gen-stickers-seed.mjs    # MODIFICADO: section_order correto + zero-padding
infra/seeds/stickers.sql         # REGENERADO pelo script acima
```

## Implementation Phases

### Fase 1 — Atualizar script gerador e regenerar seed

Modificar `scripts/gen-stickers-seed.mjs`:

1. **FWC intro** (FWC00–FWC08): natural_key `FWC00`..`FWC08`, section_order 0–8, role `intro`.
2. **Times** (MEX01..PAN20): natural_key `<SLUG><n:02d>` (zero-padded), section_order `9 + idx*20 + (n-1)`.
3. **FWC história** (FWC09–FWC19): natural_key `FWC09`..`FWC19`, section_order 969–979, role `history`.
4. **CC** (CC01–CC14): natural_key `CC01`..`CC14`, section_order 980–993.

Rodar o script → `infra/seeds/stickers.sql` regenerado.

### Fase 2 — Reaplicar em staging

1. Limpar `user_stickers` (IDs numéricos mudarão).
2. Limpar `stickers` (todos; não só national_team — FWC e CC também mudam de natural_key).
3. Aplicar novo seed.
4. Validar no álbum staging.

## Verification (Success Criteria)

- **SC-001**: Primeira seção do álbum = FWC00–FWC08 (intro).
- **SC-002**: Após todos os times (grupos A–L), aparecem FWC09–FWC19 (história).
- **SC-003**: Última seção = CC01–CC14.
- **SC-004**: Dentro de cada time, figurinhas aparecem como `MEX01`..`MEX20`.
