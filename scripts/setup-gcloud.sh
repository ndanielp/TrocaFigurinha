#!/usr/bin/env bash
# =============================================================================
# TrocaFigurinha — GCloud Infrastructure Provisioning Script
# =============================================================================
# Usage: ./scripts/setup-gcloud.sh
# Prerequisites:
#   - gcloud CLI installed and authenticated (gcloud auth login)
#   - GCLOUD_PROJECT_ID environment variable set, or edit PROJECT_ID below
# =============================================================================

set -euo pipefail

# --- Configuration ---
PROJECT_ID="${GCLOUD_PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${GCLOUD_REGION:-southamerica-east1}"
DB_INSTANCE="trocafigurinhas-db"
DB_NAME="trocafigurinhas"
DB_USER="trocafigurinhas"
ARTIFACT_REPO="trocafigurinhas"
SERVICE_ACCOUNT_NAME="trocafigurinhas-sa"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CLOUD_RUN_STAGING="trocafigurinhas-staging"
CLOUD_RUN_PROD="trocafigurinhas-prod"
CLOUD_BUILD_TRIGGER="trocafigurinhas-main"
REPO_OWNER="${GITHUB_OWNER:-}"
REPO_NAME="${GITHUB_REPO:-TrocaFigurinha}"

echo "============================================================"
echo "TrocaFigurinha — GCloud Setup"
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo "============================================================"

# --- 1. Enable required APIs ---
echo ""
echo "1. Enabling required APIs..."
gcloud services enable \
  sqladmin.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="${PROJECT_ID}"

# --- 2. Create Service Account ---
echo ""
echo "2. Creating service account..."
gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
  --display-name="TrocaFigurinha Service Account" \
  --project="${PROJECT_ID}" || echo "Service account may already exist, continuing..."

# Grant minimal required roles
ROLES=(
  "roles/cloudsql.client"
  "roles/secretmanager.secretAccessor"
  "roles/run.invoker"
  "roles/artifactregistry.writer"
)
for ROLE in "${ROLES[@]}"; do
  echo "  Granting ${ROLE}..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="${ROLE}" \
    --quiet
done

# --- 3. Create Artifact Registry repository ---
echo ""
echo "3. Creating Artifact Registry repository..."
gcloud artifacts repositories create "${ARTIFACT_REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="TrocaFigurinha container images" \
  --project="${PROJECT_ID}" || echo "Repository may already exist, continuing..."

# --- 4. Create Cloud SQL instance ---
echo ""
echo "4. Creating Cloud SQL PostgreSQL 15 instance (this may take several minutes)..."
gcloud sql instances create "${DB_INSTANCE}" \
  --database-version=POSTGRES_15 \
  --tier=db-g1-small \
  --region="${REGION}" \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=04:00 \
  --deletion-protection \
  --project="${PROJECT_ID}" || echo "Instance may already exist, continuing..."

# Enable extensions (cube + earthdistance)
echo "  Enabling database extensions..."
gcloud sql databases create "${DB_NAME}" \
  --instance="${DB_INSTANCE}" \
  --project="${PROJECT_ID}" || echo "Database may already exist, continuing..."

# Create database user
DB_PASSWORD=$(openssl rand -base64 24)
echo "  Creating database user (password stored in Secret Manager)..."
gcloud sql users create "${DB_USER}" \
  --instance="${DB_INSTANCE}" \
  --password="${DB_PASSWORD}" \
  --project="${PROJECT_ID}" || echo "User may already exist, continuing..."

# --- 5. Create Secret Manager secrets ---
echo ""
echo "5. Creating Secret Manager secrets..."

CLOUD_SQL_CONNECTION="${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?host=/cloudsql/${CLOUD_SQL_CONNECTION}"

