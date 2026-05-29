# =============================================================================
# TrocaFigurinha — GCloud Infrastructure Provisioning Script (PowerShell)
# =============================================================================
# Usage:
#   .\scripts\setup-gcloud.ps1 -ProjectId <seu-project-id>
#   .\scripts\setup-gcloud.ps1 -ProjectId <seu-project-id> -Region southamerica-east1 -GithubOwner seunome
#
# Prerequisites:
#   gcloud CLI instalado e autenticado:
#     gcloud auth login
#     gcloud auth application-default login
# =============================================================================

param(
    [string]$ProjectId   = "",
    [string]$Region      = "",
    [string]$GithubOwner = "",
    [string]$GithubRepo  = ""
)

if (-not $ProjectId)   { $ProjectId   = if ($env:GCLOUD_PROJECT_ID) { $env:GCLOUD_PROJECT_ID } else { "" } }
if (-not $Region)      { $Region      = if ($env:GCLOUD_REGION)     { $env:GCLOUD_REGION }     else { "southamerica-east1" } }
if (-not $GithubOwner) { $GithubOwner = if ($env:GITHUB_OWNER)      { $env:GITHUB_OWNER }      else { "" } }
if (-not $GithubRepo)  { $GithubRepo  = if ($env:GITHUB_REPO)       { $env:GITHUB_REPO }       else { "TrocaFigurinha" } }

$ErrorActionPreference = "Stop"

# --- Resolve project from gcloud config se não passado ---
if (-not $ProjectId) {
    $ProjectId = (gcloud config get-value project 2>$null).Trim()
}
if (-not $ProjectId) {
    Write-Error "ProjectId não informado. Use -ProjectId <id> ou configure com: gcloud config set project <id>"
    exit 1
}

$DbInstance            = "trocafigurinhas-db"
$DbName                = "trocafigurinhas"
$DbUser                = "trocafigurinhas"
$ArtifactRepo          = "trocafigurinhas"
$ServiceAccountName    = "trocafigurinhas-sa"
$ServiceAccountEmail   = "${ServiceAccountName}@${ProjectId}.iam.gserviceaccount.com"
$CloudRunStaging       = "trocafigurinhas-staging"
$CloudRunProd          = "trocafigurinhas-prod"
$CloudBuildTrigger     = "trocafigurinhas-main"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TrocaFigurinha - GCloud Setup"
Write-Host "Project: $ProjectId"
Write-Host "Region:  $Region"
Write-Host "============================================================"

# --- Helpers ---
function Invoke-GCloud {
    param([string[]]$GArgs)
    & gcloud @GArgs
    if ($LASTEXITCODE -ne 0) { throw "gcloud falhou: gcloud $GArgs" }
}

# Chama gcloud sem lancar excecao em caso de falha (para operacoes idempotentes).
# Retorna $LASTEXITCODE. Suprime NativeCommandError do wrapper gcloud.ps1.
function Invoke-GCloudMaybe {
    param([string[]]$GArgs)
    try {
        $prev = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        & gcloud @GArgs 2>&1 | Out-Null
        $ErrorActionPreference = $prev
    } catch { $ErrorActionPreference = $prev }
    return $LASTEXITCODE
}

function New-RandomBase64 {
    param([int]$Bytes = 32)
    $arr = [byte[]]::new($Bytes)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($arr)
    $rng.Dispose()
    return [Convert]::ToBase64String($arr)
}

function Set-Secret {
    param([string]$Name, [string]$Value)
    $ec = Invoke-GCloudMaybe @("secrets", "describe", $Name, "--project=$ProjectId")
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $Value, [System.Text.Encoding]::UTF8)
    if ($ec -eq 0) {
        Write-Host "  Secret $Name ja existe, adicionando nova versao..."
        Invoke-GCloud @("secrets", "versions", "add", $Name, "--data-file=$tmp", "--project=$ProjectId")
    } else {
        Write-Host "  Criando secret $Name..."
        Invoke-GCloud @("secrets", "create", $Name, "--data-file=$tmp", "--project=$ProjectId")
    }
    Remove-Item $tmp -Force
    Invoke-GCloud @(
        "secrets", "add-iam-policy-binding", $Name,
        "--member=serviceAccount:$ServiceAccountEmail",
        "--role=roles/secretmanager.secretAccessor",
        "--project=$ProjectId", "--quiet"
    )
}

