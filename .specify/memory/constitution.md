<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Bump rationale: MAJOR — first concrete constitution, replacing blank template.

Modified principles:
  [PRINCIPLE_1_NAME] → I. Web-First Architecture
  [PRINCIPLE_2_NAME] → II. Authentication & Identity
  [PRINCIPLE_3_NAME] → III. Security by Default (NON-NEGOTIABLE)
  [PRINCIPLE_4_NAME] → IV. Cloud-Native Deployment (GCloud)
  [PRINCIPLE_5_NAME] → V. Simplicity & Maintainability

Added sections:
  - Security Requirements (replaces [SECTION_2_NAME])
  - Development & Operations Workflow (replaces [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gates align with 5 principles above
  ✅ .specify/templates/spec-template.md — No structural changes required; principles inform FRs
  ✅ .specify/templates/tasks-template.md — Foundational phase MUST include auth, GCloud config tasks

Deferred TODOs:
  - RATIFICATION_DATE set to today (2026-05-28); no prior ratification history.
-->

# TrocaFigurinha Constitution

## Core Principles

### I. Web-First Architecture

The portal MUST be a web application accessible via standard browsers without requiring
native app installation. All user-facing features MUST be reachable through the web
interface. Progressive enhancement applies: core functionality MUST work without JavaScript;
enhanced interactions MAY rely on it.

**Rationale**: The product is explicitly a "Portal Web." Constraining to web-first prevents
scope creep into native apps and keeps deployment and distribution simple.

### II. Authentication & Identity

Every protected resource MUST require authentication. The platform uses Google OAuth 2.0
as the sole identity mechanism:
- **Google OAuth 2.0 ("Entrar com Google")** — the only supported login method; OAuth
  tokens MUST NOT be stored raw; only the derived identity (Google user id, email,
  display name) is persisted.
- Email + password authentication is explicitly NOT supported; no credential forms,
  registration endpoints, or password hashing infrastructure shall exist.

Guest access is forbidden for any route that reads or writes user-specific data.

**Rationale**: Simplified to Google OAuth only (amended in feature 002-google-only-auth).
Removes email verification, parental consent email flows, and password management
complexity. Google provides identity verification, reducing the attack surface.

### III. Security by Default (NON-NEGOTIABLE)

Security controls are non-optional and MUST be implemented before any feature is considered
complete:
- All traffic MUST be served over HTTPS; HTTP MUST redirect to HTTPS.
- Auth endpoints MUST enforce rate limiting to mitigate brute-force attacks.
- Sessions or JWTs MUST have bounded lifetimes; refresh tokens MUST be rotatable.
- Secrets (DB credentials, OAuth client secrets, API keys) MUST be managed via
  Google Cloud Secret Manager; MUST NOT appear in source code or container images.
- Input validation MUST occur at every system boundary (API, form, webhook).

**Rationale**: A trading platform handles user identity and potentially personal data.
Security lapses at launch are irrecoverable for trust.

### IV. Cloud-Native Deployment (GCloud)

The application MUST be deployed on Google Cloud Platform. Infrastructure choices MUST
prefer managed GCP services over self-managed equivalents:
- Compute: Cloud Run (preferred) or GKE; raw VMs only with justification.
- Database: Cloud SQL or Firestore; self-hosted DB only with justification.
- CI/CD: Cloud Build or a GCP-integrated pipeline; artifacts stored in Artifact Registry.
- Observability: Cloud Logging and Cloud Monitoring MUST be enabled from day one.

Environment-specific configuration MUST be injected at runtime via Secret Manager or
environment variables; MUST NOT be baked into container images.

**Rationale**: User input specifies GCloud as the deployment target. Cloud-native choices
maximize operator leverage and reduce maintenance burden.

### V. Simplicity & Maintainability

Build the simplest thing that satisfies the current requirement. YAGNI applies strictly:
- No speculative abstractions or "future-proofing" layers.
- Three similar lines of code are preferable to a premature abstraction.
- Dependencies MUST be justified; each new dependency increases maintenance burden.
- Complexity MUST be documented in the plan's Complexity Tracking table if it deviates
  from the simplest path.

**Rationale**: A lean codebase is easier to onboard, audit for security, and evolve.
Complexity compounds; prevent it early.

## Security Requirements

Beyond Principle III, the following constraints apply across all features:

- **OWASP Top 10**: All features MUST be reviewed against the current OWASP Top 10 before
  merge. SQL injection, XSS, CSRF, and broken access control are zero-tolerance defects.
- **Data minimisation**: Collect only the user data strictly necessary for the feature.
  Do not store data that is not actively used.
- **Dependency scanning**: Third-party packages MUST be scanned for known vulnerabilities
  (e.g., via `npm audit`, `pip-audit`, Snyk, or Dependabot) as part of CI.
- **Logging**: Security-relevant events (login, logout, failed auth, permission denial)
  MUST be logged to Cloud Logging with a structured format. PII MUST NOT appear in logs.

## Development & Operations Workflow

- **Branching**: Feature branches follow `###-feature-name` convention. PRs target `main`.
- **CI gates**: All PRs MUST pass: linting, unit tests (if applicable), security scan,
  and Docker image build before merge.
- **Environments**: At minimum, `staging` and `production` environments on GCloud. Every
  merge to `main` MUST deploy to `staging` automatically; promotion to `production` is
  manual or gated by explicit approval.
- **Rollback**: Every production deployment MUST be rollback-capable within 5 minutes
  (Cloud Run traffic splitting satisfies this).
- **Observability**: Error rate and latency dashboards MUST exist in Cloud Monitoring
  before a feature reaches production.

## Governance

This constitution supersedes all conflicting project conventions. Amendments follow this
procedure:

1. Author opens a PR with the proposed change to `.specify/memory/constitution.md`.
2. Amendment is reviewed and approved by at least one other maintainer.
3. A migration plan is documented for any principle that changes in a
   backward-incompatible way (MAJOR version bump).
4. The version is incremented per semantic versioning:
   - MAJOR: backward-incompatible principle removal or redefinition.
   - MINOR: new principle or materially expanded guidance added.
   - PATCH: clarification, wording, or non-semantic refinement.
5. `LAST_AMENDED_DATE` is updated to the merge date.

All PRs and code reviews MUST verify compliance with the five Core Principles before
approval. Complexity deviations MUST be entered in the plan's Complexity Tracking table
with explicit justification.

**Version**: 2.0.0 | **Ratified**: 2026-05-28 | **Last Amended**: 2026-05-29
