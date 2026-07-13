# @sisg/mobile

Initial Expo Router scaffold for the SISG mobile bootstrap shell.

## Local run

Recommended iOS Simulator path from the repo root:

```bash
./scripts/run-mobile-ios-dev.sh
```

That single command:
- starts the local SISG API if it is not already healthy
- waits for `/api/health`
- opens iOS Simulator
- forces the Expo app to use `http://localhost:<PORT>`, which is the most reliable simulator path

If you want the split/manual flow instead:

```bash
./scripts/run-local-api.sh
./scripts/run-mobile-ios.sh
```

If you want the plain Expo dev server without auto-opening iOS Simulator:

```bash
./scripts/run-mobile-expo.sh
```

## Mobile API base URL notes

- The mobile launcher scripts now read the repo's gitignored `.env.local` first, so they follow the same `PORT` value as `./scripts/run-local-api.sh`.
- The local API helper now defaults to `DB_PROVIDER=file`, so simulator login does not depend on access to the private managed Postgres network.
- The recommended iOS Simulator launcher pins `EXPO_PUBLIC_API_BASE_URL` to `http://localhost:<PORT>` on purpose for a stable loopback path.
- By default, the Expo app auto-resolves the dev host from the current Expo session and combines it with `EXPO_PUBLIC_API_PORT`.
- iOS Simulator still falls back to `http://localhost:<PORT>` when no Expo host is available.
- Android Emulator falls back to `http://10.0.2.2:<PORT>`.
- Physical device should usually connect without manual edits now; if auto-resolution fails, enter your Mac's LAN IP in the login screen or set `EXPO_PUBLIC_API_BASE_URL` explicitly.
- Avoid setting `apps/mobile/.env.local` to `EXPO_PUBLIC_API_BASE_URL=http://localhost:...` for phone testing, because that forces loopback and bypasses host auto-resolution.

## Current state

- shared auth/session/dashboard contracts are wired through workspace packages
- sign-in, session restore, verify, refresh, and logout run through the current auth APIs
- the home tab now pulls live dashboard, inbox, activity, and agent-monitor data
- the work tab now pulls live contracts and projects with loading, empty, retry, and live-derived detail drill-down states
- the inbox tab is wired to live messaging threads, thread history, replies, and new direct messages
- the intake tab is wired to live contact-form submissions with mobile search, filtering, and status updates
- the agents tab now reads live SISG agent telemetry and run history in a read-only mobile monitor
- the profile tab now reflects live operator session and account-registry data
- bootstrap session state persists across app restarts using secure device storage
- full managed-user lifecycle, richer privileged actions, and deeper detail workflows are still pending
