# Data Model: Contador de Figurinhas Repetidas no Álbum

**Feature**: 005-album-duplicate-counter | **Date**: 2026-05-31

## Entidade existente (sem alteração de schema)

### `user_stickers`
```
user_id         UUID      -- FK users(id)
sticker_id      INTEGER   -- FK stickers(id)
status          TEXT      -- 'needs' | 'owned' | 'duplicate'
duplicate_count SMALLINT  -- 0 quando não duplicate; >=1 quando duplicate
updated_at      TIMESTAMPTZ
PRIMARY KEY (user_id, sticker_id)
```

A CHECK constraint existente já garante a invariante:
- `status = 'duplicate'` ⟹ `duplicate_count >= 1`
- `status != 'duplicate'` ⟹ `duplicate_count = 0`

Linhas com `status = 'needs'` não existem na tabela (são removidas via DELETE) — a ausência da linha representa "preciso".

## Invariantes da feature

| Invariante | Garantia |
|-----------|----------|
| Repetidas nunca negativas | UI nunca envia count < 0; `-` em `owned` é no-op |
| `duplicateCount > 0` ⟺ `status = 'duplicate'` | derivado na UI antes do envio |
| Zerar repetidas mantém posse | `-` em `duplicate(1)` → `status='owned'`, count 0 (não DELETE) |
| Persistência reflete no matching | mesma coluna `duplicate_count` lida pelas queries de matches |

## Tipo TypeScript (existente, sem mudança)

`StickerWithStatus` (`src/types/index.ts`):
```ts
status: StickerStatus;        // 'needs' | 'owned' | 'duplicate'
duplicateCount: number;
```

## Estado da UI por figurinha

```
needs       → corpo neutro, sem botões +/- nem X
owned       → corpo verde, botão X (remover) + botões [-] 0 [+]  (- desabilitado/no-op)
duplicate n → corpo amarelo, botão X (remover) + botões [-] n [+]
```

Clique no corpo: `needs → owned`. Clique no X: `owned`/`duplicate` → `needs`.
