# Sandbox Agent Authority Design

> Historical decision/design context. Personal AI Workspace, PAW and Workspace product references use the former name. See [current product terminology and capability boundaries](AGENT_OPERATIONS_PLATFORM.md). Original proposals and acceptance limits remain scoped as written.

Status: proposed design, not an implemented or production-approved authority model.
Design version: `paw-sandbox-authority-v1`, 2026-09-16.
Audited baseline: `039a15c32f2beab6717881838fbed81099f76639`.

## Continuity and benefits

The user authorized starting the bounded vNext development package after the repository
review and its follow-up corrections. The upstream requirements are the
[core workflow](CORE_JOB_WORKFLOW.md), the existing
[Skills boundary](WORKSPACE_SKILLS_LAYER_PROPOSAL.md), and explicit separation of
capability, user authority and domain admission. This package supplies a concrete
design; it does not change any accepted runtime permission or enable a new client.

The next independent package is the
read-only Watch experiment (historical operational reference omitted). That
experiment needs isolation, not this grant implementation. A later PAW-connected
client needs a reviewed authority contract and synthetic security tests first.
Immediate value is a command-specific migration specification; reduced incidents
and multi-client portability are expected long-term benefits, not measured results.

Ownership check: sandboxing, identity protocols and credential storage are generic
runtime capabilities; mapping authorized intent to PAW objects and admission is
domain-specific. The baseline evidences a private MCP tunnel and authenticated Web
sessions, not a portable delegated-agent grant mechanism. Reuse a supported runtime
or identity provider where its actual authentication and isolation are verified.
Do not build a general IAM platform, scheduler or agent runtime. Revisit any custom
broker when a platform offers equivalent scoped identity, revocation and audit;
domain admission remains independently necessary. These are proposed boundary
changes, subject to the existing Watch/ADR gate before implementation or cutover.

## 1. Baseline findings and non-goals

The baseline has 40 MCP tools, not 40 orchestration graphs. Relevant implementation:

| File | Finding that this design addresses |
| --- | --- |
| [MCP registrations](../../src/mcp/create-server.ts) | Schemas, explicit-user assertions, descriptions and seven mail-action wrappers coexist in the adapter. |
| [MCP transport](../../src/mcp/http-app.ts) | Calls one configured service; the route itself does not implement delegated client grants. |
| [Request context](../../src/application/request-context.ts) | Verifies workspace ownership; channel is `WEB` or `MCP`. |
| [Workspace service](../../src/application/workspace-service.ts) | Configured MCP identity, lifecycle admission, CAS, transactions and idempotency. |
| [Web authentication](../../src/auth/web-auth-app.ts) | Session-derived identity; scoped Web writes additionally validate origin/CSRF. |
| [Assessment schema](../../src/domain/candidate-match-assessment.ts) | `provenance.assessor` is the literal `CHATGPT`. |
| [Mail ledger](../../src/application/mail-scan-ledger.ts) | Source progress and operation correlation are part of write semantics. |

`userConfirmed=true` and a reference preserve an attributable caller assertion.
They do not independently prove a human approved a command. This finding does not
claim an anonymous public endpoint: the current
private tunnel boundary (historical operational reference omitted) remains relevant.
Web session/CSRF authority is distinct from model-supplied assertions.

No production code, endpoint, database schema, schedule, tool count, existing
Skill or credential changes are included. No RBAC hierarchy, arbitrary JSON write,
SQL endpoint, JWT implementation, automatic lifecycle admission or bulk migration
is proposed as the first increment.

## 2. Threat model and trust boundaries

Protect private evidence, tenant/object isolation, truthful versioned records,
human decisions, standing policy scope, credentials and immutable execution history.
Assume the model may obey injected source text, select the wrong object, fabricate
approval text, retry indefinitely, submit false provenance or lose its local state.
Assume a sandbox process can read everything granted to that process, including its
environment, accessible files and executable client code. An ID or model label
supplied by that process is not a verified identity.

| Component | Trust and responsibility |
| --- | --- |
| Model, generated commands, source documents, evidence repositories | Untrusted inputs; no authority to sign approvals or attest provenance. |
| Agent workload in sandbox | Potentially compromised; limited filesystem/network access enforced outside the workload. |
| Sandbox supervisor and network boundary | Trusted to enforce isolation and capture trustworthy execution telemetry. |
| Identity verifier, approval issuer and credential broker | Trusted to authenticate callers, issue narrow grants, enforce revocation and protect credentials. |
| PAW handlers, domain validation, transaction and persistence | Trusted to authorize the actual operation and admit only legal durable effects. |
| Authenticated human approval surface | Trusted to bind a displayed operation to an actual human action; source text is never this surface. |

