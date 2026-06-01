# =============================================================================
# TrocaFigurinha — Setup de banco PostgreSQL local (sem GCloud)
# =============================================================================
# Usage:
#   .\scripts\setup-local-db.ps1
#   .\scripts\setup-local-db.ps1 -DbPassword "outra-senha" -PsqlPath "C:\Program Files\PostgreSQL\16\bin\psql.exe"
#
# Prerequisites:
#   PostgreSQL 15+ instalado localmente
#   psql disponivel no PATH (ou informe -PsqlPath)
# =============================================================================

param(
    [string]$DbHost     = "localhost",
    [string]$DbPort     = "5432",
    [string]$DbName     = "trocafigurinhas",
    [string]$DbUser     = "app_user",
    [string]$DbPassword = "trocafig_dev",
    [string]$PgAdmin    = "postgres",
    [string]$PsqlPath   = "psql"
)

$ErrorActionPreference = "Stop"

function Invoke-Psql {
    param([string]$User, [string]$Sql, [string]$Database = "postgres")
    & $PsqlPath -h $DbHost -p $DbPort -U $User -d $Database -c $Sql
    if ($LASTEXITCODE -ne 0) { throw "psql falhou ao executar: $Sql" }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TrocaFigurinha — Setup banco local"
Write-Host "Host: $DbHost`:$DbPort  Banco: $DbName  Usuario: $DbUser"
Write-Host "============================================================"

# 1. Criar usuario
Write-Host "`n1. Criando usuario '$DbUser'..." -ForegroundColor Yellow
try {
    Invoke-Psql -User $PgAdmin -Sql "CREATE USER $DbUser WITH PASSWORD '$DbPassword';"
} catch {
    Write-Host "  Usuario ja existe ou erro ignorado, continuando..." -ForegroundColor DarkYellow
}

# 2. Criar banco
Write-Host "`n2. Criando banco '$DbName'..." -ForegroundColor Yellow
try {
    Invoke-Psql -User $PgAdmin -Sql "CREATE DATABASE $DbName OWNER $DbUser;"
} catch {
    Write-Host "  Banco ja existe ou erro ignorado, continuando..." -ForegroundColor DarkYellow
}

# 3. Permissoes
Write-Host "`n3. Concedendo permissoes..." -ForegroundColor Yellow
Invoke-Psql -User $PgAdmin -Sql "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"

# 4. Extensoes (requer superuser, por isso usa postgres)
Write-Host "`n4. Instalando extensoes PostgreSQL..." -ForegroundColor Yellow
$extensions = @("uuid-ossp", "cube", "earthdistance", "pgcrypto")
foreach ($ext in $extensions) {
    Invoke-Psql -User $PgAdmin -Database $DbName -Sql "CREATE EXTENSION IF NOT EXISTS `"$ext`";"
    Write-Host "  OK: $ext"
}

# 5. Gerar .env.local
Write-Host "`n5. Gerando .env.local..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot ".." ".env.local"
$envPath = [System.IO.Path]::GetFullPath($envPath)

$arr = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($arr)
$authSecret = [Convert]::ToBase64String($arr)

$envContent = @"
# Gerado por setup-local-db.ps1 em $(Get-Date -Format "yyyy-MM-dd HH:mm")
DATABASE_URL=postgresql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}

AUTH_SECRET=${authSecret}
AUTH_URL=http://localhost:3000

# Google OAuth — crie em console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=SUBSTITUIR
GOOGLE_CLIENT_SECRET=SUBSTITUIR

# SendGrid — opcional para testes locais
SENDGRID_API_KEY=SUBSTITUIR
SENDGRID_FROM_EMAIL=noreply@trocafigurinhas.com.br

NEXT_PUBLIC_BASE_URL=http://localhost:3000
"@

if (Test-Path $envPath) {
    Write-Host "  .env.local ja existe — nao sobrescrevendo." -ForegroundColor DarkYellow
    Write-Host "  Se quiser regenerar, apague o arquivo e rode novamente."
} else {
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Host "  Criado: $envPath"
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Banco configurado!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:"
Write-Host "  1. npm install"
Write-Host "  2. npm run db:reset   (cria tabelas)"
Write-Host "  3. npm run db:seed    (popula stickers e CEPs)"
Write-Host "  4. npm run dev"
Write-Host ""
Write-Host "Para testar sem Google OAuth, deixe GOOGLE_CLIENT_ID como esta."
Write-Host "Login com email/senha funciona sem configuracao adicional."
Write-Host "============================================================" -ForegroundColor Green
