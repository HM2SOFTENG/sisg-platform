# SISG Native App Audit And Completion Plan

Date: 2026-05-20
Repo: `/Users/bclaw/Documents/sisg-platform`
Native app: `apps/mobile`
Comparison basis:
- `client/src/App.tsx`
- `client/src/pages/**`
- `apps/mobile/app/**`
- `apps/mobile/components/**`
- `apps/mobile/lib/**`
- existing migration docs in `docs/`

## Executive summary

The SISG native app is a credible **mobile foundation**, not yet a functionally complete mobile product.

What is already good:
- the repo is now structured correctly for native scale: monorepo, shared packages, Expo app, shared auth/types/api client
- native auth/session handling is already **better architected than the legacy web session shape**
- the app has a coherent command-center visual direction and a usable initial shell
- live API wiring already exists for:
  - sign-in / session restore / refresh
  - dashboard summary stats
  - contract list
  - project list
  - operator account registry in profile

What is not complete:
- major business/operator surfaces from the web app are still missing or only represented as partial operator shells
- some deeper native detail flows still depend on fallback/demo structures even though the main tabs are now live-backed
- the mobile app does not yet cover the full operator loop for submissions, ClawBot, reporting, finance, partnerships, content, or richer settings controls
- the visual system is promising but not yet premium enough: it has strong color and surface direction, but lacks motion, iconography depth, custom typography, real data visualization, and tactile interactions

Bottom line:
- **foundation maturity:** strong
- **functional parity with the real web app:** moderate foundation, partial workflow depth
- **premium product finish:** moderate visual direction, low experiential depth

## Current native status by area

### 1. Auth and session

Web state:
- admin login and protected dashboard access exist
- legacy web auth shape is workable but not ideal for a production-grade native rollout

Native state:
- sign-in exists
- persisted secure session restore exists
- verify + refresh token flow exists
- shared auth/session contracts are already wired through workspace packages

Verdict:
- **strong foundation**

Gaps:
- no full user-facing account lifecycle
- no richer role-aware onboarding or account switching
- no MFA or step-up auth flow for sensitive actions
- no device/session management UI

### 2. Dashboard / command home

Web state:
- dashboard includes KPIs, charts, pipeline mix, and activity feed

Native state:
- home tab is present and styled well
- dashboard summary counts are live
- priorities, queues, and signal feed are now composed from live admin activity, inbox, and agent data
- command-level inbox and agent visibility are now represented directly from current APIs
- no drill-down flow from home into operational queues yet
- no dedicated notifications center yet

Verdict:
- **strong partial**

Gap severity:
- high, because this is the first screen after login and should act as the operator command layer

### 3. Contracts / opportunities / proposals

Web state:
- this is one of the strongest and deepest web features
- includes:
  - contract pipeline
  - opportunity intelligence
  - SAM-related workflows
  - proposal briefs
  - digest views
  - export-oriented workflow

Native state:
- work tab loads live contract cards from `/api/admin/contracts`
- contract data is mapped into a clean mobile presentation model
- contract detail drill-down now derives from the live mobile record instead of falling back to static mock detail
- however:
  - create/edit actions are not implemented
  - detail richness is not API-backed
  - proposal workflows are absent
  - digest/recommendation workflows are absent
  - opportunity scanning/intelligence views are absent
  - supporting content is still heuristic because there is no dedicated contract detail endpoint yet

Verdict:
- **partial shell only**

Gap severity:
- critical, because contract operations are one of the core value centers of the SISG platform

### 4. Projects / delivery operations

Web state:
- project management is a real dashboard capability with delivery/admin depth

Native state:
- work tab loads live project cards from `/api/public/projects`
- projects are mapped into mobile status/health/progress cards
- project detail drill-down now derives from the live mobile record instead of falling back to static mock detail
- however:
  - project detail is not live-rich
  - no project CRUD
  - no staffing controls
  - no milestone editing
  - no delivery issue triage
  - no real PM/operator action loop

Verdict:
- **partial shell only**

Gap severity:
- high

### 5. Messaging / inbox

Web state:
- messaging exists as a real protected dashboard surface