The trusted computing base includes the supervisor/broker if relied upon, not just
the PAW process. Root compromise of this base and malicious human administrators
are outside the first implementation's protection claim; dependency patching,
backups and operator access remain operational requirements. Read access can leak
private data even with no mutation access: resource and egress scopes matter.

Agent selects and interprets evidence. PAW verifies provenance, integrity and
admission requirements. Matching a repository's bytes does not prove its prose is
true, establish personal contribution or prove the model reviewed every word.

## 3. Minimal identity and execution context

Separate these concepts rather than treating transport as authority:

| Concept | Authoritative origin |
| --- | --- |
| Principal/workspace | Server mapping from authenticated identity; never caller-selected ownership. |
| Client identity | Registered authenticated client/broker identity, with allowed delegations. |
| Agent identity | Registered agent profile where verified; otherwise explicitly self-reported metadata. |
| Client surface | Web UI, ChatGPT, Codex, future CLI or other host; descriptive, not a permission. |
| Protocol | MCP or HTTP; not a permission and not synonymous with CLI/Web. |
| Run identity | Supervisor/broker-issued run record bound to client, workspace and policy; not a free-form execution claim. |
| Permission set | Server-resolved resource/command scopes, intersected with policy and grant. |
| Approval grant | Server-stored, revocable authorization for one intent or bounded run. |
| Command intent | Durable identity of the requested business operation, shared across adapters. |
| Request identity | Server-generated per transport attempt; distinct from intent and run. |
| Receipt | Immutable result of an admitted command, not a fresh state read. |

Conceptual internal context, not a public request body or implemented type:

```typescript
type VerifiedExecutionContext = {
  principalId: string;
  workspaceId: string;
  clientId: string;
  agentId: string | null;
  surface: string;
  protocol: "MCP" | "HTTP";
  runId: string | null;
  permissionSetId: string;
  grantId: string | null;
  requestId: string;
  provenance: VerifiedAndReportedExecutionMetadata;
};
```

Only authentication/authorization middleware constructs this context. Handlers
must not deserialize `permissionSetId`, principal or verified metadata from model
JSON. Do not relabel CLI as MCP. Retain old channel values as historical provenance
while moving operation checks to explicit permissions, one reviewed handler at a time.

## 4. Approval issuer and three initial authority modes

Use a PAW-owned authorization component with server-side opaque grant records.
An unguessable grant ID is a reference, not sufficient bearer authority. Validate
the authenticated client, audience, principal/workspace and applicable run on use.
Do not invent signing/cryptography or add a separate IAM service for this design.
If signed tokens are later selected, revocation and server-side policy checks are
still required; a signature alone is not the complete admission decision.

| Mode | Issuance | Example and restriction |
| --- | --- | --- |
| Scoped read | Authenticated human enables a named client's bounded reads, or an existing explicit policy delegates them. | Exact candidate/Today views; no mutation, no unrestricted private-source export. |
| Interactive command | User reviews a server-stored intent in an authenticated surface and confirms it. | Project X to INTERVIEWING at a specified version; immutable intent and approval reference. |
| Scheduled maintenance | User previously approves a versioned standing policy; a trusted supervisor authenticates a scheduled run and requests its limited run grant. | Check registered public repositories; optional evidence-backed MERGE under separately approved policy. No per-run human confirmation, no automatic scope expansion. |

A model may propose an intent but cannot invoke a human-confirmation endpoint with
its own credential. The approval screen renders escaped summaries from typed
intent fields, identifies object/version and displays affected effects. Approval
submission uses session/CSRF protections and validates that exact intent still
matches. Another host's approval UI can issue a grant only through a demonstrably
authenticated, scoped attestation; prose saying "approved" is insufficient.
The existing Web interface is the first design candidate for a future approval
surface, not a requirement to implement it during the Watch spike.

Standing policies name commands, resource selectors, maximum counts/bytes, allowed
source origins, permitted fields, start/end conditions and revision. They cannot
authorize confirming personal facts or lifecycle admission in the first increment.
Policy creation/expansion requires an authenticated human. Policy/run issuers cannot
delegate beyond their own scopes; revoking or tightening a policy invalidates old
unexecuted child grants. Existing production schedules are not converted here.

