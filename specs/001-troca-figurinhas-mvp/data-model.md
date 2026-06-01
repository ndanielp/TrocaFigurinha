# Data Model: Plataforma de Troca de Figurinhas — MVP

**Feature**: `001-troca-figurinhas-mvp`
**Phase**: 1 — Design
**Date**: 2026-05-28
**Database**: PostgreSQL 15 (Cloud SQL)

---

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";
```

---

## Entities

### users

Representa um colecionador autenticado na plataforma.

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 TEXT NOT NULL UNIQUE,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash         TEXT,                         -- NULL se autenticou via Google
  google_id             TEXT UNIQUE,                  -- NULL se autenticou via email/senha
  display_name          TEXT NOT NULL,
  cep                   CHAR(8) NOT NULL,             -- apenas dígitos, 8 caracteres
  whatsapp              TEXT,                         -- NULL se não informado
  whatsapp_opt_in       BOOLEAN NOT NULL DEFAULT FALSE,
  age_group             TEXT NOT NULL CHECK (age_group IN ('teen_13_15', 'adult_16_plus')),
  parental_email        TEXT,                         -- NULL se adult_16_plus
  parental_consent      BOOLEAN NOT NULL DEFAULT FALSE,
  account_status        TEXT NOT NULL DEFAULT 'incomplete_onboarding'
                          CHECK (account_status IN (
                            'incomplete_onboarding',
                            'pending_parental_consent',
                            'active',
                            'suspended'
                          )),
  avatar_url            TEXT,                         -- foto do Google (OAuth); NULL para email/senha
  terms_accepted_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ                   -- soft delete para LGPD right-to-erasure
);

CREATE INDEX idx_users_cep ON users(LEFT(cep, 5));
CREATE INDEX idx_users_status ON users(account_status) WHERE deleted_at IS NULL;
```

**State transitions para `account_status`**:
- `incomplete_onboarding` → `pending_parental_consent` (se age_group = teen_13_15)
- `incomplete_onboarding` → `active` (se adult_16_plus e termos aceitos)
- `pending_parental_consent` → `active` (após confirmação do responsável)

**Validation rules**:
- `cep`: exatamente 8 dígitos numéricos (validação na camada de aplicação + CHECK constraint)
- `whatsapp`: formato E.164 ou nacional brasileiro (validação na aplicação)
- `password_hash` XOR `google_id` — pelo menos um deve estar preenchido

---

### auth_sessions

Gerenciada pelo Auth.js via `@auth/pg-adapter`. Schema padrão do adapter:

```sql
CREATE TABLE accounts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,         -- 'google' | 'credentials'
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT NOT NULL UNIQUE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  expires    TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

---

### stickers

Catálogo fixo de figurinhas do álbum FIFA 2026. Populado via seed SQL. Imutável em runtime.
Total: **994 figurinhas** (980 do álbum oficial Panini + 14 promocionais Coca-Cola).

```sql
CREATE TABLE stickers (
  id                 SERIAL PRIMARY KEY,
  natural_key        VARCHAR(6) NOT NULL UNIQUE,  -- ex: 'BRA1', 'FWC0', 'CC7'
  section_type       TEXT NOT NULL CHECK (section_type IN (
                       'national_team',      -- 48 seleções × 20 = 960
                       'tournament_special', -- FWC0–FWC19 = 20
                       'promotional'         -- CC0–CC13 = 14
                     )),
  team_slug          CHAR(3),           -- código FIFA (BRA, ARG, USA…); NULL se não seleção
  group_code         CHAR(1),           -- grupo A–L; NULL para FWC e CC
  position_in_section SMALLINT NOT NULL, -- 1–20 para seleções, 0–19 para FWC/CC
  position_role      TEXT NOT NULL CHECK (position_role IN (
                       'badge',       -- posição #1 de cada seleção (escudo)
                       'team_photo',  -- posição #13 de cada seleção (foto elenco)
                       'player',      -- demais posições de seleção (jogadores)
                       'intro',       -- FWC0–FWC8
                       'history',     -- FWC9–FWC19
                       'promo'        -- CC (Coca-Cola)
                     )),
  sticker_name       TEXT NOT NULL,    -- nome do jogador ou descrição
  is_official_album  BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE apenas para CC
  release_batch      TEXT NOT NULL DEFAULT 'original'
                       CHECK (release_batch IN (
                         'original',          -- álbum base
                         'coca_cola',         -- pack Coca-Cola
                         'update_team'        -- pack de atualização pós-convocação
                       )),
  rarity             TEXT NOT NULL DEFAULT 'regular'
                       CHECK (rarity IN ('regular', 'gold'))
);

