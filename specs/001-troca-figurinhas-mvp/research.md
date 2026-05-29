# Research: Plataforma de Troca de Figurinhas — MVP

**Feature**: `001-troca-figurinhas-mvp`
**Phase**: 0 — Outline & Research
**Date**: 2026-05-28

---

## 1. Stack: Next.js (TypeScript) como Full-Stack PWA

**Decision**: Next.js 15 (App Router) com TypeScript.

**Rationale**: A aplicação é um portal web mobile-first com necessidade de SSR (para SEO e
desempenho em mobile), API backend, e suporte a PWA. Next.js unifica frontend e backend em
um único projeto/deployável, alinhando-se ao Princípio V (Simplicidade). A renderização
server-side permite carregamento rápido em conexões móveis lentas, crítico para o público
brasileiro.

**Alternatives considered**:
- React SPA + FastAPI separado: dois serviços, dois Cloud Run containers, maior complexidade
  operacional sem benefício de desempenho para o MVP.
- Remix: alternativa válida mas ecossistema menor, menor familiaridade.

---

## 2. PWA: next-pwa

**Decision**: Pacote `next-pwa` (ou `@ducanh2912/next-pwa`) configurado sobre Next.js.

**Rationale**: Permite instalar a plataforma como app na home screen de smartphones Android/iOS
sem publicar nas lojas. Funciona offline para visualização do álbum já carregado. Alinha-se ao
requisito mobile-first.

**Key configuration**:
- Service worker com cache-first para assets estáticos
- Network-first para dados dinâmicos (matches, coleção)
- `manifest.json` com ícone, `theme_color`, `display: standalone`

---

## 3. Banco de Dados: Cloud SQL (PostgreSQL 15)

**Decision**: Cloud SQL PostgreSQL 15 via conexão com `postgres.js` (sem ORM).

**Rationale**: O algoritmo de matching requer JOINs complexos entre coleções de pares de
usuários. Uma query SQL é ordens de magnitude mais eficiente que buscar todos os dados e
calcular no servidor de aplicação. PostgreSQL suporta natively a fórmula de haversine via
extensão `earthdistance` + `cube`, eliminando necessidade de calcular distância em código.

**Matching query sketch**:
```sql
-- Para calcular matches de um usuário :me
SELECT
  b.id AS partner_id,
  COUNT(CASE WHEN ua.status='duplicate' AND ub.status='needs' THEN 1 END) AS eu_dou,
  COUNT(CASE WHEN ub.status='duplicate' AND ua.status='needs' THEN 1 END) AS eu_recebo,
  LEAST(
    COUNT(CASE WHEN ua.status='duplicate' AND ub.status='needs' THEN 1 END),
    COUNT(CASE WHEN ub.status='duplicate' AND ua.status='needs' THEN 1 END)
  ) AS score,
  earth_distance(
    ll_to_earth(ca.lat, ca.lng),
    ll_to_earth(cb.lat, cb.lng)
  ) / 1000 AS distance_km
FROM user_stickers ua
JOIN user_stickers ub ON ua.sticker_id = ub.sticker_id
JOIN users a ON a.id = ua.user_id
JOIN users b ON b.id = ub.user_id
JOIN cep_centroids ca ON left(a.cep, 5) = ca.cep_prefix
JOIN cep_centroids cb ON left(b.cep, 5) = cb.cep_prefix
WHERE ua.user_id = :me AND ub.user_id != :me
GROUP BY b.id, ca.lat, ca.lng, cb.lat, cb.lng
HAVING score > 0
ORDER BY score DESC, distance_km ASC;
```

**Alternatives considered**:
- Firestore: document-based, não suporta JOINs; matching precisaria buscar todas as coleções
  e processar em memória — inviável para N usuários.
- Cloud Spanner: custo excessivo para MVP.

---

## 4. Geolocalização por CEP: Tabela de Centroides

**Decision**: Tabela `cep_centroids` pré-carregada com lat/lng por prefixo de 5 dígitos do CEP,
derivada de dados públicos do IBGE/OpenStreetMap. Extensão PostgreSQL `earthdistance` + `cube`
para cálculo de distância haversine diretamente no banco.

**Rationale**: Armazenar apenas o CEP do usuário (conformidade com LGPD — dados mínimos).
Nunca exibir o CEP bruto — apenas a distância calculada. A granularidade de 5 dígitos (bairro/
distrito) é suficiente para ranking por proximidade sem expor localização precisa.