Native state:
- inbox tab is now wired to live SISG messaging APIs
- thread list, thread history, direct-message compose, and reply flows all use the current authenticated session
- unread state and thread workflow metadata are still heuristic because the current API does not expose full read-state semantics

Verdict:
- **partial production workflow**

Gap severity:
- critical, because messaging is one of the most mobile-native operator loops in the product

### 6. SISG agents

Web state:
- real SISG agents dashboard exists

Native state:
- agents tab now loads live roster, scheduler status, recent runs, and derived incident visibility from current APIs
- the screen is intentionally read-only for now and does not expose risky remediation controls
- there is still no deep per-agent drill-in or approval-backed action path

Verdict:
- **partial production workflow**

Gap severity:
- high

### 7. ClawBot / command portal / privileged ops

Web state:
- real admin/operator tooling exists for ClawBot and command workflows

Native state:
- no native surface yet

Verdict:
- **missing**

Gap severity:
- high, but should not be copied 1:1 from desktop

### 8. Submissions / inbound lead triage

Web state:
- form submissions page exists

Native state:
- intake tab now loads live submissions from `/api/admin/submissions`
- mobile operators can filter/search contact submissions, review full message detail, and update status to reviewed/responded
- outbound response itself is still handed off to email/phone instead of a fully in-app CRM workflow

Verdict:
- **partial production workflow**

Gap severity:
- high, because this is an excellent mobile workflow

### 9. Team / user management

Web state:
- user and team management exist

Native state:
- only operator account registry indicators appear in profile
- no actual team directory or management workflow

Verdict:
- **missing**

Gap severity:
- medium to high

### 10. Financials / analytics / reports

Web state:
- separate finance, analytics, and reports surfaces exist

Native state:
- no dedicated finance tab, analytics tab, or reports view
- home screen count summaries are not a replacement

Verdict:
- **missing**

Gap severity:
- medium for phone-first, high for tablet completeness

### 11. Partnerships / marketing / content management

Web state:
- all exist as real admin surfaces

Native state:
- no equivalent routes yet

Verdict:
- **missing**

Gap severity:
- medium

### 12. Settings / profile / operator controls

Web state:
- admin settings and user settings exist

Native state:
- profile is one of the most real surfaces after auth, work, inbox, and agents
- it shows session trust, operator summary, admin account counts, and recent session activity from live data
- however:
  - it is not yet a true settings center
  - no editable preferences
  - no notification controls
  - no security controls UI
  - no profile editing

Verdict:
- **partial**

Gap severity:
- medium

### 13. Public marketing/site pages

Web state:
- Home, Services, Certifications, Careers, Contact, Partners, Pricing, public profile

Native state:
- operator-first app only
- no public/mobile marketing shell beyond sign-in

Verdict:
- **intentionally absent for now**

Recommendation:
- only bring these into native if SISG wants a dual-purpose public + operator app
- otherwise keep the app operator-first and let web own public marketing

## Native parity scorecard

This is the practical parity picture today.

### Live and materially real
- auth and session lifecycle
- dashboard summary fetch
- contract list fetch
- project list fetch
- operator accounts fetch inside profile

### Real shell, but not functionally complete
- home
- work
- profile

### Mostly mock/demo or presentation-first
- agents
- inbox
- contract/project deep detail treatment
- much of the home command storytelling

### Missing entirely
- submissions triage
- ClawBot
- command portal
- finance
- analytics
- reports
- partnerships
- marketing
- content management
- team management
- user settings and editable preferences
- notifications center

## Comparison to the web app

## Areas where native is already better positioned

- **session handling** is cleaner and more future-proof than the legacy web token pattern
- **domain separation** is better because native already leans on shared packages
- **mobile-first information architecture** is more promising than the dense all-in-one web dashboard pattern

## Areas where web is still far ahead

- breadth of business capability
- operational depth
- admin CRUD coverage
- charting and analytics
- proposal and opportunity workflows
- messaging completeness
- privileged operations tooling

## Areas where the web app should not be copied literally

- giant card-dense dashboards
- mega-screens that combine several workflows in one page
- desktop command consoles
- long dense CRUD forms
- raw admin settings breadth on a phone

The native app should target **functional completeness**, not literal screen parity.

## Premium look and feel audit

## What is working now

