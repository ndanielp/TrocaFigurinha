# Data Model: Ordem do Álbum, Nome de Exibição, Match sem Reciprocidade e Custo

**Feature**: 006-album-order-match-cost | **Date**: 2026-06-01

## Alteração de schema

### `stickers` — adicionar coluna de ordem oficial

```sql
ALTER TABLE stickers ADD COLUMN IF NOT EXISTS section_order INTEGER NOT NULL DEFAULT 0;
```

`section_order` = posição global da figurinha na ordem oficial do álbum. Permite ordenar
determinísticamente sem depender de `team_slug` alfabético.

Convenção de `section_order` (proposta):
- FWC (abertura/história): 0–19
- Seleções: grupo A→L, time 1→4 dentro do grupo, figurinha 1→20.
  Ex.: `section_order = 100 + (indice_do_time * 20) + (numero_figurinha - 1)`, com
  `indice_do_time` de 0 (MEX) a 47 (PAN) na ordem oficial.
- Coca-Cola: faixa final (ex.: 2000+).

A ordenação do álbum passa a ser `ORDER BY section_order`.

## Recriação do catálogo (seed)

`infra/seeds/stickers.sql` reescrito:
- **FWC**: 20 itens (mantém os atuais FWC0–FWC19).
- **48 seleções** na ordem oficial, cada uma com 20 figurinhas:
  `natural_key = <SLUG><n>` (n=1..20), `team_slug=<SLUG>`, `group_code=<A..L>`,
  `position_in_section=n`, `section_order` calculado, `section_type='national_team'`,
  `is_official_album=true`.
- **Coca-Cola**: 14 itens (mantém CC0–CC13), `is_official_album=false`.

Total: 20 (FWC) + 960 (48×20) + 14 (CC) = **994** itens.

Mapa de times (índice → slug, grupo):
```
A: 0 MEX, 1 RSA, 2 KOR, 3 CZE
B: 4 CAN, 5 BIH, 6 QAT, 7 SUI
C: 8 BRA, 9 MAR, 10 HAI, 11 SCO
D: 12 USA, 13 PAR, 14 AUS, 15 TUR
E: 16 GER, 17 CUW, 18 CIV, 19 ECU
F: 20 NED, 21 JPN, 22 SWE, 23 TUN
G: 24 BEL, 25 EGY, 26 IRN, 27 NZL
H: 28 ESP, 29 CPV, 30 KSA, 31 URU
I: 32 FRA, 33 SEN, 34 IRQ, 35 NOR
J: 36 ARG, 37 ALG, 38 AUT, 39 JOR
K: 40 POR, 41 COD, 42 UZB, 43 COL
L: 44 ENG, 45 CRO, 46 GHA, 47 PAN
```

Nomes de exibição dos times (para UI; `team_slug` → nome PT):
MEX=México, RSA=África do Sul, KOR=Coreia do Sul, CZE=Rep. Tcheca, CAN=Canadá, BIH=Bósnia,
QAT=Catar, SUI=Suíça, BRA=Brasil, MAR=Marrocos, HAI=Haiti, SCO=Escócia, USA=Estados Unidos,
PAR=Paraguai, AUS=Austrália, TUR=Turquia, GER=Alemanha, CUW=Curaçao, CIV=Costa do Marfim,
ECU=Equador, NED=Holanda, JPN=Japão, SWE=Suécia, TUN=Tunísia, BEL=Bélgica, EGY=Egito,
IRN=Irã, NZL=Nova Zelândia, ESP=Espanha, CPV=Cabo Verde, KSA=Arábia Saudita, URU=Uruguai,
FRA=França, SEN=Senegal, IRQ=Iraque, NOR=Noruega, ARG=Argentina, ALG=Argélia, AUT=Áustria,
JOR=Jordânia, POR=Portugal, COD=Congo, UZB=Uzbequistão, COL=Colômbia, ENG=Inglaterra,
CRO=Croácia, GHA=Gana, PAN=Panamá.

## `users` — nome de exibição (sem mudança de schema)

A coluna `name` já existe (feature 004). O onboarding passa a gravá-la. Sem alteração de schema.

## Entidade de Match (representação na API)

```
MatchCompleto  { partnerId, partnerName, partnerAvatarUrl, distanceKm|null,
                 euDou>=1, euRecebo>=1, score, whatsappAvailable, ... }   // como hoje
MatchAnonimo   { anonymous: true, euRecebo>=1 }   // SEM partnerId/nome/avatar/distância
```

Regras:
- `euDou >= 1 && euRecebo >= 1` → MatchCompleto.
- `euDou == 0 && euRecebo >= 1` → MatchAnonimo (campos identificáveis omitidos no servidor).
- `euRecebo == 0` → não aparece.

A lista pode retornar os completos primeiro e, ao final, uma representação agregada/anônima
das oportunidades (ex.: N entradas anônimas, ou uma contagem). Detalhe de apresentação
fica no plano; o invariante é: **nada identificável quando anônimo**.

## Invariantes

| Invariante | Garantia |
|-----------|----------|
| Ordem do álbum == planilha | `section_order` + `ORDER BY section_order` |
| Catálogo == 48 times 2026 | seed reescrito |
| Nome de exibição editável | onboarding grava `users.name` |
| Match anônimo não vaza identidade | servidor omite `partnerId`/nome/avatar; rota de detalhe recusa sem reciprocidade |
