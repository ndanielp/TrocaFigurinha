# Tasks: Correção da Ordem do Álbum por Páginas

**Feature**: 007-fix-album-page-order | **Branch**: `007-fix-album-page-order`

**Input**: plan.md, spec.md, research.md, data-model.md

## Visão geral

Correção focalizada: atualizar o script gerador de seed para usar section_order correto (FWC dividido, zero-padding) e reaplicar em staging. Sem mudança de schema, sem mudança de código TypeScript.

---

## Phase 1: Setup

- [X] T001 Confirmar que `npx tsc --noEmit` passa sem erros antes de iniciar.

---

## Phase 2: Foundational — Atualizar script e seed

- [X] T002 Em `scripts/gen-stickers-seed.mjs`, refatorar o bloco FWC em dois grupos separados:
  - **FWC intro** (FWC00–FWC08, 9 itens): natural_key `FWC00`..`FWC08`, section_order 0–8, roles `intro`.
  - **FWC história** (FWC09–FWC19, 11 itens): natural_key `FWC09`..`FWC19`, section_order 969–979, roles `history`.
  - Remover o bloco FWC único que existia antes (que agrupava tudo no início com section_order 0–19).

- [X] T003 Em `scripts/gen-stickers-seed.mjs`, corrigir o bloco de times para usar zero-padding de 2 dígitos no número: `${slug}${String(n).padStart(2,'0')}` (ex.: `MEX01`..`MEX20`). Atualizar section_order para `9 + idx*20 + (n-1)`.

- [X] T004 Em `scripts/gen-stickers-seed.mjs`, corrigir o bloco Coca-Cola: natural_key `CC01`..`CC14` (n de 1 a 14, zero-padded), section_order 980–993.

- [X] T005 Rodar `node scripts/gen-stickers-seed.mjs` e verificar que o seed gerado tem 994 figurinhas com a estrutura correta (FWC intro primeiro, times, FWC história, CC).

---

## Phase 3: User Story 1 — Álbum na ordem de páginas (P1)

**Goal**: Álbum exibe seções na ordem exata das 99 páginas do álbum físico.

**Independent Test**: Abrir álbum → primeira seção = FWC00–FWC08 → grupos A–L → seção de história FWC09–FWC19 → CC01–CC14.

- [X] T006 [US1] Reaplicar catálogo em staging: limpar `user_stickers` e todos os `stickers`, reaplicar `infra/seeds/stickers.sql` gerado em T005.

- [ ] T007 [US1] Validar no álbum staging:
  - Primeira seção = FWC00–FWC08 (SC-001, SC-002).
  - Após PAN20 (último time), aparecem FWC09–FWC19 (SC-003).
  - Última seção = CC01–CC14.
  - Dentro de um time (ex.: México), figurinhas exibidas como `MEX01`..`MEX20`.

---

## Dependencies

```
T001 (typecheck)
  └─> T002, T003, T004 (atualizar script — podem ser feitos em sequência no mesmo arquivo)
        └─> T005 (rodar script)
              └─> T006 (reaplicar em staging)
                    └─> T007 (validar)
```

## MVP

Esta feature é uma única história (P1) — o MVP é o resultado final: T007 aprovado.
