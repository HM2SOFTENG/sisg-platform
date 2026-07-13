# SISG Infrastructure Architecture + Handoff

## Purpose
Living handoff and architecture document for the SISG platform as it evolves toward:
- secure multi-user auth
- managed database-backed CRUD operations
- managed object storage
- mobile/native app readiness
- production-grade operational controls

This document should be updated as infrastructure and architecture decisions are executed.

## Current execution status
- [x] Existing web platform recovered and deployable on DigitalOcean droplet
- [x] Local SISG dev environment established
- [x] Public team/projects endpoints added
- [x] Native app architecture plan created
- [x] Native migration feature matrix created
- [x] Security hardening audit created
- [x] Managed Postgres provisioned
- [x] Spaces bucket provisioned
- [x] Shared auth/session/dashboard contracts extracted into workspace packages
- [x] Expo mobile shell wired to current admin auth + dashboard endpoints
- [ ] App backend migrated from JSON storage to managed Postgres
- [~] Auth model partially replaced with persisted account/session architecture
- [ ] React Native app moved from scaffold to production implementation

## Recommended target architecture

### Runtime layers
1. **Web app**
   - Existing React/Vite admin + public experience
2. **Mobile app**
   - Expo / React Native operator-first client
3. **API/backend**
   - Express backend evolving toward typed, validated, role-aware service layer
4. **Managed data services**
   - DigitalOcean Managed PostgreSQL
   - DigitalOcean Spaces for object/file storage
5. **Operational services**
   - SISG agents
   - ClawBot / gateway integrations

## Current hosting context
- DigitalOcean droplet: `SISGsite`
- Region: `sfo3`
- Domain: `sentinelintegratedgroup.com`
- App path on host: `/app/sisg-platform`

## Provisioned managed services
### Managed PostgreSQL
- Cluster name: `sisg-platform-db`
- Cluster id: `70d3cf5a-730d-48d0-872e-6394448f5563`
- Engine: PostgreSQL `18`
- Region: `sfo3`
- Size: `db-s-1vcpu-1gb`
- Nodes: `1`
- Status at provisioning: `online`
- App database: `sisg_platform`
- App user: `sisg_app`
- CA cert saved locally at: `.digitalocean-managed-postgres-ca.pem`

### DigitalOcean Spaces
- Bucket: `sisg-platform-assets-sfo3-20260514`
- Region: `sfo3`
- Endpoint: `https://sfo3.digitaloceanspaces.com`
- CDN-style base URL: `https://sisg-platform-assets-sfo3-20260514.sfo3.digitaloceanspaces.com`
- App key scope: bucket-scoped `readwrite`
- CORS configured for:
  - `https://sentinelintegratedgroup.com`
  - `https://www.sentinelintegratedgroup.com`
  - `http://localhost:3000`
  - `http://localhost:3001`

## Provisioning strategy in progress
### Recommended lean baseline
- **Managed PostgreSQL** in `sfo3`
  - single node
  - lean size for now
  - dedicated app database + app user
- **Spaces** in `sfo3`
  - one app bucket for uploads/assets/exports
  - dedicated access keys for app use

### Why this baseline
- low-risk upgrade path from JSON files
- better auth/session/storage foundation for mobile
- keeps cost lean while preserving room to scale

## Security principles
- no shared long-term admin secret model for production mobile
- no secrets committed to repo
- app/runtime secrets stored only in local env or deployment secret stores
- privileged actions must become auditable and role-scoped

## Current auth bootstrap reality
- The Expo shell and current web admin login now use persisted operator users and persisted refreshable sessions.
- Auth storage supports a Postgres-backed path when DB env is configured and falls back to local file persistence for development.
- A bootstrap admin account can seed itself from `AUTH_BOOTSTRAP_EMAIL` + `AUTH_BOOTSTRAP_PASSWORD` when no auth users exist yet.
- `ADMIN_PIN` is now only a migration fallback source for bootstrap seeding and should not remain the long-term operator credential path.
- Raw local auth secrets must stay out of tracked docs; only secret file locations should be documented.
- The local API helper now loads `.env.infrastructure.local` first, then `.env.local`, so gitignored local auth and future managed-service config are honored without hardcoding secrets in scripts.

