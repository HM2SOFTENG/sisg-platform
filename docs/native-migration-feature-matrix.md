# SISG Native Migration Feature Matrix

## Basis
This matrix is based on the current routed UI and server APIs in:
- `client/src/App.tsx`
- `client/src/pages/**`
- `server/routes/admin.ts`
- `server/routes/messages.ts`
- `server/routes/clawbot.ts`
- `server/routes/sisg-agents.ts`
- `server/routes/gateway.ts`
- `server/services/storage.ts`

The current platform is not a generic line-of-business app. It is a mixed system with:
- public marketing/site content
- a lightweight authenticated dashboard shell
- operator/admin CRUD over JSON-backed business data
- contract opportunity + proposal workflows
- internal messaging
- ClawBot operations and direct-command tooling
- SISG business-agent orchestration

## Actual current feature inventory

| Area | Current capability in code | Primary files | Notes for native migration |
|---|---|---|---|
| Public site | Home, Services, Certifications, Careers, Contact, Partners, Pricing | `client/src/pages/Home.tsx`, `Services.tsx`, `Certifications.tsx`, `Careers.tsx`, `Contact.tsx`, `Partners.tsx`, `Pricing.tsx` | Static/content-first; best as mobile marketing shell or deferred to web if app is operator-first |
| Public data feeds | Public projects and team endpoints | `server/routes/admin.ts` (`/api/public/projects`, `/api/public/team`) | Good mobile-safe read-only content source |
| Auth | Admin login, token verify/logout, protected dashboard routes | `client/src/pages/AdminLogin.tsx`, `client/src/components/ProtectedRoute.tsx`, `server/middleware/auth.ts` | Current single-admin/token shape is insufficient for production native rollout |
| Dashboard overview | KPI cards, revenue/pipeline charts, activity feed | `client/src/pages/Dashboard.tsx`, `server/routes/admin.ts` (`/api/admin/stats`, `/api/admin/activity`) | Strong candidate for native home screen, but needs cleaner API contracts |
| User profile/settings | Public user profile route, user settings page, user posts/likes APIs | `client/src/pages/UserProfile.tsx`, `UserSettings.tsx`, `server/routes/admin.ts` user/profile routes | Good early native profile surface; social-style posts are secondary |
| Team management | Team CRUD, directory-style management | `client/src/pages/admin/UserManagement.tsx`, `server/routes/admin.ts` team routes | Mobile works well for browse/edit, but bulk admin editing should be tablet-first |
| Project management | Project CRUD, KPIs, progress, budget, lead/deadline tracking | `client/src/pages/admin/ProjectManagement.tsx`, `server/routes/admin.ts` project routes | Strong operator-native candidate |
| Submissions triage | Submission CRUD for inbound forms/leads | `client/src/pages/admin/FormSubmissions.tsx`, `server/routes/admin.ts` submissions routes | Good mobile triage workflow with notifications |
| Contract pipeline | Contract CRUD with status/value tracking and Slack notifications | `client/src/pages/admin/ContractBidding.tsx`, `server/routes/admin.ts` contract routes | One of the best native workflow anchors |
| AI contract generation | Contract agreement template generation | `client/src/pages/admin/AIContractGen.tsx`, `server/routes/admin.ts` `/contracts/:id/generate` | Mobile should review/export generated output, not necessarily author dense contracts on phone |
| Opportunity intelligence | SAM opportunity storage/filtering, digest generation, proposal generation/export/workflow state | `client/src/pages/admin/ContractBidding.tsx`, `server/routes/sisg-agents.ts` | High-value operator workflow; large enough to split phone vs tablet experiences |
| Financials | Revenue/expense summaries and financial dashboard | `client/src/pages/admin/Financials.tsx`, `server/routes/admin.ts` financial endpoint | Read-only summaries fit mobile; deep finance controls should stay web/tablet first |
| Marketing | Marketing CRUD/dashboard | `client/src/pages/admin/MarketingDashboard.tsx`, `server/routes/admin.ts` marketing routes | Mostly admin/back-office; lower mobile urgency |
| Partnerships | Partnership CRUD | `client/src/pages/admin/PartnershipAdmin.tsx`, `server/routes/admin.ts` partnership routes | Good tablet/operator workflow, not MVP |
| Content management | Content CRUD | `client/src/pages/admin/ContentManagement.tsx`, `server/routes/admin.ts` content routes | Better as tablet/web-primary than phone-first |
| Reports | Reporting view | `client/src/pages/admin/Reports.tsx` | Likely summary-first on mobile, detailed reporting deferred |
| Messaging | Channels, DMs, polling-based chat, user picker | `client/src/pages/admin/Messaging.tsx`, `server/routes/messages.ts` | Excellent native fit; should become real-time push/chat UX |
| ClawBot center | Bot status, agent/task/command/log/metrics views, task creation/cancel/retry, connection test | `client/src/pages/admin/ClawBotCenter.tsx`, `server/routes/clawbot.ts` | High-value but high-risk privileged tooling; redesign required |
| SISG agents ops | Deploy/stop/run agents, scheduler status, dashboard summaries, run history, opportunities/digests/proposals | `client/src/pages/admin/SisgAgents.tsx`, `server/routes/sisg-agents.ts` | Strong tablet/operator feature set; deploy/stop actions need hardened controls |
| Gateway command portal | Execute/chat/agent-run/task/automation proxy to external gateway | `client/src/pages/admin/CommandPortal.tsx`, `server/routes/gateway.ts` | Do not copy directly to phone; treat as privileged command surface |
| Admin settings | Admin/system settings | `client/src/pages/admin/AdminSettings.tsx` | Web/tablet-primary unless broken into smaller mobile-safe settings |
| Placeholder tools | Tasks, calendar, time tracking, knowledge base placeholders | `client/src/pages/DashboardPlaceholders.tsx` | Not backed by meaningful product logic yet; do not prioritize for native parity |

