# SISG mobile foundation and monorepo plan

## Current state
- Existing app is a single-package Vite + React + Express repo rooted around `client/`, `server/`, and `shared/`.
- TypeScript aliases already support `@/*` for web UI and `@shared/*` for shared constants.
- No existing workspace manifest or shared packages structure is present.
- The current build assumes the web app stays in place, so a full move to `apps/web` right now would be disruptive.

## Recommended target state
Use an **incremental pnpm workspace**:

```text
apps/
  web/                 # eventual home for the current web app
  mobile/              # Expo / React Native app
packages/
  types/               # shared domain DTOs and TypeScript contracts
  schemas/             # Zod schemas for requests/responses/forms
  api-client/          # fetch/query client wrappers shared by web + mobile
  ui-tokens/           # cross-platform design tokens
  utils/               # framework-agnostic helpers
client/                # keep in place until planned migration into apps/web
server/                # keep in place for now
shared/                # legacy shared web/server code; gradually move into packages/
```

## Why this shape
1. **Lowest risk now**: keeps the working web build rooted at `client/` and `server/`.
2. **Best long-term fit**: introduces the package seams mobile will need without forcing a flag day migration.
3. **Cross-platform discipline**: shared packages create a clean boundary between domain logic and UI implementation.
4. **Expo-friendly**: `apps/mobile` can evolve independently with Expo Router, mobile auth bootstrap, notifications, and offline support.

## Package responsibilities
### `apps/web`
Future home of the existing React/Vite app. During migration, preserve current aliases and move feature-by-feature.

### `apps/mobile`
Expo Router app with navigation groups for:
- public surfaces
- authenticated operator surfaces
- privileged admin surfaces

### `packages/types`
Owns pure TS contracts such as:
- auth/session types
- dashboard summaries
- project/message/contract DTOs
- role and permission enums

### `packages/schemas`
Owns Zod schemas for:
- auth payloads
- API responses
- form validation
- server request/response normalization

### `packages/api-client`
Owns:
- base fetch client
- typed endpoint helpers
- auth token injection hooks
- envelope parsing / error normalization

### `packages/ui-tokens`
Owns cross-platform design primitives:
- colors
- spacing
- radii
- typography scales
- motion durations

### `packages/utils`
Owns framework-agnostic utilities:
- formatting
- permission helpers
- date/math/string utilities
- mobile/web-safe shared logic

## Migration path
1. Keep current web build untouched.
2. Start new shared work only in `packages/*`.
3. Add mobile app in `apps/mobile`.
4. Gradually replace `shared/` and ad hoc client types with package imports.
5. Move web into `apps/web` only after build/test scripts are updated together.

## Immediate next implementation steps
1. Add Expo app config and install workspace dependencies.
2. Add a root `.npmrc` / workspace policy if needed for Expo hoisting behavior.
3. Extract the first real domain module into `packages/types` + `packages/schemas`.
4. Introduce a shared API envelope and error model on the Express side.
5. Add TanStack Query and auth/session bootstrap to mobile.
6. Define role-aware route groups and initial screens: login, dashboard, projects, team, messaging.
