# apps/web

Target location for the existing Vite web client if/when the repo is formally migrated into a full monorepo.

## Suggested migration
- move `client/` into `apps/web/client/`
- move `server/` into `apps/api/` or keep server at repo root until backend split is ready
- update Vite root/alias configuration after the move
- keep this placeholder until that migration is intentionally scheduled
