# API Contracts: Plataforma de Troca de Figurinhas — MVP

**Feature**: `001-troca-figurinhas-mvp`
**Base path**: `/api`
**Auth**: Sessão via cookie gerenciada pelo Auth.js. Rotas marcadas com 🔒 requerem sessão ativa.
**Format**: JSON (`Content-Type: application/json`)
**Errors**: `{ "error": "<mensagem legível>", "code": "<ERROR_CODE>" }`

---

## Autenticação — `/api/auth`

Gerenciado pelo Auth.js (`/api/auth/[...nextauth]`). Comportamento padrão do handler.

### POST `/api/auth/callback/credentials`

Login com email e senha.

**Request**:
```json
{ "email": "usuario@email.com", "password": "senhaSegura123" }
```

**Response**: redirect ou `{ "url": "/dashboard" }` em caso de sucesso.

**Errors**:
- `401 INVALID_CREDENTIALS` — email não encontrado ou senha incorreta
- `403 ACCOUNT_NOT_ACTIVE` — conta em estado `pending_parental_consent` ou `incomplete_onboarding`
- `429 RATE_LIMITED` — mais de 10 tentativas por minuto do mesmo IP

### POST `/api/auth/callback/google`

Inicia fluxo OAuth 2.0 com Google. Redirect-based; não chamado diretamente pelo cliente.

### POST `/api/auth/signout`

Encerra a sessão atual e invalida o cookie de sessão.

---

## Onboarding / Perfil — `/api/user`

### PUT `/api/user/profile` 🔒

Atualiza ou completa o perfil do usuário. Usado no onboarding e em edições posteriores.

**Request**:
```json
{
  "display_name": "João Colecionador",
  "cep": "01310100",
  "whatsapp": "11987654321",
  "whatsapp_opt_in": true,
  "age_group": "adult_16_plus",
  "parental_email": null,
  "terms_accepted": true
}
```

**Response `200`**:
```json
{
  "account_status": "active",
  "display_name": "João Colecionador",
  "cep": "01310100",
  "whatsapp_opt_in": true
}
```

**Response `202`** (para teen_13_15 — aguardando consentimento parental):
```json
{
  "account_status": "pending_parental_consent",
  "message": "E-mail de consentimento enviado para responsável."
}
```

**Errors**:
- `400 INVALID_CEP` — CEP inválido ou não encontrado na tabela de centroides
- `400 INVALID_AGE_GROUP` — age_group inválido
- `400 TERMS_REQUIRED` — `terms_accepted` deve ser `true`
- `400 PARENTAL_EMAIL_REQUIRED` — age_group é teen_13_15 mas parental_email não informado
- `400 AGE_BLOCKED` — usuário declarou ser menor de 13 anos

### GET `/api/user/stats` 🔒

Retorna estatísticas do painel do usuário.

**Response `200`**:
```json
{
  "album_completion_pct": 42.3,
  "total_duplicates": 87,
  "top_demanded_stickers": [
    { "sticker_id": 142, "sticker_name": "Vinicius Jr.", "team_slug": "BRA", "demand_count": 234 },
    { "sticker_id": 89,  "sticker_name": "Messi",        "team_slug": "ARG", "demand_count": 198 }
  ]
}
```

**Notes**: `top_demanded_stickers` são as figurinhas repetidas do usuário mais desejadas por
outros usuários ativos (calculado por contagem de `user_stickers` com `status = 'needs'`
para os sticker_ids que o usuário tem como `duplicate`). Limitado a 5 itens.

### DELETE `/api/user` 🔒

Exclui a conta e todos os dados do usuário (LGPD — direito ao esquecimento).

**Response `204`**: sem corpo. Sessão invalidada. Dados removidos conforme spec:
`users`, `user_stickers`, `accounts`, `sessions`, `parental_consent_tokens`.

**Notes**: Soft delete no registro `users` (`deleted_at = now()`), seguido de anonimização
dos campos PII dentro de 30 dias por job agendado.

---