## Phase grouping for native migration

### Phase 1 — MVP (phone-first operator core)
These are the best first mobile surfaces because they are high-frequency, summary-driven, and already map to mobile behavior.

| Capability | Why it belongs in MVP | Native shape |
|---|---|---|
| Auth/session shell | Required entry point | Secure sign-in, session restore, device-scoped auth |
| Dashboard overview | Central landing surface already exists | Mobile home with KPI cards, alerts, recent activity |
| Messaging | Strong mobile-native fit | Real-time chat, push notifications, unread state |
| Contract pipeline | High-value operational action loop | Opportunity inbox, bid tracker, status updates, reminders |
| Project management | Simple entity workflow already exists | Project list, detail, progress, deadlines, assignee actions |
| Submission triage | Great on-the-go workflow | New lead/submission notifications, assign/respond/archive |
| Team directory + lightweight profile/settings | Common access need | Search team, view profile, adjust account settings |
| Opportunity digest summaries | High leverage from existing agent output | Daily brief cards, bid recommendations, deadlines |

### Phase 2 — Operator workflows (phone + tablet adaptive)
These add actionability after the core shell is stable.

| Capability | Why phase 2 | Native shape |
|---|---|---|
| Proposal workflow state | Already modeled in `sisg-agents` proposal APIs | Step tracker, milestone/compliance checklist, export/share |
| SISG agent monitoring | Valuable for on-call/operator oversight | Agent health grid, run history, alerts, manual run |
| ClawBot task monitoring | Strong mobile monitor use case | Queue/running/failed task views, retry/cancel |
| Partnership admin | Useful but not first-day critical | Contact/account cards, notes, next actions |
| Marketing dashboard summaries | Better as summary than full authoring | Campaign snapshot + lead/conversion highlights |
| Reports summaries | Mobile executive/operator consumption | Saved reports, compact charts, anomaly alerts |
| Financial snapshots | Useful read-only visibility | Revenue, expense, pipeline, threshold alerts |

### Phase 3 — Power-admin / tablet-first
These should preserve capability, but not as direct phone ports.