CREATE INDEX idx_stickers_team ON stickers(team_slug) WHERE team_slug IS NOT NULL;
CREATE INDEX idx_stickers_group ON stickers(group_code) WHERE group_code IS NOT NULL;
CREATE INDEX idx_stickers_official ON stickers(is_official_album);
```

**Natural key format**: `{PREFIX}{N}` onde PREFIX é código FIFA (3 chars), `FWC`, ou `CC`;
N é o número dentro da seção (sem zero-padding).

**Seed**: arquivo `infra/seeds/stickers.sql` com todas as 994 figurinhas.
`is_official_album = false` apenas para as 14 figurinhas CC.

**TODO research.md**: Validar com o app oficial Panini Collection se há figurinhas `rarity=gold`
adicionais não presentes na planilha-fonte antes de finalizar o seed.

---

### user_stickers

Estado de cada figurinha para cada usuário. Linha criada na primeira interação do usuário com
a figurinha; ausência de linha equivale a `needs` (não tenho).

```sql
CREATE TABLE user_stickers (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sticker_id      INTEGER NOT NULL REFERENCES stickers(id),
  status          TEXT NOT NULL CHECK (status IN ('needs', 'owned', 'duplicate')),
  duplicate_count SMALLINT NOT NULL DEFAULT 0
                    CHECK (
                      (status = 'duplicate' AND duplicate_count >= 1) OR
                      (status != 'duplicate' AND duplicate_count = 0)
                    ),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, sticker_id)
);

CREATE INDEX idx_user_stickers_user ON user_stickers(user_id, status);
CREATE INDEX idx_user_stickers_duplicates ON user_stickers(user_id)
  WHERE status = 'duplicate';
```

**Business rules**:
- Ausência de linha = usuário não marcou a figurinha = implicitamente `needs`
- `duplicate_count` DEVE ser ≥ 1 quando `status = 'duplicate'`
- `duplicate_count` DEVE ser 0 quando `status IN ('needs', 'owned')`
- Bulk update por seleção: UPDATE WHERE `sticker_id IN (SELECT id FROM stickers WHERE team_slug = :team)`

---

### cep_centroids

Tabela de lookup de coordenadas geográficas aproximadas por prefixo de 5 dígitos do CEP.
Imutável em runtime; populada via seed SQL.

```sql
CREATE TABLE cep_centroids (
  cep_prefix CHAR(5) PRIMARY KEY,    -- primeiros 5 dígitos do CEP
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  locality   TEXT                    -- nome da localidade (debug/display)
);
```

**Derivação**: dados públicos IBGE/OpenStreetMap processados offline. Seed em
`infra/seeds/cep_centroids.sql`. Cobertura: todos os 5-prefixos de CEP ativos no Brasil.

---

### parental_consent_tokens

Tokens de confirmação enviados por e-mail ao responsável legal de usuários 13–15 anos.

```sql
CREATE TABLE parental_consent_tokens (
  token        TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  used_at      TIMESTAMPTZ
);

CREATE INDEX idx_pct_user ON parental_consent_tokens(user_id);
```

---

## Matching Query (View/Function)

Query principal do algoritmo de matching. Executada sob demanda quando o usuário abre a tela
de matches. Indexação no `user_stickers` garante desempenho aceitável até ~100k usuários ativos.

```sql
-- Retorna matches bilaterais para o usuário :me_id
-- Parâmetros: :me_id UUID, :max_distance_km FLOAT (NULL = sem limite), :min_score INT (default 1)
SELECT
  b.id             AS partner_id,
  b.display_name   AS partner_name,
  b.whatsapp_opt_in AS partner_whatsapp_opt_in,
  eu_dou.cnt       AS eu_dou,
  eu_recebo.cnt    AS eu_recebo,
  LEAST(eu_dou.cnt, eu_recebo.cnt) AS score,
  ROUND(
    earth_distance(
      ll_to_earth(ca.lat, ca.lng),
      ll_to_earth(cb.lat, cb.lng)
    ) / 1000.0
  ) AS distance_km