create_secret() {
  local SECRET_NAME="$1"
  local SECRET_VALUE="$2"
  if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "  Secret ${SECRET_NAME} already exists, adding new version..."
    echo -n "${SECRET_VALUE}" | gcloud secrets versions add "${SECRET_NAME}" \
      --data-file=- --project="${PROJECT_ID}"
  else
    echo "  Creating secret ${SECRET_NAME}..."
    echo -n "${SECRET_VALUE}" | gcloud secrets create "${SECRET_NAME}" \
      --data-file=- --project="${PROJECT_ID}"
  fi
  gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT_ID}" --quiet
}

create_secret "DATABASE_URL" "${DATABASE_URL}"

# Placeholder secrets — must be filled manually
NEXTAUTH_SECRET=$(openssl rand -base64 32)
create_secret "NEXTAUTH_SECRET" "${NEXTAUTH_SECRET}"
create_secret "GOOGLE_CLIENT_ID" "REPLACE_WITH_GOOGLE_CLIENT_ID"
create_secret "GOOGLE_CLIENT_SECRET" "REPLACE_WITH_GOOGLE_CLIENT_SECRET"
create_secret "SENDGRID_API_KEY" "REPLACE_WITH_SENDGRID_API_KEY"

echo ""
echo "  IMPORTANT: Update GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and SENDGRID_API_KEY"
echo "  in Secret Manager before deploying:"
echo "  https://console.cloud.google.com/security/secret-manager?project=${PROJECT_ID}"

# --- 6. Create Cloud Run services ---
echo ""
echo "6. Creating Cloud Run services..."

for SERVICE in "${CLOUD_RUN_STAGING}" "${CLOUD_RUN_PROD}"; do
  echo "  Creating service ${SERVICE}..."
  gcloud run services describe "${SERVICE}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" &>/dev/null && \
    echo "  Service ${SERVICE} already exists, skipping..." && continue

  # Deploy a placeholder to create the service
  gcloud run deploy "${SERVICE}" \
    --image="us-docker.pkg.dev/cloudrun/container/hello" \
    --region="${REGION}" \
    --platform=managed \
    --service-account="${SERVICE_ACCOUNT_EMAIL}" \
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,SENDGRID_API_KEY=SENDGRID_API_KEY:latest" \
    --add-cloudsql-instances="${CLOUD_SQL_CONNECTION}" \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --project="${PROJECT_ID}"
done

# --- 7. Create Cloud Build trigger ---
echo ""
echo "7. Creating Cloud Build trigger..."
if [ -n "${REPO_OWNER}" ]; then
  gcloud builds triggers create github \
    --repo-name="${REPO_NAME}" \
    --repo-owner="${REPO_OWNER}" \
    --branch-pattern="^main$" \
    --build-config="infra/cloudbuild.yaml" \
    --name="${CLOUD_BUILD_TRIGGER}" \
    --description="Deploy TrocaFigurinha to staging on push to main" \
    --service-account="projects/${PROJECT_ID}/serviceAccounts/${SERVICE_ACCOUNT_EMAIL}" \
    --project="${PROJECT_ID}" || echo "Trigger may already exist, continuing..."
else
  echo "  Skipping Cloud Build trigger — set GITHUB_OWNER env var to enable."
  echo "  Run manually: gcloud builds triggers create github --repo-name=${REPO_NAME} --repo-owner=YOUR_GITHUB_USERNAME ..."
fi

# --- Done ---
echo ""
echo "============================================================"
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Update placeholder secrets in Secret Manager"
echo "  2. Add authorized redirect URIs to Google OAuth credentials:"
echo "     https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
echo "     - https://YOUR_STAGING_URL/api/auth/callback/google"
echo "  3. Install the Cloud SQL Auth Proxy for local development:"
echo "     https://cloud.google.com/sql/docs/postgres/sql-proxy"
echo "  4. Run: gcloud auth application-default login"
echo "  5. Run the proxy: cloud-sql-proxy --port 5432 ${CLOUD_SQL_CONNECTION}"
echo "  6. Run: npm run db:migrate && npm run db:seed"
echo "  7. Run: npm run dev"
echo "============================================================"