**Data source**: Tabela de CEPs com coordenadas aproximadas por "faixa de CEP" (primeiros 5
dígitos) disponível em datasets públicos do IBGE (localidades) e Correios. Seed SQL incluído
no repositório.

**Fallback**: CEP inválido ou não encontrado → usuário notificado; distância não calculada →
esse usuário aparece no final da lista de matches (distância ∞).

**Alternatives considered**:
- Google Maps Geocoding API: custo por request, latência extra, dependência externa.
- ViaCEP API: fornece endereço mas não coordenadas; precisaria de segunda chamada de geocoding.
- PostGIS com tabela completa de CEPs: mais preciso mas seed muito grande para MVP.

---

## 5. Autenticação: Auth.js (NextAuth v5)

**Decision**: Auth.js v5 com `CredentialsProvider` (email + bcrypt) e `GoogleProvider` (OAuth 2.0).
Sessões armazenadas em PostgreSQL via `@auth/pg-adapter`. JWT rotacionável como fallback.

**Rationale**: Auth.js integra nativamente com Next.js, suporta ambos os mecanismos requeridos
pela constituição (Princípio II), e o adapter PostgreSQL armazena sessões no mesmo banco de
dados já provisionado — sem Redis adicional para MVP.

**Security configuration**:
- Bcrypt cost factor: 12 (conforme Princípio II da constituição)
- Session lifetime: 24h (access token), 30 dias (session token, rotatable)
- CSRF protection: embutido no Auth.js
- Rate limiting: middleware customizado em `/api/auth/*` — máximo 10 tentativas/minuto por IP

---

## 6. Estrutura do Álbum FIFA 2026

**Decision**: 48 seleções × 20 figurinhas = 960 figurinhas de seleção + 20 figurinhas especiais do torneio (FWC) = **980 figurinhas no álbum oficial Panini**. Adicionalmente, 14 figurinhas promocionais Coca-Cola (fora do álbum oficial), totalizando 994 figurinhas no catálogo do sistema.

**Rationale**: Estrutura confirmada via planilha exaustiva de controle compartilhada por colecionador. Cada figurinha é identificada unicamente por `{prefixo}{número}` (ex: `BRA1`, `FWC0`, `CC7`). 50 prefixos no total: 48 códigos FIFA das seleções (organizadas em 12 grupos A–L, 4 seleções por grupo), `FWC` para especiais do torneio, e `CC` para extras promocionais Coca-Cola. Em cada seção de seleção, posição `#1` = escudo, `#13` = foto do elenco, demais = jogadores (18 por seleção).

