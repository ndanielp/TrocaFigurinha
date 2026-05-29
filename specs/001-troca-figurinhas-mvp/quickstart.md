# Developer Quickstart: TrocaFigurinha

**Feature**: `001-troca-figurinhas-mvp`
**Stack**: Next.js 15 (TypeScript), PostgreSQL 15, Auth.js v5
**Shell**: PowerShell (Windows)

---

## Opção A — PostgreSQL local (recomendado para desenvolvimento)

Sem GCloud, sem proxy. Requer PostgreSQL 15+ instalado localmente.

### 1. Configure o banco

```powershell
.\scripts\setup-local-db.ps1
```

O script:
- Cria o usuário `app_user` e o banco `trocafigurinhas`
- Instala as extensões `uuid-ossp`, `cube`, `earthdistance`, `pgcrypto`
- Gera o `.env.local` com `DATABASE_URL` e `AUTH_SECRET` prontos

Parâmetros opcionais:
```powershell
.\scripts\setup-local-db.ps1 -DbPassword "outra-senha" -PsqlPath "C:\Program Files\PostgreSQL\15\bin\psql.exe"
```

### 2. Instale dependências e crie as tabelas

```powershell
npm install
npm run db:reset   # drop + cria todas as tabelas
npm run db:seed    # popula stickers (994) e CEP centroids
```

### 3. Inicie

```powershell
npm run dev
```

Acesse `http://localhost:3000`

> Google OAuth é opcional — cadastro e login com email/senha funcionam sem ele.

---

## Opção B — Cloud SQL Auth Proxy (ambiente GCloud)

### 1. Provisione os recursos GCloud (primeira vez)

```powershell
gcloud auth login
gcloud auth application-default login

.\scripts\setup-gcloud.ps1 -ProjectId trocafigurinhas-2026
# Com trigger de deploy automático no GitHub:
.\scripts\setup-gcloud.ps1 -ProjectId trocafigurinhas-2026 -GithubOwner seu-usuario
```

O script cria: Cloud SQL, Secret Manager, Artifact Registry, Cloud Run (staging + prod), Cloud Build trigger.

### 2. Baixe e inicie o Cloud SQL Auth Proxy

Em um terminal separado, mantido aberto durante o desenvolvimento:

```powershell
# Baixar (uma vez)
Invoke-WebRequest `
  -Uri "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.windows.amd64.exe" `
  -OutFile cloud-sql-proxy.exe

# Iniciar proxy (substituir PROJECT_ID)
.\cloud-sql-proxy.exe trocafigurinhas-2026:southamerica-east1:trocafigurinhas-db --port 5432
```

### 3. Configure `.env.local`, migre e inicie

```powershell
Copy-Item .env.local.example .env.local
# Edite .env.local com os valores exibidos ao final do setup-gcloud.ps1

npm install
npm run db:reset
npm run db:seed
npm run dev
```

---

## Fluxo de teste local

1. Acesse `/login` — clique em "Entrar com Google" e autentique com sua conta Google
2. Complete o onboarding (CEP, nome de exibição)
3. Marque figurinhas no álbum em `/album`
4. Numa aba anônima (ou outro navegador), faça login com uma segunda conta Google com coleção complementar
5. Acesse `/matches` no primeiro usuário — deve aparecer o match bilateral

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor Next.js (hot reload) |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Executa migrations pendentes |
| `npm run db:seed` | Popula dados estáticos (idempotente) |
| `npm run db:reset` | Drop + recria schema (apenas dev) |

| Script PowerShell | Descrição |
|-------------------|-----------|
| `.\scripts\setup-local-db.ps1` | Cria banco PostgreSQL local + `.env.local` |
| `.\scripts\setup-gcloud.ps1` | Provisiona toda a infraestrutura GCloud |

---

## Deploy no Google Cloud

```powershell
gcloud run deploy trocafigurinhas-staging `
  --source . `
  --region southamerica-east1 `
  --project trocafigurinhas-2026
```

O `infra/cloudbuild.yaml` automatiza: `npm audit` → lint → build → deploy.
Promoção para produção é manual via `gcloud run services update-traffic`.
