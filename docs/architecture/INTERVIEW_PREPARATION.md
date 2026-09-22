# Evidence-backed interview preparation

Status: implemented public source milestone, September 22, 2026. This contract
describes the platform code and synthetic evidence. Account-specific preparation
reports, private deployment records and real interview outcomes are not published.

September 23: [explicit JD completeness](APPLICATION_DOSSIER_WORKFLOW.md#explicit-jd-completeness--september-23)
adds accurate summary/unknown citation labels and a qualified host instruction.
Historical labels use the retained source snapshot; the derived completeness
warning alone does not invalidate unchanged legacy source hashes. Explicit source
corrections still do. The affected public tests, type checks and build passed.

## Continuity and benefits

### Upstream requirement

The [application context](APPLICATION_PREPARATION_CONTEXT.md) supplies the saved
dossier and an exact working resume. A preparation also needs its own result,
source basis and correction history to remain useful after a conversation ends.
The [core workflow](CORE_JOB_WORKFLOW.md) keeps interpretation with the AI host
and admission/persistence with the platform.

### Current package

Two MCP tools read and save cited interview questions, advisory answer outlines,
source snapshots and numbered revisions. The application page displays the same
record and provides a copyable host instruction. Existing Resources and
idempotency storage are reused; no migration, model call, fetcher or scheduler
is introduced. Saving preparation does not alter lifecycle, Tasks, shared library
facts or actual-submission confirmations.

### Downstream enablement

This enables a caller to prepare from selected evidence, save with the current
input/version checks, reopen the result and append a real user correction. A
deployed account still needs connector discovery, material-completeness and
real-use acceptance. The optional public sandbox does not implement this flow.

### Short-term benefits

Synthetic checks exercise exact quote validation, stale-command rejection,
idempotent retries, source retention, historical reads and escaped Web rendering.
Missing material remains visible instead of being converted into a claim about
the person's ability.

### Long-term benefits

The same preparation and its original basis can survive later conversations and
source changes. Better interview outcomes and host interoperability require their
own evidence; persistence and valid quotations do not establish those outcomes.

## Read and save

`workspace_get_interview_preparation` requires an exact `projectId`. Default reads
return the latest preparation and its retained inputs. `preparationVersion` reads
one exact version. History returns ten metadata entries; pass
`history.nextBeforeVersion` as `historyBeforeVersion` for the next page.

`includeContext=true` additionally returns current inputs and `inputHash`. A sole
application-linked working copy is selected automatically. Multiple working
copies require an exact `resumeVariantId`; selection is never inferred from
recency. Missing JD/copy content permits explicitly qualified general practice,
with server-observed omissions retained.

Use `workspace_get_skill_library` to select up to 30 additional `sourceIds`.
Current catalog evidence and visible CONFIRMED sources are included automatically.
The combined snapshot is bounded to 100 sources and 600,000 canonical JSON
characters. Unavailable/excluded sources are explicit; the selection is not a
claim that the whole library was reviewed.

`workspace_record_interview_preparation` requires an authenticated MCP invocation
following the user's explicit request to prepare/save or correct that application.
The caller sends the report, exact selection, `expectedInputHash`,
`expectedPreparationVersion`, `supersedesPreparationId`, authority reference and
stable idempotency key. A confirmation field describes the actual user request;
it cannot manufacture authority. Web writes through this command are rejected.

The transaction verifies ownership, prior version and current input hash, checks
the report/quotations, and inserts the report, snapshot and replay receipt.
Identical retries return the original result; changed content with a reused key
fails. Corrections require a previous preparation and retain the actual user
statement/reference. Read older correction pages before revising.

## Evidence and persistence limits

- Each question has a unique ID, question, exact saved-JD quotation or null,
  EVIDENCED/PARTIAL/UNKNOWN support, source quotations, advisory answer outline
  and limitations. A saved JD field may itself be a summary; the caller must
  preserve that distinction and must not describe it as a complete original JD.
- EVIDENCED and PARTIAL require exact quotations from selected working-resume
  content or library text. UNKNOWN has no citations and requires a limitation;
  PARTIAL also requires a limitation. This proves traceability, not semantic
  entailment, actual personal contribution or independent factual verification.
- Provider `workspace-interview-preparation`, NOTE type and contract
  `interview-preparation-v1` identify these Resources. Saved facts retain version,
  predecessor, report, correction, selection/hash and principal attribution.
  The evidence snapshot retains the dossier, exact working copy, separately
  confirmed submissions, selected sources and omissions.
- The API appends versions and exposes no update/delete path. Generic
  `workspace_record_observation` rejects the reserved provider/contract. There is
  no database-level immutability trigger protecting direct administrative writes.
- Source updates yield STALE while retaining saved inputs. Read clocks, Tasks and
  unrelated history do not invalidate a preparation. CURRENT means consistency
  with the selected sources, not complete material or validated model judgment.

## Implementation and synthetic evidence

- [Domain schemas and quotation checks](../../src/domain/interview-preparation.ts)
- [Transactional preparation service](../../src/application/interview-preparation-service.ts)
- [MCP tools](../../src/mcp/create-server.ts)
- [Application-page display](../../src/web/interview-preparation-view.ts)
- [Ten synthetic integration cases](../../tests/integration/interview-preparation.test.ts)
  with an [explicitly synthetic fixture](../../tests/helpers/interview-preparation-fixture.ts)

The cases cover database reopening, replay, current/prior version conflicts,
fabricated quotations, missing materials, scoped authority, reserved-provider
bypass, resume selection, retained corrections/history, source changes, Web
escaping and MCP invocation. Publication validation is recorded in
[engineering evolution](../HISTORY.md#september-22-interview-preparation).
Synthetic corrections are test inputs, not claims about real user feedback.
