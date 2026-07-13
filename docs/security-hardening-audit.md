# SISG backend + auth hardening audit

## Scope reviewed
- `server/middleware/auth.ts`
- `server/index.ts`
- `server/routes/*.ts`
- `server/services/storage.ts`
- admin auth usage in `client/src/**`
- mobile/security notes in `docs/react-native-app-plan.md`

## Current state summary
The current platform uses a **single shared admin PIN** that issues **opaque in-memory bearer tokens**. Those tokens gate nearly all privileged admin, gateway, agent, messaging, and ClawBot control routes. This is workable for local demos, but it is not sufficient for a serious production mobile app or a high-trust admin backend.

## Key findings

### Critical
1. **Shared admin credential model**
   - One `ADMIN_PIN` authenticates every operator.
   - No per-user identity, no attribution, no password hashing, no MFA, no device binding.
   - Impact: no individual accountability, no safe offboarding, no role separation.

2. **In-memory token/session store**
   - Admin tokens are stored only in process memory.
   - Restart invalidates all sessions; multi-instance deployments cannot share session state.
   - No revocation metadata, session inventory, or refresh lifecycle.

3. **Client stores bearer token in `localStorage`**
   - `sisg_admin_token` is accessible to XSS.
   - For a React Native app, this model is not acceptable; secure storage and refresh rotation are needed.

4. **Hardcoded fallback secrets for ClawBot surfaces**
   - Several routes accept `process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026"`.
   - If env config is missing, a predictable shared secret protects privileged machine-to-machine actions.

5. **Privileged command surfaces are broad and under-authorized**
   - Gateway execute/chat/agent-run, ClawBot commands, deploy/stop/run agent routes all sit behind the same admin gate.
   - No RBAC or action-level authorization.

### High
6. **No durable audit logging for privileged actions**
   - CRUD, command, and agent operations are not consistently audit logged.
   - Existing Slack notifications are not a substitute for immutable audit trails.

7. **No request validation on most admin routes**
   - Most POST/PUT bodies are accepted directly and persisted to JSON storage.
   - Raises integrity, malformed input, and future injection risks.

8. **JSON file persistence for sensitive operational data**
   - `data/*.json` stores operational records without transactional integrity, locking, schema controls, or access partitioning.
   - Not fit for secure multi-user mobile backends.

9. **Rate limiting only on login**
   - No generalized rate limiting for public form endpoints, auth verification, privileged APIs, or API-key service endpoints.

10. **CORS and security headers are minimal**
   - No CSP, HSTS, frame protections, no-sniff, referrer policy, or hardened proxy trust strategy.

### Medium
11. **Admin settings UI calls backend routes that do not appear implemented**
   - `/api/admin/password`, `/api/admin/config`, `/api/admin/webhooks/:name/test`, `/api/admin/data/clear`
   - This is not directly exploitable, but it signals drift between security-sensitive UI and backend behavior.

12. **Public user profile endpoints are mounted under `/api/admin/...`**
   - `/api/admin/users/:id` and `/api/admin/users/:id/posts` GET are unauthenticated.
   - Naming is misleading and easy to overexpose over time.

13. **No centralized permission model**
   - The route layer mixes public, admin, and API-key auth patterns without a common authorization map.

## Safe groundwork implemented in this audit

### 1. Added durable security audit logging helper
File: `server/services/security-audit.ts`
- Adds a lightweight audit log service backed by existing storage.
- Redacts obvious secret-bearing fields (`password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`).
- Keeps the most recent 2000 security events.

### 2. Added explicit hardening backlog and sequencing doc
This document is intended to unblock secure mobile/backend planning without risking current auth behavior.

## Prioritized remediation backlog

### Phase 0 — immediate guardrails (1-3 days)
1. **Remove fallback secrets** — Critical
   - Require `CLAWBOT_API_KEY` in non-local environments.
   - Fail fast on boot if missing in production.
2. **Add audit logging to all privileged routes** — Critical
   - Log login attempts, logout, gateway execute/chat, ClawBot commands, agent deploy/stop/run, destructive CRUD.
3. **Add baseline security headers** — High
   - CSP, HSTS, X-Frame-Options or frame-ancestors, X-Content-Type-Options, Referrer-Policy.
4. **Add generalized rate limiting** — High
   - Public forms, admin login/verify, gateway execute/chat, ClawBot API-key endpoints.
5. **Introduce request validation with Zod** — High
   - Start with auth, gateway, command, messaging, and destructive admin writes.

### Phase 1 — auth redesign groundwork (3-7 days)
6. **Replace shared PIN with real user accounts** — Critical
   - User table, hashed passwords or SSO, operator identities.
7. **Adopt short-lived access + refresh token rotation** — Critical
   - Store refresh sessions server-side, support revocation and device metadata.
8. **Move web storage to httpOnly cookies or secure session strategy** — High
   - For mobile, use secure keystore/keychain-backed storage.
9. **Add RBAC/permission matrix** — Critical
   - Roles like `super_admin`, `operator`, `finance`, `content`, `observer`.
10. **Add MFA for privileged roles** — High

### Phase 2 — backend trust model hardening (1-2 weeks)
11. **Migrate JSON storage to PostgreSQL** — Critical
12. **Add durable audit log table and admin activity viewer** — High
13. **Introduce service-to-service auth separation** — High
   - Separate ClawBot/gateway credentials from human admin auth.
14. **Add session management and remote logout** — High
15. **Create a normalized mobile-safe API contract** — High

### Phase 3 — mobile production hardening
16. **Device-aware sessions + secure mobile token storage** — Critical
17. **Push-safe notification/auth flows** — Medium
18. **Certificate pinning for high-trust distributions if justified** — Medium
19. **Sensitive action approval flows for command execution** — High
20. **Operational anomaly detection and alerting** — Medium

## Recommended sequencing for a serious React Native rollout
1. Remove fallback secrets and add audit logging.
2. Add validation + rate limiting + security headers.
3. Redesign auth/session model with RBAC.
4. Migrate persistence to PostgreSQL.
5. Then build mobile auth and operator workflows on top of the hardened API.

## Notes for the main app team
- Avoid shipping a native app on top of the current shared-PIN + `localStorage` model.
- Treat gateway execute and ClawBot command surfaces as high-risk admin operations requiring both RBAC and audit trails.
- Keep current behavior stable for now; prioritize additive controls before disruptive auth replacement.