FROM users b
-- O que eu dou a B: minhas repetidas que B precisa
JOIN LATERAL (
  SELECT COUNT(*) AS cnt
  FROM user_stickers ua
  LEFT JOIN user_stickers ub ON ua.sticker_id = ub.sticker_id AND ub.user_id = b.id
  WHERE ua.user_id = :me_id
    AND ua.status = 'duplicate'
    AND (ub.status = 'needs' OR ub.status IS NULL)
) eu_dou ON TRUE
-- O que eu recebo de B: repetidas de B que eu preciso
JOIN LATERAL (
  SELECT COUNT(*) AS cnt
  FROM user_stickers ub
  LEFT JOIN user_stickers ua ON ub.sticker_id = ua.sticker_id AND ua.user_id = :me_id
  WHERE ub.user_id = b.id
    AND ub.status = 'duplicate'
    AND (ua.status = 'needs' OR ua.status IS NULL)
) eu_recebo ON TRUE
-- Centroides de CEP para cálculo de distância
JOIN users a ON a.id = :me_id
JOIN cep_centroids ca ON LEFT(a.cep, 5) = ca.cep_prefix
JOIN cep_centroids cb ON LEFT(b.cep, 5) = cb.cep_prefix
WHERE b.id != :me_id
  AND b.account_status = 'active'
  AND b.deleted_at IS NULL
  AND LEAST(eu_dou.cnt, eu_recebo.cnt) >= COALESCE(:min_score, 1)
  AND (:max_distance_km IS NULL OR
       earth_distance(
         ll_to_earth(ca.lat, ca.lng),
         ll_to_earth(cb.lat, cb.lng)
       ) / 1000.0 <= :max_distance_km)
ORDER BY score DESC, distance_km ASC;
```

---

## Stats Query — Painel do Usuário

```sql
-- % de conclusão do álbum OFICIAL (exclui CC)
SELECT
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE us.status IN ('owned', 'duplicate') AND s.is_official_album = true
    ) / NULLIF(SUM(CASE WHEN s.is_official_album THEN 1 END), 0),
    1
  ) AS album_completion_pct,
  COUNT(*) FILTER (WHERE us.status = 'duplicate') AS total_duplicates
FROM stickers s
LEFT JOIN user_stickers us ON s.id = us.sticker_id AND us.user_id = :me_id;

-- Top 5 figurinhas mais demandadas entre as repetidas do usuário
SELECT s.id, s.natural_key, s.sticker_name, s.team_slug, COUNT(*) AS demand_count
FROM user_stickers my_dupes
JOIN stickers s ON s.id = my_dupes.sticker_id
JOIN user_stickers others ON others.sticker_id = my_dupes.sticker_id
  AND others.status IN ('needs')
  AND others.user_id != :me_id
WHERE my_dupes.user_id = :me_id AND my_dupes.status = 'duplicate'
GROUP BY s.id, s.natural_key, s.sticker_name, s.team_slug
ORDER BY demand_count DESC
LIMIT 5;
```

## Entity Relationships

```
users ──< user_stickers >── stickers
  │
  └── cep_centroids (via cep[0:5])
  └── parental_consent_tokens

users ──< accounts (Auth.js)
users ──< sessions (Auth.js)
```

---

## Migration Strategy

- Migrations gerenciadas com `node-pg-migrate` ou `db-migrate`
- Arquivo `infra/migrations/001_initial_schema.sql` contém DDL completo
- Seeds separados: `infra/seeds/stickers.sql`, `infra/seeds/cep_centroids.sql`
- `npm run db:migrate` executa migrations pendentes
- `npm run db:seed` popula dados estáticos (idempotente via `ON CONFLICT DO NOTHING`)
