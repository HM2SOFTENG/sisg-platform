# SISG Platform Remediation Backlog

Date: 2026-07-13
Source: platform audit across public site, admin dashboard, local runtime, and production deployment

## P1 Fix Now

### Public funnel

- Fix the public contact form so it submits to `/api/contact`, handles validation and server failures, and only shows success after a real backend acknowledgement.
- Seed and verify production public content for `/api/public/projects` and `/api/public/team` so the live site does not render empty data feeds.

### Admin platform integrity

- Restore the missing admin API contract for routed UI features, especially `/api/admin/financials`.
- Repair local admin authentication/bootstrap behavior so the configured bootstrap credentials actually allow dashboard access in local development.
- Resolve missing settings endpoints referenced by the UI: `/api/admin/password`, `/api/admin/config`, and `/api/admin/data/clear`.

## P2 Next Wave

- Implement or explicitly de-scope missing contract bidding actions such as `/api/admin/agents/contracts/run`.
- Replace placeholder dashboard modules with either shipped functionality or hidden/navigation-removed states.
- Add regression coverage for critical public/admin flows:
  - public contact submission
  - public projects/team feeds
  - admin login
  - dashboard API contracts

## P3 Hardening

- Reduce the oversized main frontend bundle through route splitting and deferred loading on non-critical admin pages.

## Active Owners

- `worker-public-funnel`: public contact flow plus production public-data seeding path
- `worker-admin-contracts`: admin financial/settings API contract repair
- `worker-auth-dashboard`: auth bootstrap and local dashboard access repair
- `main`: cross-cutting triage, contract-bidding de-scope/implementation, placeholders, tests, and integration