## Consentimento Parental — `/api/auth/parental-consent`

### GET `/api/auth/parental-consent?token=<token>`

Link enviado por e-mail ao responsável legal. Confirma consentimento e ativa a conta.

**Response**: Redirect para página de confirmação (`/parental-consent/success` ou `/parental-consent/expired`).

**Errors**:
- `410 TOKEN_EXPIRED` — token expirado (validade: 7 dias)
- `404 TOKEN_NOT_FOUND` — token inválido

### POST `/api/auth/parental-consent/resend` 🔒

Reenvia e-mail de consentimento ao responsável. Disponível apenas para usuários em estado
`pending_parental_consent`.

**Request**: sem corpo.

**Response `200`**:
```json
{ "message": "E-mail de consentimento reenviado.", "next_resend_allowed_at": "2026-05-29T10:00:00Z" }
```

**Errors**:
- `403 WRONG_STATUS` — conta não está em `pending_parental_consent`
- `429 RESEND_COOLDOWN` — reenvio bloqueado; inclui header `Retry-After` com segundos restantes

---

## Coleção — `/api/collection`

### GET `/api/collection` 🔒

Retorna toda a coleção do usuário autenticado, organizada por seção.

**Response `200`**:
```json
{
  "sections": [
    {
      "section_type": "national_team",
      "group_code": "A",
      "team_slug": "BRA",
      "stickers": [
        { "sticker_id": 1, "natural_key": "BRA1",  "position_in_section": 1,  "position_role": "badge",      "sticker_name": "Escudo",       "rarity": "regular", "is_official_album": true, "status": "owned",     "duplicate_count": 0 },
        { "sticker_id": 2, "natural_key": "BRA2",  "position_in_section": 2,  "position_role": "player",     "sticker_name": "Alisson",      "rarity": "regular", "is_official_album": true, "status": "duplicate", "duplicate_count": 3 },
        { "sticker_id": 3, "natural_key": "BRA13", "position_in_section": 13, "position_role": "team_photo", "sticker_name": "Foto Elenco",  "rarity": "regular", "is_official_album": true, "status": "needs",     "duplicate_count": 0 }
      ]
    }
  ]
}
```

**Notes**: Figurinhas sem registro em `user_stickers` são retornadas com `status: "needs"`.
A resposta inclui todas as figurinhas do álbum com o estado do usuário.

### PATCH `/api/collection/:sticker_id` 🔒

Atualiza o estado de uma única figurinha.

**Request**:
```json
{ "status": "duplicate", "duplicate_count": 2 }
```

**Response `200`**:
```json
{ "sticker_id": 42, "status": "duplicate", "duplicate_count": 2 }
```

**Errors**:
- `400 INVALID_STATUS` — status inválido
- `400 INVALID_COUNT` — duplicate_count < 1 quando status = duplicate, ou ≠ 0 para outros
- `404 STICKER_NOT_FOUND` — sticker_id inexistente

### PUT `/api/collection/bulk` 🔒

Atualiza todas as figurinhas de uma seção de uma vez (ação em lote).

**Request**:
```json
{
  "action": "mark_all_owned",
  "team_slug": "BRA"
}
```

ou para limpar:
```json
{
  "action": "clear_section",
  "team_slug": "BRA"
}
```

**Response `200`**:
```json
{ "updated_count": 15 }
```

**Errors**:
- `400 INVALID_ACTION` — action deve ser `mark_all_owned` ou `clear_section`
- `400 MISSING_SECTION` — team_slug ou section_type ausente
- `404 TEAM_NOT_FOUND` — team_slug inexistente

---

## Matches — `/api/matches`

### GET `/api/matches` 🔒

Retorna lista ranqueada de matches bilaterais do usuário autenticado.

**Query params**:
- `max_distance_km` (int, opcional): filtro de distância máxima. Valores: 5, 10, 25, 50, 100, 200. Omitir = sem limite.
- `min_score` (int, opcional, default=1): score bilateral mínimo.
- `page` (int, opcional, default=1)
- `per_page` (int, opcional, default=20, max=50)