**Organização no banco**:
- `sticker_id`: chave natural `{prefix}{number}` (ex: `BRA1`, `FWC0`, `CC7`) — vira doc ID direto no Firestore
- `section_type`: `national_team` (960) | `tournament_special` (20) | `promotional` (14)
- `group`: `A`–`L` para seleções | `null` para especiais e promocionais
- `team_slug`: código FIFA da seleção (`BRA`, `ARG`, `USA`...) | `null` para especiais
- `position_in_section`: 1–20 (relativa, permite renderizar grid sem cálculo no client)
- `position_role`: `badge` (#1) | `team_photo` (#13) | `player` | `intro` (FWC0–8) | `history` (FWC9–19) | `promo` (CC)
- `is_official_album`: `true` (980 oficiais) | `false` (14 Coca-Cola) — separa cálculo de % do álbum, opt-in de troca de promocionais
- `release_batch`: `original` | `coca_cola` | `update_<seleção>` (suporta packs de atualização pós-convocação)
- `rarity`: `regular` | `gold` (figurinhas douradas raras, peso maior no algoritmo de matching)

**TODO**: Modelar `release_batch` desde o início para absorver os packs de atualização pós-convocação sem migração. Validar com app oficial FIFA Panini Collection se há figurinhas adicionais (douradas raras, legends) que não constam na planilha-fonte.

---

## 7. LGPD — Fluxo de Consentimento Parental (13–15 anos)

**Decision**: Usuários que declaram ter entre 13 e 15 anos devem informar e-mail do responsável
legal. O sistema envia e-mail de consentimento ao responsável com link de aprovação. O acesso
fica em estado `pending_parental_consent` até aprovação. Usuários menores de 13 são bloqueados
no cadastro.

**Rationale**: O art. 14 §1 da LGPD exige consentimento "específico e destacado" de ao menos
um dos pais para tratamento de dados de crianças (< 13) e adolescentes (13–17 em algumas
interpretações, 13–15 conforme decisão do projeto). O fluxo via e-mail do responsável é
implementável no MVP sem infra adicional (usa o serviço de e-mail já configurado para
transacionais).

**States**: `incomplete_onboarding` → `pending_parental_consent` (só para 13–15) → `active`

**Alternatives considered**:
- Checkbox simples "Tenho autorização dos pais": juridicamente frágil.
- Verificação de CPF do responsável: complexidade e custo de integração excessivos para MVP.

---

## 8. Envio de E-mail Transacional

**Decision**: SendGrid (ou alternativa: Resend) via API HTTP. Nenhuma dependência de SMTP local.

**Rationale**: Necessário para: (a) verificação de e-mail no cadastro, (b) consentimento
parental, (c) futuramente: notificações de match. SendGrid tem tier gratuito (100 e-mails/dia)
suficiente para MVP. API key armazenada no Secret Manager.

---

## 9. CI/CD: Cloud Build (source-based deploy, sem Docker local)

**Decision**: `cloudbuild.yaml` com steps: lint → test → `gcloud run deploy --source .`
(Cloud Build faz o build da imagem internamente via Buildpacks, sem necessidade de Dockerfile
local ou Docker instalado no ambiente de desenvolvimento).

**Rationale**: Nativo GCP, sem custo adicional de infra CI. O Cloud Build constrói e publica
a imagem no Artifact Registry e faz o deploy no Cloud Run em um único comando. Desenvolvedores
não precisam de Docker instalado localmente — o fluxo local usa o Cloud SQL Auth Proxy.

## 10. Ambiente Local: Cloud SQL Auth Proxy (sem Docker)

**Decision**: Desenvolvimento local conecta ao Cloud SQL de staging via Cloud SQL Auth Proxy.
Sem Docker. O binário do proxy autentica via `gcloud auth application-default login`.

**Rationale**: Elimina Docker como prerequisito de desenvolvimento. O banco de staging no
Cloud SQL já está provisionado pelo script de setup — não há custo de manter um banco local
separado. O Auth Proxy garante conexão segura sem expor credentials do banco.

**Tradeoff aceito**: Desenvolvimento requer conexão com a internet e acesso ao GCloud project.
Para MVP com equipe pequena, essa restrição é aceitável.

## 11. Script de Provisionamento: `scripts/setup-gcloud.sh`

**Decision**: Script bash que provisiona todo o ambiente GCloud do zero: Cloud SQL, Cloud Run,
Artifact Registry, Secret Manager, Cloud Build trigger, Service Account.

**Rationale**: Garante ambiente reproduzível sem passos manuais no Console GCloud. Qualquer
desenvolvedor com acesso ao projeto executa um único script e tem o ambiente completo. Alinha
com o Princípio IV (Cloud-Native) e reduz risco de configuração inconsistente.

**Recursos provisionados**:
- Cloud SQL: instância PostgreSQL 15, banco `trocafigurinhas`, extensões `cube`+`earthdistance`
- Secret Manager: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `SENDGRID_API_KEY`
- Artifact Registry: repositório Docker `trocafigurinhas`
- Cloud Run: serviço `trocafigurinhas-staging` e `trocafigurinhas-production`
- Cloud Build: trigger conectado ao repositório GitHub/Cloud Source Repositories
- IAM: Service Account com roles mínimas (`roles/cloudsql.client`, `roles/secretmanager.secretAccessor`,
  `roles/run.invoker`)

---

## Resoluções de NEEDS CLARIFICATION

| Campo | Resolução |
|-------|-----------|
| Linguagem/Framework | TypeScript / Next.js 15 (App Router) |
| Banco de dados | Cloud SQL PostgreSQL 15 (sem ORM, postgres.js) |
| Auth | Auth.js v5 (NextAuth) — credentials + Google OAuth |
| PWA | next-pwa com service worker |
| Geolocalização CEP | Tabela de centroides por 5-dígitos + earthdistance PostgreSQL |
| E-mail transacional | SendGrid (tier gratuito suficiente para MVP) |
| CI/CD | Cloud Build (source-based, sem Docker local) + Artifact Registry + Cloud Run |
| Ambiente local | Cloud SQL Auth Proxy (sem Docker); banco de staging no GCloud |
| Provisionamento | `scripts/setup-gcloud.sh` — cria todos os recursos GCloud do zero |
| Álbum FIFA 2026 | 994 figurinhas (980 oficiais Panini + 14 CC); 48 seleções × 20 + 20 FWC + 14 CC; chave natural `{PREFIX}{N}` |
| LGPD 13–15 anos | E-mail de consentimento ao responsável legal |
