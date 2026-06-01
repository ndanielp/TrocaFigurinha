# Data Model: Correção da Ordem do Álbum por Páginas

**Feature**: 007-fix-album-page-order | **Date**: 2026-06-01

## Sem alteração de schema

A coluna `section_order` já existe (feature 006). Apenas os **valores** mudam.

## Mapeamento section_order → natural_key (resumo)

```
section_order  natural_key  bloco
0              FWC00        FWC intro (página 1)
1              FWC01
...
8              FWC08
9              MEX01        Grupo A - México (páginas 2-3)
...
28             MEX20
29             RSA01        Grupo A - África do Sul (páginas 4-5)
...
968            PAN20        Grupo L - Panamá (páginas 96-97)
969            FWC09        FWC história (página 98)
...
979            FWC19
980            CC01         Coca-Cola (página 99)
...
993            CC14
```

## Natural keys corrigidas

| Formato antigo (006) | Formato correto (007) |
|----------------------|----------------------|
| `FWC0`..`FWC19` | `FWC00`..`FWC19` |
| `MEX1`..`MEX20` | `MEX01`..`MEX20` |
| `CC0`..`CC13` | `CC01`..`CC14` |

**Total**: 9 (FWC intro) + 960 (times) + 11 (FWC história) + 14 (CC) = **994**