## Secret handling
Provisioned secrets should be written to local, gitignored env files and deployment secret stores only.
This document should reference secret locations, not inline raw credential values.

## Expected env surfaces
### Local-only
- `.env.local`
- `.env.infrastructure.local`
  - contains provisioned DB + Spaces secrets
  - chmod `600`

### Deployment/runtime
- GitHub Actions secrets
- Droplet runtime env / compose env
- future mobile backend secret store as needed

## Integration targets after provisioning
- replace JSON storage service with Postgres-backed repositories
- move auth/session state into database-backed models
- use Spaces for:
  - uploaded files
  - generated exports
  - proposal/contract artifacts
  - future user/media assets if needed

## Recommended first database schema domains
1. `users`
   - internal operators/admins
   - future client/contact accounts
2. `roles` and `user_roles`
   - RBAC for admin, operations, estimator, recruiter, viewer, etc.
3. `sessions`
   - short-lived access session tracking
   - refresh token family / revocation metadata
4. `auth_audit_events`
   - login, logout, failure, reset, privilege escalation, token refresh
5. `projects`
6. `team_members`
7. `messages` / `threads`
8. `contracts` / `bids`
9. `documents`
   - metadata records only; binary payloads live in Spaces
10. `activity_events`

## Storage object model recommendation
- bucket prefixing strategy:
  - `projects/`
  - `team/`
  - `contracts/`
  - `documents/`
  - `exports/`
  - `avatars/`
- keep binary files in Spaces, metadata + access control in Postgres
- avoid storing opaque file URLs directly without metadata indirection

## Open implementation sequence
1. provision managed Postgres
2. provision Spaces bucket + access keys
3. capture connection details in local secret env
4. add DB/storage config contract to app
5. implement Postgres schema for auth/users/sessions/core CRUD
6. migrate file-backed storage domains incrementally
7. integrate Spaces SDK/client for object workflows
8. harden auth before mobile production rollout

## Change log
### 2026-05-14
- Created initial living architecture + handoff document.
- Provisioned DigitalOcean Managed PostgreSQL cluster `sisg-platform-db` in `sfo3` with app database `sisg_platform` and app user `sisg_app`.
- Saved the managed Postgres CA cert locally as `.digitalocean-managed-postgres-ca.pem`.
- Provisioned DigitalOcean Spaces bucket `sisg-platform-assets-sfo3-20260514` in `sfo3`.
- Created a bucket-scoped read/write Spaces app key and removed the temporary bootstrap key.
- Wrote local gitignored managed-service secrets to `.env.infrastructure.local`.
- Added managed DB/Spaces placeholders to `.env.example`.
- Fixed the local API helper so `.env.local` no longer gets overridden by the fallback `ADMIN_PIN` during mobile/bootstrap auth testing.
- Fixed the mobile Expo launch scripts so they now source the same gitignored repo env files as the local API helper and automatically follow the configured local `PORT`; this removes the `3010` vs configured-port drift that was breaking mobile login when the API ran on a non-default port.
- Fixed real-device Expo auth bootstrap networking by stopping the helper scripts from forcing a `localhost` API URL, auto-resolving the host from the active Expo session inside the app, and allowing manual API base URL override from the mobile login screen when needed.
- Removed a stale app-local Expo env override that was still forcing `EXPO_PUBLIC_API_BASE_URL=http://localhost:3010` inside `apps/mobile/.env.local`, which bypassed the new host auto-resolution path on physical devices.

### 2026-05-18
- Replaced the in-memory admin bearer token map with persisted auth users + persisted sessions.
- Added Postgres-backed auth repository support with local file-backed fallback for development when DB env is absent.
- Added bootstrap admin seeding from `AUTH_BOOTSTRAP_EMAIL` + `AUTH_BOOTSTRAP_PASSWORD`.
- Added access-token verification, refresh-token rotation, and logout-backed session revocation flows to the API and shared mobile/web auth contracts.
