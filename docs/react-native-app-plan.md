# SISG Native App Plan

## Goal
Build a production-grade React Native app for SISG that preserves the current platform’s useful functionality while upgrading usability, performance, security, and mobile-native experience.

## Product standard
The mobile app should be:
- robust under poor network conditions
- reactive and real-time where it matters
- responsive across phone and tablet layouts
- secure by default
- native-feeling, not a shrunken web dashboard
- maintainable as a long-term product line, not a one-off wrapper

## Current platform surface area
### Public app/web surfaces
- Home
- Services
- Projects
- Team
- Certifications
- Careers
- Contact
- Pricing
- Partners
- Analytics
- Finance

### Authenticated/user surfaces
- Admin login
- Dashboard
- User profile
- User settings

### Admin/operations surfaces
- Project management
- User management / team
- Financials
- Contract monitoring
- Contract bidding
- AI contract generation
- Form submissions
- Marketing dashboard
- Partnership admin
- Content management
- Reports
- SISG agents dashboard
- ClawBot command center
- Command portal
- Messaging
- Admin settings

### Backend capabilities already present
- admin auth endpoints
- stats / financials / CRUD endpoints
- messaging endpoints
- gateway proxy endpoints
- SISG agents endpoints
- ClawBot task/command/log/connection endpoints

## Recommendation
Do **not** try to port the current web UI screen-for-screen as-is.

Instead:
1. keep the same business capabilities
2. redesign the interaction model for mobile
3. separate mobile architecture from web presentation
4. harden auth and API contracts before scaling usage

## Recommended stack
### Mobile app
- **Expo + React Native + TypeScript**
- **Expo Router** for navigation
- **TanStack Query** for data fetching, caching, retries, offline revalidation
- **Zustand** for local app state
- **React Hook Form + Zod** for forms and validation
- **NativeWind or Tamagui** for design system speed, with a strict token layer
- **react-native-reanimated + gesture-handler** for polished interactions
- **expo-secure-store** for secure token storage
- **expo-notifications** for push notifications
- **react-native-mmkv** or persisted local cache for fast offline state
- **WebSocket/SSE abstraction** for ClawBot / agent activity streams

### Shared code strategy
Restructure into a monorepo:
- `apps/web`
- `apps/mobile`
- `apps/api` or existing server
- `packages/ui-tokens`
- `packages/types`
- `packages/api-client`
- `packages/schemas`
- `packages/utils`

This lets web and mobile share:
- API types
- validation schemas
- domain models
- formatting utilities
- permission logic

## Critical architecture decision
### Recommended app model: role-aware mobile product
The app should not expose every admin panel equally on mobile.

Split into three experience layers:

#### 1. Public / lightweight client layer
- company info
- services
- team
- projects
- contact
- lead capture

#### 2. Authenticated operator layer
- dashboard summary
- tasks / activity feed
- contract opportunities
- proposal workflow status
- messaging
- approvals / notifications
- user profile / settings

#### 3. Power-admin layer
- deeper management tools
- agent operations
- ClawBot command center
- reports
- content management
- financial controls

Some power-admin flows may remain better on tablet or web first. That is fine. “Keep all functionality” does not require identical mobile UX for every dense desktop workflow on day one, but it does require preserving actionability.

## Security changes required before serious mobile rollout
The current local/web auth shape is not sufficient for a high-security native app.

### Replace or augment current auth with
- real user accounts
- short-lived access tokens
- refresh token rotation
- server-side session invalidation
- role-based access control
- device-aware session metadata
- audit logging for privileged actions
- optional MFA for admin/operator roles

### Required security controls
- secure token storage in keychain/keystore
- certificate pinning for sensitive builds if threat model justifies it
- strict API authorization by role and action
- rate limiting per account + device + IP
- server-generated permission map
- input validation with shared schemas
- encrypted transport only
- no secrets embedded in app bundle
- remote logout / token revocation
- mobile error redaction and safe logging

### High-risk areas needing explicit hardening
- ClawBot command execution
- gateway proxy actions
- admin settings/config endpoints
- financial and contract operations
- messaging / internal communications
- agent deploy/stop/run operations

