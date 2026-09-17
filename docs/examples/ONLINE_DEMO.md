# Interactive portfolio sandbox

**[Launch the public sandbox](https://agent-operations-demo.agentops-portfolio.workers.dev)**

## Continuity and benefits

The [platform positioning](../architecture/AGENT_OPERATIONS_PLATFORM.md) and
[synthetic lifecycle walkthrough](SYNTHETIC_DEMO.md) explain the implementation,
but previously required a local checkout to experience it. This package adds an
anonymous browser journey through observation, proposal, explicit approval,
admission, exact retry and stale-write rejection.

The immediate benefit is a directly reviewable portfolio experience; the durable
benefit is a reproducible, isolated demonstration of the lifecycle boundaries.
Publication requires the demo tests, public-data scan, existing release checks
and a live browser walkthrough. Real provider integration, full-platform hosting
and acceptance of additional agent hosts remain separate work.

## What actually runs

The `demo/` project is a separate Cloudflare Worker. Each anonymous visitor gets a
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

Open `http://127.0.0.1:8787`. Local state is under ignored `.wrangler/`.
Miniflare tests exercise the deployed Worker bundle and SQLite storage, including
concurrent exact retries, rejection without mutation, cross-session isolation,
runtime restart persistence, expiry, alarm cleanup and reset retention. Browser acceptance should cover
the walkthrough above at desktop and mobile widths, a disabled approval button
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