| Capability | Why tablet-first/power-admin | Native shape |
|---|---|---|
| Team/user management full CRUD | Editing people records is manageable on tablet, noisy on phone | Split-pane roster/detail editor |
| Content management | Form-heavy and editorial | Tablet publishing workspace |
| Advanced project/contract editing | Dense forms and cross-linking | Tablet detail editors with staged save |
| AI contract generation review/edit | Long-form contract review is awkward on phone | Tablet review, comments, export |
| SISG agent deploy/stop/config | Privileged controls need stronger guardrails | Tablet ops console with approval gates |
| ClawBot command center | Dense operational console | Tablet supervision console, limited command execution |
| Admin settings | Sensitive and broad | Tablet-only or web-primary settings center |

### Phase 4 — Web-primary deferred
These should remain web-first until the product proves the need or the backend/security model matures.

| Capability | Why defer | Recommendation |
|---|---|---|
| Gateway command portal | Raw execute/chat/automation proxy is high risk and desktop-oriented | Keep web-primary; maybe mobile read-only status later |
| Full command execution surfaces | High privilege, low frequency, poor phone ergonomics | Replace with approved actions, not freeform command entry |
| Dense reporting/analytics exploration | Best with large tables/charts | Keep deep exploration on web; expose saved summaries in app |
| Marketing/content heavy editing | Limited mobile advantage | Remain web-first |
| Placeholder tasks/calendar/time/knowledge pages | Not yet real product capability | Do not include in parity scope |

## Flows that should be redesigned, not copied

| Current web flow | Why not copy literally | Native redesign recommendation |
|---|---|---|
| Dashboard as many cards/charts on one page | Too dense for phone, current API already over-fetches stats repeatedly | Role-aware mobile home with prioritized cards, alerts, and drill-downs |
| Contract bidding mega-screen | Current page combines pipeline, SAM scan, digest, proposals, workflow, exports in one surface | Break into tabs/stacks: Opportunities, Pipeline, Proposal Workspace, Alerts |
| ClawBot command center | Desktop control-room UX, drag panels, kanban, terminal, logs, live feed | Split into Monitor, Tasks, Alerts, and privileged Actions behind confirmations |
| Gateway command portal | Generic command proxy is unsafe and non-native | Replace with named workflows and approval-backed actions |
| SISG agents dashboard | Current all-in-one deploy/stop/run grid is okay for desktop but crowded on phone | Mobile summary with per-agent detail; deploy/stop only on tablet or elevated flow |
| CRUD forms for projects/contracts/team/content | Current modal forms are long and desktopish | Break into short stepped forms, sectioned editors, and quick actions |
| Messaging polling chat | Works, but not native quality | Use real-time transport + push notifications + offline cache |
| Proposal export / document workflow | Text-heavy export flow is not great on phone | Mobile review + share/export action sheet; full editing on tablet/web |

## Recommended first build order

1. **Foundation hardening before UI scale**
   - Replace current admin token model with real account/session/device auth.
   - Normalize JSON APIs into stable mobile DTOs.
   - Add role/permission enforcement around ClawBot, SISG agents, gateway, finance, and admin settings.
   - Start replacing JSON-file persistence with durable DB-backed domains.

2. **Ship the operator-native shell**
   - Login/session restore
   - Mobile dashboard
   - Messaging
   - Notifications/activity center

3. **Add the highest-value action loops**
   - Contract pipeline
   - Opportunity digest summaries
   - Project management
   - Submission triage

4. **Add guided proposal workflow**
   - Proposal brief viewer
   - Milestone/compliance checklist
   - Export/share
   - Deadline alerts

5. **Add monitored operations, not full command surfaces**
   - SISG agent health/run history
   - ClawBot task status/retry/cancel
   - Incident/alert acknowledgements

6. **Expand to tablet-first power tools**
   - Team management
   - Partnership/content/admin workflows
   - Deeper finance/reporting
   - Privileged ops controls with stronger approvals

## Recommended first release slice

If the goal is the best first native build, the first release should include:
- secure sign-in
- dashboard overview
- messaging
- contract pipeline
- opportunity digest/recommendations
- project list/detail/progress
- submission triage
- notifications
- profile/settings

That gives SISG a true mobile operating layer without dragging the riskiest desktop control surfaces into v1.

## Repo artifact added
- `docs/native-migration-feature-matrix.md`