**Response `200`**:
```json
{
  "matches": [
    {
      "partner_id": "uuid-parceiro",
      "partner_name": "Maria Figurinheira",
      "partner_avatar_url": "https://lh3.googleusercontent.com/...",
      "score": 8,
      "distance_km": 12,
      "eu_dou": 10,
      "eu_recebo": 8,
      "whatsapp_available": false,
      "preview_give": [
        { "sticker_id": 55, "sticker_name": "Bellingham", "team_slug": "ENG" }
      ],
      "preview_receive": [
        { "sticker_id": 142, "sticker_name": "Vinicius Jr.", "team_slug": "BRA" }
      ]
    }
  ],
  "total": 47,
  "page": 1,
  "per_page": 20
}
```

**Notes**:
- `whatsapp_available`: `true` somente quando AMBOS os usuários têm `whatsapp_opt_in = true`
  E ambos forneceram número de WhatsApp. Nunca retorna o número — apenas a flag.
- `preview_give` e `preview_receive`: até 3 figurinhas de prévia cada.

### GET `/api/matches/unilateral` 🔒

Retorna matches unilaterais (eu só dou OU eu só recebo).

**Query params**: mesmos filtros de `/api/matches`.

**Response `200`**: mesmo formato, com campo adicional `"direction": "give" | "receive"`.

### GET `/api/matches/:partner_id` 🔒

Retorna detalhe completo do match com um usuário específico.

**Response `200`**:
```json
{
  "partner_id": "uuid-parceiro",
  "partner_name": "Maria Figurinheira",
  "partner_avatar_url": "https://lh3.googleusercontent.com/...",
  "score": 8,
  "distance_km": 12,
  "eu_dou": [
    { "sticker_id": 55, "sticker_name": "Bellingham", "team_slug": "ENG", "sticker_number": 7 }
  ],
  "eu_recebo": [
    { "sticker_id": 142, "sticker_name": "Vinicius Jr.", "team_slug": "BRA", "sticker_number": 10 }
  ],
  "whatsapp_link": "https://wa.me/5511987654321",
  "whatsapp_available": true
}
```

**Notes**:
- `whatsapp_link` e `whatsapp_available: true` somente quando ambos têm opt-in E número informado.
- `whatsapp_link` é `null` caso contrário; NUNCA expor o número sem as condições acima.

**Errors**:
- `404 MATCH_NOT_FOUND` — partner_id inexistente ou usuário deletado
- `403 NO_MATCH` — não existe nenhuma troca possível entre os dois usuários

---

## Catálogo de Figurinhas — `/api/stickers`

### GET `/api/stickers` 🔒

Retorna o catálogo completo de figurinhas do álbum, agrupado por seção.

**Response `200`**:
```json
{
  "sections": [
    {
      "section_type": "national_team",
      "group_code": "A",
      "team_slug": "BRA",
      "stickers": [
        { "sticker_id": 1, "natural_key": "BRA1", "position_in_section": 1, "position_role": "badge", "sticker_name": "Escudo", "rarity": "regular", "is_official_album": true }
      ]
    },
    {
      "section_type": "tournament_special",
      "group_code": null,
      "team_slug": null,
      "stickers": [
        { "sticker_id": 961, "natural_key": "FWC0", "position_in_section": 0, "position_role": "intro", "sticker_name": "FIFA World Cup 2026", "rarity": "regular", "is_official_album": true }
      ]
    },
    {
      "section_type": "promotional",
      "group_code": null,
      "team_slug": null,
      "stickers": [
        { "sticker_id": 981, "natural_key": "CC0", "position_in_section": 0, "position_role": "promo", "sticker_name": "Coca-Cola Promo 1", "rarity": "regular", "is_official_album": false }
      ]
    }
  ],
  "total_stickers": 994,
  "official_album_stickers": 980
}
```

**Notes**: Endpoint público dentro da área autenticada. Dados estáticos — cacheable por 24h
(header `Cache-Control: max-age=86400`).
