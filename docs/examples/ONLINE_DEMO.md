# Architecture showcase and reference sandbox

**[Explore the public architecture](https://agent-operations-demo.agentops-portfolio.workers.dev)**

## Continuity and benefits

The [platform positioning](../architecture/AGENT_OPERATIONS_PLATFORM.md) describes
operational controls behind agents. The initial public demo led with a Jobs
scenario, obscuring the broader responsibilities of reasoning, authority and
durable state. This package moves the architecture to the homepage and retains
the working Jobs scenario as an optional reference application.

Visitors can select components, follow an illustrated operation and inspect the
corresponding source and tests before entering a business example. This supports
an immediate architecture review and gives future domain examples a common
explanation of platform boundaries. New domains still require their own contracts
and acceptance; this presentation change adds no production capabilities.

The publication gate is showcase navigation and responsive browser acceptance,
the existing reference workflow checks, a public-data scan and repository CI.
The original production system, provider access and scheduled operations remain
outside this deployment. Existing service evidence is retained.

## Portfolio entry and narrative

The README follows the portfolio entry pattern used by the related GLAP, AgentGov
and NYC projects: a concise positioning statement, CI/showcase badges, an original
architecture cover, three reading paths and an explicit implementation status.
The cover is a repository-owned SVG with no embedded scripts or external assets.

The opening question, "Who remembers what was approved and what actually changed?",
connects the architecture to continuity across AI conversations. Visitors can
explore the system, follow one illustrated operation or inspect implementation
evidence before entering a reference application. This makes the project's role
easier to compare in a portfolio without changing domain or authority contracts.
The acceptance gate is cover rendering, link validation, responsive navigation,
public-data checks and the existing CI. The cover is a conceptual illustration,
not a screenshot of deployed production infrastructure.

## Two levels of exploration

- `/`: an architecture overview with seven selectable responsibilities, source
  and verification links, and a five-stage illustrated data flow. Playback is
  explicitly an illustration and makes no model calls or live state changes.
  The homepage starts no anonymous session and makes no API request.
- `/reference/jobs`: the optional live, synthetic Jobs workflow. Approval,
  retry, concurrency tests and the audit trace are grouped under expandable
  engineering details. A link returns visitors to the platform architecture.
- Platform Watch links to its actual Web report-and-decision contract. It is
  presented as implemented report storage and controlled decisions, with an
  autonomous research runner outside that scope.

The architecture diagram groups responsibilities rather than claiming a new
runtime topology. Trust Kernel remains a logical collection of controls across
identity, services, domain and persistence. Jobs exposes MCP and Web; Watch does
not claim an identical MCP surface. Providers retain their native records.

## What actually runs

The `demo/` project is a separate Cloudflare Worker. Visitors entering the Jobs reference get a
random session cookie and a SQLite-backed Durable Object. API calls execute on
the server and persist synthetic state; page reloads read that state back.

The demo imports `isAllowedTransition` and `derivedTaskForTransition` directly
from `src/domain/job-application-lifecycle.ts`. It uses its own bounded adapter
for evidence, proposals, approval, receipts and storage. It does **not** run the
Node `WorkspaceService`, its full database schema, authenticated Web routes or
MCP transport. The CLI demo and existing integration tests exercise those real
application services. Demo acceptance must not be represented as full-platform
production acceptance.

The only scenario is a fictional ExampleCorp recruiter reply. The agent's
suggestion is preset, explicitly labeled, and makes no model/API call. The only
admitted transition is `APPLIED` to `RECRUITER_CONTACT`. The resulting task is
`RESPOND_TO_RECRUITER`. No email, application or external operation is sent.

## Try the workflow

Open [the Jobs reference](https://agent-operations-demo.agentops-portfolio.workers.dev/reference/jobs).
Expand **Inspect engineering details** when testing the failure cases below.

1. **Record observation**: evidence is stored; lifecycle stays at version 1.
2. **Create proposal**: the suggested transition is recorded; state stays put.
3. Try **without approval**: the server returns `403 AUTHORITY_REQUIRED`.
4. Check the approval box, then **Approve & execute**: version becomes 2; one
   task and one receipt are committed with the admitted state.
5. **Retry the command**: the original receipt returns without another mutation.
6. **Submit stale proposal**: a separate proposal based on version 1 is rejected
   with `409 VERSION_CONFLICT`.
7. Refresh to verify persistence, inspect the JSON response, or reset the sandbox.

Rejected attempts and exact retries do not append audit events. Their responses
are visible in the browser; the server audit contains successful observations,
proposals and admission only. Reset clears that visitor's scenario and receipts.
Idempotency applies within a scenario, not across reset or session expiry.

## Isolation and retention

- The essential cookie is anonymous, random, `HttpOnly`, `Secure` and
  `SameSite=Strict`. It represents access to one synthetic sandbox, not a verified
  identity or production authorization grant.
- Same-origin POST checks, a custom request header, strict command validation,
  a 1 KiB action-body bound and a restrictive CSP constrain the public interface.
- There are no uploads, free-text fields, provider credentials, analytics,
  third-party scripts or access to the production database. Audit size is bounded
  to three events per scenario; there is one proposal pair, task and receipt.
- Sessions expire one hour after initialization, with a Durable Object alarm
  scheduled to delete their active data. Reset does not extend the deadline.
  Expired sessions cannot be read or mutated. Alarm delivery can be delayed;
  infrastructure logs and recovery backups follow Cloudflare's policies.
- Deployment does not change the account's billing plan. The demo requires only
  SQLite Durable Objects supported on the Workers Free plan. Public availability
  remains subject to the account's quotas; it has no uptime or unlimited-traffic
  guarantee. No model inference is billed.

## Local development and verification

Use Node.js 24. From the repository root:

```text
npm ci --prefix demo
npm --prefix demo run types
npm --prefix demo run typecheck
npm --prefix demo test
npm --prefix demo run dev
```

Open `http://127.0.0.1:8787` for the architecture, or `/reference/jobs` for the sandbox. Local state is under ignored `.wrangler/`.
Miniflare tests exercise the deployed Worker bundle and SQLite storage, including
concurrent exact retries, rejection without mutation, cross-session isolation,
runtime restart persistence, expiry, alarm cleanup and reset retention. Browser acceptance should cover component selection, the five illustrated stages,
play/pause, source links, no homepage API calls, the reference link and return path,
collapsed engineering details, and the walkthrough above at desktop and mobile widths, a disabled approval button
until confirmation, reload persistence, no horizontal overflow and no uncaught
script errors. The original repository test suite remains unchanged.

## Deployment

```text
cd demo
npm run build
npx wrangler deploy dist/worker.js --dry-run
npm run deploy
```

Wrangler authentication and the account's Workers subdomain are local deployment
prerequisites. No account identifier or credential is checked into this repo.
`npm run deploy` builds the HTML/CSS/JS into the Worker before uploading; do not
deploy the unbundled TypeScript entry directly, because its asset constants are
provided by `build.mjs`. The source entry in `wrangler.jsonc` supports generation
of typed Durable Object bindings. CI verifies the demo but does not automatically
deploy it or require deployment credentials.

Cloudflare references: [SQLite storage and transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/),
[Durable Object pricing and free-plan limits](https://developers.cloudflare.com/durable-objects/platform/pricing/).