# --- 1. Habilitar APIs ---
Write-Host "`n1. Habilitando APIs necessarias..." -ForegroundColor Yellow
Invoke-GCloud @(
    "services", "enable",
    "sqladmin.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "--project=$ProjectId"
)

# --- 2. Service Account ---
Write-Host "`n2. Criando service account..." -ForegroundColor Yellow
$ec = Invoke-GCloudMaybe @("iam", "service-accounts", "create", $ServiceAccountName,
    "--display-name=TrocaFigurinha Service Account", "--project=$ProjectId")
if ($ec -ne 0) { Write-Host "  Service account ja existe, continuando..." }

$Roles = @(
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/run.invoker",
    "roles/artifactregistry.writer"
)
foreach ($Role in $Roles) {
    Write-Host "  Concedendo $Role..."
    Invoke-GCloud @(
        "projects", "add-iam-policy-binding", $ProjectId,
        "--member=serviceAccount:$ServiceAccountEmail",
        "--role=$Role", "--quiet"
    )
}

# --- 3. Artifact Registry ---
Write-Host "`n3. Criando Artifact Registry..." -ForegroundColor Yellow
$ec = Invoke-GCloudMaybe @("artifacts", "repositories", "create", $ArtifactRepo,
    "--repository-format=docker", "--location=$Region",
    "--description=TrocaFigurinha container images", "--project=$ProjectId")
if ($ec -ne 0) { Write-Host "  Repositorio ja existe, continuando..." }

# --- 4. Cloud SQL ---
Write-Host "`n4. Criando instancia Cloud SQL PostgreSQL 15 (pode demorar alguns minutos)..." -ForegroundColor Yellow
$ec = Invoke-GCloudMaybe @("sql", "instances", "create", $DbInstance,
    "--database-version=POSTGRES_15", "--tier=db-g1-small", "--region=$Region",
    "--storage-type=SSD", "--storage-size=10GB", "--storage-auto-increase",
    "--backup-start-time=04:00", "--deletion-protection", "--project=$ProjectId")
if ($ec -ne 0) { Write-Host "  Instancia ja existe, continuando..." }

Write-Host "  Criando banco de dados..."
$ec = Invoke-GCloudMaybe @("sql", "databases", "create", $DbName,
    "--instance=$DbInstance", "--project=$ProjectId")
if ($ec -ne 0) { Write-Host "  Banco ja existe, continuando..." }

$DbPassword = New-RandomBase64 -Bytes 18
Write-Host "  Criando usuario do banco..."
$ec = Invoke-GCloudMaybe @("sql", "users", "create", $DbUser,
    "--instance=$DbInstance", "--password=$DbPassword", "--project=$ProjectId")
if ($ec -ne 0) { Write-Host "  Usuario ja existe, continuando..." }

# --- 5. Secret Manager ---
Write-Host "`n5. Criando secrets no Secret Manager..." -ForegroundColor Yellow

$CloudSqlConnection = "${ProjectId}:${Region}:${DbInstance}"
$DatabaseUrl = "postgres://${DbUser}:${DbPassword}@localhost:5432/${DbName}?host=/cloudsql/${CloudSqlConnection}"
$AuthSecret  = New-RandomBase64 -Bytes 32