- strong dark command-center palette
- coherent surfaces, radii, and spacing
- consistent visual language across tabs
- background glows and frame treatment create a recognizable SISG mobile identity
- the app already feels like an intentional product, not a webview

## What is currently limiting the premium feel

### 1. Typography is too generic
- there is no custom font system in use
- hierarchy is mostly size/weight based
- the visual voice is not yet distinctive enough for a premium flagship operator app

### 2. Motion is mostly absent
- reanimated is installed, but the app is effectively static
- no entrance choreography
- no tactile transitions between states
- no shared element or stack transition personality
- no card press micro-motion beyond default press opacity

### 3. Iconography is underpowered
- tab icons are text glyphs like `HM`, `WK`, `IN`, `AG`, `ME`
- this reads like a scaffold, not a finished premium system
- there is no strong icon language or symbol hierarchy yet

### 4. Data visualization is too thin
- the web dashboard uses charts and richer signal density
- native mostly uses text cards and metrics
- for an operator app, premium feel requires good visual signal compression:
  - trend bars
  - ring or sparkline indicators
  - deadline/risk visual states
  - queue pressure visuals

### 5. The shell is premium-adjacent, not premium-complete
- the current screens lean heavily on descriptive text blocks
- they do not yet feel tactile enough
- they do not yet use enough:
  - segmented flows
  - contextual actions
  - haptics
  - pull-to-refresh
  - swipe affordances
  - layered depth changes
  - bold detail layouts

### 6. Too much “beautiful placeholder”, not enough “beautiful command”
- several screens look conceptually good
- but because the actions are missing or mocked, the product still feels like a showcase instead of a battle-ready ops tool

## Premium design direction for completion

The correct target is:
- **luxury operations**
- not consumer-social
- not generic SaaS
- not military cliché

Desired characteristics:
- sharp, restrained, expensive
- high-contrast but not neon-chaotic
- cinematic depth without gimmickry
- compact information density with clear action priority
- stronger use of:
  - custom typography pair
  - real icon set
  - motion hierarchy
  - signal color semantics
  - status visualization
  - tablet-aware split panes

## Recommended product boundary for parity

To make native “as complete as possible,” parity should be defined this way:

### Phone-first parity
- secure auth
- command home
- contracts pipeline
- project delivery
- submissions triage
- messaging
- agent monitoring
- alerts / notifications
- profile / settings

### Tablet-first parity
- team management
- finance summaries + drill-ins
- reports
- partnerships
- content management basics
- settings center
- proposal review/export workflows
- richer project and contract editing

### Web-primary but visible from native
- raw command portal
- deepest ClawBot controls
- highly privileged freeform execution
- the densest analytics exploration

Native should still expose status, approvals, and monitored actions for those areas, even if the deepest authoring stays tablet/web-first.

## Recommended information architecture for the finished native app

Current tabs:
- Home
- Work
- Inbox
- Agents
- Profile

Recommended finished tab model:
- Home
- Work
- Inbox
- Ops
- Profile

Where:

### Home
- daily command brief
- priorities
- queue pressure
- risk and deadline cards
- recent activity
- notifications center entry

### Work
- Contracts
- Projects
- Submissions
- Finance summaries

### Inbox
- operator/client conversations
- agent alerts
- action requests
- message detail + compose

### Ops
- SISG agents
- ClawBot status
- incident queue
- approved operational actions
- command history / run status

### Profile
- operator identity
- preferences
- notification controls
- security/session controls
- admin account management when allowed

## Comprehensive completion plan

## Phase 0: Lock product scope and operating model

Goal:
- prevent waste from trying to make mobile a literal clone of every web page

Deliverables:
- define phone-first vs tablet-first vs web-primary surfaces
- define privileged-action rules for mobile
- define role matrix for admin, operator, manager, analyst, viewer
- define parity acceptance criteria by workflow, not by route count

Success criteria:
- every current web capability is classified into one of:
  - native phone
  - native tablet
  - native monitored only
  - web primary

## Phase 1: Foundation hardening before more UI

Goal:
- make the mobile stack safe and scalable enough to support real operator usage

Work:
- expand shared API client beyond auth/dashboard/accounts
- add mobile DTOs and schemas for:
  - contracts
  - projects
  - submissions
  - messages
  - agents
  - finance summaries
  - notifications