## 5. Grant record and binding choices

Proposed logical fields; storage migration is deferred:

```text
grantId, schemaVersion, issuer, principalId, workspaceId, audience
allowedClientIds, runId?, policyId?, policyVersion?
command, resourceScope, fieldConstraints, limits
intentId?, canonicalPayloadHash?, expectedVersions?
issuedAt, notBefore, expiresAt, usePolicy
status, revokedAt?, revocationReason?, consumedByReceiptId?
approvalEventId?, authorityKind
```

For interactive mutations, always bind workspace, exact object, typed command,
canonical payload hash, relevant version set and intent ID. Lifecycle binds the
proposal ID, target state, lifecycle version and referenced evidence identities.
An approval for creation does not permit duplicate override. An approval to propose
does not permit admission. A global workspace token is not an object-specific grant.

For standing policies, a run grant binds an immutable resource scope and policy
version. Individual writes still carry exact inputs and CAS versions. Do not freeze
one expected source version into a permanent daily policy; fresh run/command intents
are needed as sources change. Any wider repository/path selection requires policy
authority, not an Agent's assertion that the extra files are relevant.

Proposed initial defaults, subject to review before implementation:

| Grant | Lifetime / use |
| --- | --- |
| Read session/run | 15 minutes, reusable within explicit read scope and output quotas. |
| Interactive mutation | 10 minutes, one committed logical intent; run-bound when approval targets an existing run. |
| Scheduled run | 30 minutes maximum, reusable only for the run's permitted commands/quotas; no autonomous renewal. |
| Standing policy | Remains active until user expiry/revocation; prompt review after 90 days, not silent scope renewal. |

The server clock decides validity (`now < expiresAt`), including at mutation commit.
Long external fetches occur outside a write transaction and recheck authority,
policy, source scope and versions before persistence. For cross-interface delivery,
the issuer must explicitly permit the second authenticated client. Removing the
run/client binding in caller JSON does not make a grant portable.

## 6. Retry, concurrency, revocation and receipts

Authorization and domain validity are separate gates. A legal grant can authorize
an invalid lifecycle admission request, which must still be rejected without its
business effects. This does not remove the existing proposal command's ability to
persist a rejected proposal as history under its own authorized contract.

Define the new logical operation identity as `(workspaceId, canonicalCommand,
intentId)`. The first request binds it to a canonical typed payload hash, including
objects, expected versions and evidence commitments. Exclude transient request IDs,
transport, credential material and token expiry from that payload hash; record them
separately in attempt audit. Permission identity is still checked on every attempt.
Map the exposed idempotency key to that intent; never deduplicate natural-language
similarity. A changed payload with the same key is a conflict, not a correction.

For new execution, the shared handler performs:

1. Authenticate; resolve ownership and command schema; check operation permission.
2. Resolve the logical intent and prior receipt. Receipt access requires its own
   current object/read scope; authentication alone does not expose private results.
3. If already committed and the canonical payload matches, return the original
   receipt through the authorized replay/read path; perform no mutation.
4. Otherwise validate grant, audience, client/run, active policy, expiry and quota.
5. In one transaction, recheck grant/policy and versions, enforce domain admission,
   execute the complete operation, consume intent/grant quota and store receipt.
6. Return that immutable receipt. A separate read returns current durable state.

The future implementation must serialize revocation, grant consumption and business
commit against the same authority state. For the single PAW database design, use a
write transaction/reservation and conditional updates; a concurrent revoke committed
first must prevent execution. A revoke after commit cannot undo an already admitted
effect. Remote grant storage would require a separately designed fencing protocol;
do not assume a prior remote lookup makes this race safe.