Set-Secret -Name "DATABASE_URL"           -Value $DatabaseUrl
Set-Secret -Name "AUTH_SECRET"            -Value $AuthSecret
Set-Secret -Name "GOOGLE_CLIENT_ID"       -Value "REPLACE_WITH_GOOGLE_CLIENT_ID"
Set-Secret -Name "GOOGLE_CLIENT_SECRET"   -Value "REPLACE_WITH_GOOGLE_CLIENT_SECRET"
Set-Secret -Name "SENDGRID_API_KEY"       -Value "REPLACE_WITH_SENDGRID_API_KEY"
Set-Secret -Name "SENDGRID_FROM_EMAIL"    -Value "noreply@trocafigurinhas.com.br"

Write-Host ""
Write-Host "  IMPORTANTE: Atualize GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e SENDGRID_API_KEY" -ForegroundColor Red
Write-Host "  no Secret Manager antes do primeiro deploy:"
Write-Host "  https://console.cloud.google.com/security/secret-manager?project=$ProjectId"

# --- 6. Cloud Run ---
Write-Host "`n6. Criando servicos Cloud Run..." -ForegroundColor Yellow

foreach ($Service in @($CloudRunStaging, $CloudRunProd)) {
    $ec = Invoke-GCloudMaybe @("run", "services", "describe", $Service,
        "--region=$Region", "--project=$ProjectId")
    if ($ec -eq 0) {
        Write-Host "  Servico $Service ja existe, pulando..."
        continue
    }
    Write-Host "  Criando servico $Service..."
    Invoke-GCloud @(
        "run", "deploy", $Service,
        "--image=us-docker.pkg.dev/cloudrun/container/hello",
        "--region=$Region",
        "--platform=managed",
        "--service-account=$ServiceAccountEmail",
        "--set-secrets=DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,SENDGRID_API_KEY=SENDGRID_API_KEY:latest,SENDGRID_FROM_EMAIL=SENDGRID_FROM_EMAIL:latest",
        "--add-cloudsql-instances=$CloudSqlConnection",
        "--allow-unauthenticated",
        "--memory=512Mi",
        "--cpu=1",
        "--min-instances=0",
        "--max-instances=10",
        "--project=$ProjectId"
    )
}

# --- 7. Cloud Build trigger ---
Write-Host "`n7. Configurando Cloud Build trigger..." -ForegroundColor Yellow
if ($GithubOwner) {
    $ec = Invoke-GCloudMaybe @("builds", "triggers", "create", "github",
        "--repo-name=$GithubRepo", "--repo-owner=$GithubOwner",
        "--branch-pattern=^main$", "--build-config=infra/cloudbuild.yaml",
        "--name=$CloudBuildTrigger",
        "--description=Deploy TrocaFigurinha to staging on push to main",
        "--service-account=projects/${ProjectId}/serviceAccounts/${ServiceAccountEmail}",
        "--project=$ProjectId")
    if ($ec -ne 0) { Write-Host "  Trigger ja existe, continuando..." }
} else {
    Write-Host "  Pulando trigger - use -GithubOwner <seu-usuario> para habilitar."
}

# --- Sumario ---
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Setup concluido!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "  1. Atualize os secrets placeholder no Secret Manager"
Write-Host "  2. Adicione a URI de redirect no Google OAuth:"
Write-Host "     https://console.cloud.google.com/apis/credentials?project=$ProjectId"
Write-Host "     URI: https://SEU_STAGING_URL/api/auth/callback/google"
Write-Host "  3. Baixe o Cloud SQL Auth Proxy:"
Write-Host "     Invoke-WebRequest -Uri 'https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.windows.amd64.exe' -OutFile cloud-sql-proxy.exe"
Write-Host "  4. Inicie o proxy (terminal separado):"
Write-Host "     .\cloud-sql-proxy.exe ${CloudSqlConnection} --port 5432"
Write-Host "  5. Crie o .env.local com DATABASE_URL acima e AUTH_SECRET gerado"
Write-Host "  6. npm run db:migrate && npm run db:seed"
Write-Host "  7. npm run dev"
Write-Host ""
Write-Host "Connection string local:"
Write-Host "  DATABASE_URL=postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