- adopt TanStack Query for:
  - caching
  - stale data handling
  - retries
  - background refresh
  - pull-to-refresh integration
- add stronger permission map delivery from the server
- add audit event support for sensitive native actions
- begin replacing remaining JSON-backed fragile domains with managed DB-backed flows where needed

Success criteria:
- every phase-2 screen consumes stable typed APIs instead of local demo data

## Phase 2: Replace demo shells with real operator loops

Goal:
- convert the current good-looking shells into production workflows

Work:

### Home
- replace demo priorities, queues, and activity with real aggregated feeds
- add drill-in actions from each card
- add notifications center entry
- add refresh controls and empty/error states with proper visual treatment

### Inbox
- wire real thread list
- wire message detail
- add send composer
- add optimistic send state
- add unread/mention/assignment semantics

### Agents
- wire live SISG agents dashboard
- add roster detail
- add incident drill-in
- add safe, permissioned quick actions

### Work
- replace remaining mock detail dependencies for contracts/projects
- add real detail screens
- add sort/filter/search
- add action sheets for status updates and next-step handling

Success criteria:
- no default demo data in primary tabs when authenticated against a real environment

## Phase 3: Add the missing highest-value business workflows

Goal:
- cover the core daily operator loops that actually justify the app

Work:
- submissions triage surface
- contract opportunity digest surface
- proposal brief viewer
- project milestone and staffing actions
- notifications center
- finance summary cards with drill-down

Success criteria:
- an operator can run a real daily mobile work session without falling back to web for the most common actions

## Phase 4: Add power-operator and admin depth

Goal:
- move from “good mobile shell” to “real native operating layer”

Work:
- team directory and management
- partnership workflow
- content management basics
- reports summary and saved views
- admin settings center
- account and session security controls

Success criteria:
- native supports a meaningful subset of admin operations beyond passive monitoring

## Phase 5: Add monitored privileged operations

Goal:
- preserve high-value operational awareness without copying unsafe desktop control patterns

Work:
- ClawBot monitor
- incident acknowledgement
- retry/cancel approved workflows
- command history
- agent run history
- gated elevated actions with confirmation and audit trail

Success criteria:
- mobile can supervise critical automation safely, even if the deepest freeform control stays desktop-first

## Phase 6: Premium finish pass

Goal:
- elevate the app from capable to flagship

Work:

### Visual system
- add a custom font pair
- replace text-glyph tab icons with a real icon system
- refine color semantics for risk, urgency, success, and automation states

### Motion
- screen entrance choreography
- card/row micro-motion
- tab transition personality
- list insert/remove animations
- richer loading and refresh states

### Interaction quality
- haptics for important actions
- swipe gestures where appropriate
- pull-to-refresh everywhere it matters
- adaptive layouts for tablet split views

### Data presentation
- compact charts
- sparklines
- status rings
- queue pressure indicators
- richer detail cards for contracts, projects, agents, and finance

Success criteria:
- the app feels expensive, fast, and operationally serious in the hand

## Recommended implementation order

1. Replace demo data in Home, Inbox, and Agents
2. Deepen Work so contracts and projects are live end-to-end enough to matter
3. Add Submissions and Notifications
4. Add Proposal/Opportunity read workflows
5. Add Finance summaries, Team, and Settings
6. Add monitored ClawBot/ops controls
7. Run the full premium finish pass after the primary workflows are real

## What “done” should mean

The native app should be considered functionally mature when:
- all primary operator tabs are backed by live APIs
- no critical authenticated surface depends on demo data
- the top daily workflows can be completed on phone
- tablet covers the denser management/admin tasks
- the app has a clearly premium, native, tactile visual identity
- the web app is still useful for dense back-office work, but not required for routine operator execution

## Immediate next build recommendation

If execution starts now, the next work should be:

1. wire **Inbox** to real data and add send/reply
2. wire **Agents** to real data and add safe action pathways
3. replace **Home** demo queues/feed with real aggregated data
4. remove mock dependencies from **Contracts/Projects** detail flows
5. add **Submissions** as the next major native business surface

That sequence gives the biggest functional jump while also making the app feel materially more real.