| Situation | Required behavior |
| --- | --- |
| Timeout before commit | Retry identical intent/key/payload; execute only if still authorized. |
| Timeout after commit | Return original receipt with current read permission; no second effect or second grant consumption. |
| Grant expires/revoked before any commit | Reject execution; a fresh grant requires valid human/policy authority. |
| Grant expires/revoked after commit | No new effect; historical receipt may still be read if current read scope permits. |
| Stale version before execution | Reject; no business effect or grant consumption. Original grant cannot execute against a changed version. |
| User accepts refreshed state/payload | Create a replacement intent and grant; revoke/supersede old approval. Do not edit its payload or replay key. |
| Policy-authorized CAS conflict | Policy may allow reread/re-evaluation and a new intent within its scope; never silently expand scope. |
| Same intent through MCP and CLI | Same canonical handler and intent identity yield one receipt/effect; client delegation must independently allow both. |
| Two different intents happen to look similar | Do not infer equivalence; domain duplicate guards still apply. |
| Database commit/receipt insert fails | Roll back business writes and consumption together; attempt failure audit stays separate. |

Single-use means one logical committed effect, not one network attempt. An execution
receipt is not an approval grant and cannot authorize the next command. Fresh
readback may differ from a historical receipt after later legitimate changes.

## 7. Command policy matrix

All names below are current MCP tools with `workspace_` omitted. This is a proposed
future policy, not a change to present standing instructions or server behavior.

| Commands | Proposed authority and preserved boundary |
| --- | --- |
| All current read tools | Explicit scoped read capability; resource ownership, pagination/output limits and privacy apply. Gmail reads remain excluded from new sandbox clients. |
| `create_job_application`, `update_job_application` | Interactive exact intent initially. Any future mail-driven policy requires its separate Gmail review; duplicate override always separate. |
| `record_observation` | Scoped evidence-recording intent or narrowly approved ingestion policy; attribution never promotes source text to human-confirmed truth. |
| `propose_transition` | Exact interactive intent initially; durable proposal is a write, even without lifecycle change. |
| `admit_transition` | Interactive command grant; legal edges, evidence, versions, terminal closure and derived tasks remain server-owned. |
| `create_task`, `update_task` | Interactive grant initially; automatic derived tasks stay within their parent admitted transaction, not independent Agent writes. |
| `record_candidate`, `record_recommendation_run` | Interactive intent or explicitly approved recommendation policy; no application creation or save/dismiss decision. |
| `decide_candidate`, `link_job_candidate`, `override_candidate_screening` | Interactive exact object/decision grant; no recommendation-derived approval. |
| `record_candidate_job_description`, `record_skill_source` | Interactive import intent initially; actual text plus attributable acquisition, never automatic confirmation. |
| `record_screening_profile` | Interactive human confirmation of exact facts/preferences; no scheduled permission. |
| `record_candidate_screening`, `record_candidate_match_assessment` | Interactive analysis-save intent initially; manifest and citations validated, screening computed by server. |
| `refresh_github_project` | Interactive or registered-repository policy; pin commit, retain failures and independently verify selected content. |
| `record_skill_library` | Interactive or scoped maintenance policy; recurring use only MERGE/upserts on affected evidence, no entry removal, REPLACE or personal-fact confirmation. |
| `start_mail_scan`, `close_mail_scan`, `finish_mail_scan`, `next_mail_batch`, `ack_mail_batch` | Current paths retained. New sandbox permission denied pending P7; run scope, acquisition coverage and business correlation cannot be replaced by a grant. |

At this baseline, `update_job_application`, `record_observation` and
`propose_transition` have no independent `userConfirmed` input; `next_mail_batch`
and `ack_mail_batch` depend on standing scan state rather than a new confirmation.
`close_mail_scan` declares confirmation/reference fields at the adapter but invokes
ledger settlement without passing those fields to the method. This is an explicit
review point for future handler parity, not a claim of anonymous access.
Every mutation requires a defined policy even if its old schema lacked that field.

Existing authenticated Web task, candidate, resume/library and Watch decision
controls keep their own authority contracts. They are not exposed to sandbox
clients by reusing a cookie or manufacturing a Web request. Watch report generation
does not authorize report import or human finding disposition.

## 8. Credential and transport model

`pawctl`, if later justified, is a remote client only. It may not open SQLite or
import the server's service with a mounted database. Keep database/backups, Gmail
refresh/access tokens, tunnel keys, deployment credentials and model-provider keys
outside the Agent workload. A CLI executable or environment variable cannot hide
a secret from an equally privileged shell.

Prefer an authenticated supervisor/broker that exposes only scoped PAW requests.
If short-lived workload credentials are necessary, assume they are readable and
limit their audience, scope, expiry, resource set and network reach accordingly.
The broker must validate each operation; a generic authenticated HTTP proxy would
recreate ambient backend authority. Restrict egress and private-source outputs;
no PAW/admin, metadata-service, localhost or arbitrary forwarding destinations.

