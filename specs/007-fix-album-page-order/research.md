# Research: Correção da Ordem do Álbum por Páginas

**Feature**: 007-fix-album-page-order | **Date**: 2026-06-01

## Questão 1: Qual é a estrutura correta de section_order?

**Decisão**: Derivar `section_order` diretamente da sequência de páginas do álbum físico (`Modelos/album_copa_2026.md`).

**Mapeamento por bloco:**

| Bloco | Páginas | Figurinhas | section_order |
|-------|---------|-----------|---------------|
| FWC intro | 1 | FWC00–FWC08 (9) | 0–8 |
| Times A–L | 2–97 | MEX01..PAN20 (960) | 9–968 |
| FWC história | 98 | FWC09–FWC19 (11) | 969–979 |
| Coca-Cola | 99 | CC01–CC14 (14) | 980–993 |
| **Total** | | **994** | 0–993 |

**section_order por time** (idx = posição na lista de 48 times, 0-based):
- `section_order = 9 + idx * 20 + (n - 1)`, onde n = número da figurinha (1..20)

**Problema da implementação anterior (006)**: todo FWC (intro + história) estava agrupado com section_order 0–19. FWC de história (FWC09–FWC19) ficava antes dos times, quando deveria ficar depois (página 98).

---

## Questão 2: Formato das natural_keys

**Decisão**: Usar zero-padding de 2 dígitos para o número da figurinha: `MEX01`..`MEX20`, `CC01`..`CC14`, `FWC00`..`FWC19`.

**Rationale**: O documento de referência usa esse formato. É também mais ordenável lexicograficamente (evita `MEX1` < `MEX10` < `MEX2`).

**Impacto**: As natural_keys atuais no banco são `MEX1`..`MEX20` (sem zero). A mudança exige:
1. Apagar os stickers antigos (DELETE)
2. Reinserir com as novas natural_keys

Como staging foi recriado na feature 006 e os dados de marcação são descartáveis, isso é seguro.

**Nota sobre FWC**: a referência usa `FWC00`..`FWC19`. O seed atual já usa `FWC0`..`FWC19` (sem zero para 0–9). Padronizar para `FWC00`..`FWC19` (sempre 2 dígitos).

---

## Questão 3: Impacto em código além do seed

**Decisão**: Nenhuma alteração de código-fonte necessária além do `scripts/gen-stickers-seed.mjs`. A query `getUserAlbum` já ordena por `section_order` (feature 006). O display usa `sticker.naturalKey` como rótulo — mudar de `MEX1` para `MEX01` atualiza o rótulo visível, o que é desejado.

O componente `StickerCard` exibe `naturalKey` diretamente, então `MEX01` aparecerá na tela corretamente.