## Mobile UX principles
### What should feel native
- bottom-tab navigation for major surfaces
- stacked drill-in flows for details
- swipe actions for triage / approvals / messaging
- push notifications for agent events, new leads, approvals, urgent contract deadlines
- optimistic UI where safe
- offline-first reads for dashboards and profiles
- skeleton states, pull-to-refresh, background refresh
- tablet adaptive split-pane layouts for operational screens

### What should not be copied literally from web
- oversized dense dashboards with too many cards
- giant data tables as the primary UI
- terminal-style control surfaces without mobile-specific interaction design
- modal-heavy workflows with nested forms

## Feature mapping from current platform to native
### Phase 1 must-have native surfaces
- auth
- dashboard overview
- projects
- team
- contact / lead form
- messaging
- profile/settings
- notifications center
- contract opportunity feed
- proposal detail / status
- lightweight agent run monitoring

### Phase 2 operational power features
- project management CRUD
- team/user management
- form submissions triage
- partnership management
- content management basics
- contract pipeline actions
- report summaries
- ClawBot status + task actions

### Phase 3 advanced/admin heavy flows
- AI contract generation end-to-end
- deep ClawBot command center
- gateway command portal
- advanced financial operations
- full admin settings suite
- complete agent deployment control

## API work needed
Before building too much UI, normalize the backend.

### Create a mobile-ready API contract
- consistent JSON envelope format
- stable error codes
- typed pagination
- filter/sort conventions
- cursor or page-based pagination
- dedicated `/mobile/*` namespace only if necessary
- explicit DTOs for mobile instead of reusing raw storage shapes everywhere

### Recommended backend improvements
- extract domain services from route files
- move from file-backed JSON storage toward a real database
- add typed schemas for requests/responses
- centralize auth middleware and permission checks
- add event stream abstraction for real-time updates
- add background-job state models for agents/tasks

## Data/storage recommendation
The current JSON-file storage is useful for local iteration but not good enough for a serious secure mobile app.

Recommended path:
- PostgreSQL for primary app data
- Redis for queue/cache/realtime fanout if needed
- object storage for exports/docs
- formal tables for users, sessions, messages, projects, contracts, proposals, agent runs, notifications, audit logs

## Real-time strategy
Use real-time where it creates leverage:
- messaging
- ClawBot status
- agent runs
- proposal status changes
- urgent opportunity alerts

Recommended approach:
- WebSocket gateway for authenticated real-time feeds
- push notifications for background/off-app alerts
- TanStack Query cache invalidation from events

## Delivery plan
### Phase 0 — foundation hardening
- monorepo restructure
- shared schemas/types/api client
- auth redesign
- backend cleanup for mobile contracts
- database migration plan
- analytics/telemetry/error tracking setup

### Phase 1 — native MVP
- Expo app bootstrap
- design system + navigation
- login/session flow
- dashboard
- projects
- team
- contact
- messaging
- profile/settings
- notifications
- contract opportunity feed

### Phase 2 — operator workflows
- proposal tracking
- contract actions
- project management
- submission triage
- basic agent monitoring
- offline caching improvements
- tablet responsive layouts

### Phase 3 — advanced operational control
- ClawBot operational controls
- agent orchestration
- admin management
- advanced reports
- high-trust privileged flows with stronger guardrails

## Recommended immediate implementation steps
1. create monorepo structure for `web`, `mobile`, and shared packages
2. define canonical domain schemas with Zod
3. replace weak auth patterns with a real token/session model
4. stand up a clean mobile API client package
5. bootstrap Expo app with routing, auth shell, theme, and query layer
6. ship the first 5 mobile-native screens:
   - login
   - dashboard
   - projects
   - team
   - messaging
7. then layer in contract/proposal workflows

## Non-negotiables
- no WebView shell pretending to be a native app
- no direct reuse of desktop admin density on phone screens
- no long-term dependence on file JSON storage for secure production mobile use
- no privileged command actions without role checks and audit logs

## Success criteria
The native app is successful when:
- users can perform the most important SISG actions faster on mobile than on the web
- operators can monitor and act on critical workflows on the go
- admin actions are secure, auditable, and permissioned
- app performance is smooth on real devices
- the architecture supports long-term expansion without rework

## Strong recommendation
Build this as a **mobile-first operating layer** for SISG, not just a mobile mirror of the current site.
That will give you a much better product and a safer system.