No claims are made here about a specific vendor's credential injection, approval
attestations or isolation. Those capabilities must be established for the chosen
runtime. No private runtime or credentials need to be provisioned to review this design.

## 9. Shared handlers, manifest and provenance evolution

Extract complete typed command semantics, not merely the final service call:
schema normalization, verified context, authorization, operation identity,
`mailScanLedger.action(...)` where applicable, domain call and immutable receipt.
Keep transaction ownership explicit; receipt/grant consumption must participate in
the same committed operation. Query handlers perform authorization and projection.
Do not introduce a generic arbitrary-JSON write or SQL interface.

Move FULL/SKILLS/MANIFEST projections from the MCP adapter to the shared query layer
only in P2 with parity tests. All three must preserve the same versioned input
commitment. A MANIFEST establishes input identity, not proof of human truth or
model reading. Retain strict source/hash/version checks and immutable snapshots.

Version the assessment report schema before allowing new assessors. Preserve v1
`assessor=CHATGPT` reports byte-for-byte. A v2 provenance envelope should distinguish
host, client, agent/runtime, model (nullable), run ID, procedure ID/version/hash,
generation time and source of each metadata assertion. Server-observed fields and
verified supervisor attestations must be distinct from caller-reported labels.
Never infer a historical model/version or rewrite old reports as if freshly verified.
Provider/model choice is provenance, not a different business operation.

## 10. Audit and migration

Record request/intent/receipt linkage, actor/workspace, client and run, command,
resource IDs, grant/policy/approval-event references, canonical input hash,
before/after versions, evidence manifest hash, outcome and rejection reason.
Model/Skill metadata includes verification status. Do not log credential values,
full raw email bodies, tokens or private payloads merely to debug authority.
Bound failed-attempt logs against flooding; failed attempts must not look like
committed business receipts. Operational security audit is not an Agent-authored fact.

Migration sequence:

1. Complete this design and the independently runnable Watch plan; no runtime change.
2. For a selected read-only PAW client, add request-scoped verified identity and
   bounded query permissions; retain current MCP and Web behavior.
3. Implement one interactive mutation in disposable fixtures, including approval
   issuance, atomic consumption, revocation and cross-adapter replay.
4. Introduce shared handlers incrementally, preserving every existing wrapper and
   error contract. Old tool aliases map to the same canonical operation.
5. Keep legacy receipt hash algorithms/versioning readable. Do not recompute old
   hashes with the new envelope. Establish explicit key/intent mapping on cutover;
   legacy grants are never inferred from stored prose.
6. Only after acceptance expose a bounded client path; keep runtime flags and
   independent credentials so it can be disabled/revoked without disabling old clients.

Any authority table/constraint migration is a future Level 3 change with full
applicable regression and copy-recovery gates. No dual-writing business effects
for comparison: exercise both adapters against separate equivalent fixtures.
Rollback disables/revokes the new path and preserves legitimate writes/history;
it does not restore an older database over newer business facts.

## 11. Acceptance cases and open decisions

Required synthetic cases before any new Agent mutation: missing/forged approval;
wrong client/run/audience/workspace/object; revoked/expired grant; legal grant with
illegal edge; missing/changed evidence; stale CAS; duplicate-override mismatch;
concurrent grant use; revoke/commit race in both orders; failure between write and
receipt; timeout after successful commit; cross-adapter same-intent retry; modified
payload with same key; policy scope expansion; no-source-removal maintenance rule;
historical receipt access after mutation grant expiry; revoked read access denied.

Observed unauthorized durable effects, cross-workspace mutations and credential
disclosures must each be zero in the test corpus. This is an acceptance criterion,
not a formal security proof. A credential-free Watch run cannot validate this model.

Open before implementation: chosen runtime and authenticated client mechanism;
availability of verifiable external approval events; user-facing approval surface;
final TTL/quotas; which single mutation to pilot; failure-log retention/access;
legacy idempotency mapping detail and future storage migration. Default remains
deny for new sandbox writes. None of these decisions blocks the public-source,
credential-free Watch experiment.

## 12. Development status

This package delivers design text only. No grants, credentials, new API, CLI,
runtime implementation or security test results exist as a result of this change.
Document validation and publication status are recorded with the paired
spike plan (historical operational reference omitted).
