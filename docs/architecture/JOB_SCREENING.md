# Recoverable candidate screening

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Executable boundary

[`screenJob`](../../src/domain/job-screening.ts) accepts validated structured input:

- Full saved JD text and an explicit full-review assertion. Exact quotation checks
  establish text attribution, not semantic accuracy or completeness.
- A positive profile version and per-category tenure evidence. `lowerYears` means
  at least that much established experience; `upperYears: null` means additional
  experience remains unknown. A confirmed shortfall requires an attributable upper
  bound below the requirement. No adding overlapping jobs or converting professional,
  consulting, software, AI/ML or direct-management categories into one another.
- Optional explicit tenure exclusions with a user-preference statement/reference.
  These can filter an unwanted career requirement without inventing a negative fact.
  Ambiguous engineering cannot be an exclusion category.
- Required, preferred or uncertain clauses, each with exact JD text, the host's
  separate interpretation and one or more alternatives. Alternatives are OR;
  separate clauses are AND. Compound conditions must be extracted accordingly.
- Non-tenure condition comparisons for location, work rights, clearance, specialist
  direction, qualifications, tools and compensation. Known outcomes need evidence;
  missing evidence stays UNKNOWN. Evidence references are caller-supplied here;
  persistence validates them against owned, versioned confirmed source records.

Output contains `ruleVersion`, `profileVersion`, overall decision, per-clause rules,
source quotes, candidate evidence and FACT/PREFERENCE/UNKNOWN basis. Alternatives
remain inspectable. The integration implements `recoverable: true` through retained
history and explicit overrides. `matchGrade` remains null: screening
does not assign or replace the separate A+ through B− assessment.


## Decision rules and limits

1. Incomplete full-JD review or no extracted requirements produces
   `USER_CONFIRMATION_REQUIRED`, even if provisional findings contain a blocker.
2. A satisfied alternative prevents another alternative from excluding the clause.
   An unknown alternative prevents a definitive exclusion; retain it for confirmation.
3. Preferred gaps can only deprioritize. Uncertain importance requires clarification
   before exclusion. Job titles alone never enter the rule engine.
4. Explicit tenure exclusions apply only to the same unambiguous category and at or
   above the user-specified threshold. They are preference evidence, not capability facts.
5. Confirmed same-category shortfalls at required SWE 8+ years, AI/ML engineering
   5+ years or direct people management 3+ years filter. Other confirmed tenure
   shortfalls deprioritize; broad experience requirements do not become SWE gates.
6. Confirmed mandatory location/work-rights/clearance/specialist/qualification
   mismatches filter. Tool and compensation gaps only deprioritize. Salary units,
   super inclusions, remote-location options, equivalent credentials and clearance
   exceptions must be interpreted upstream; ambiguity remains UNKNOWN. The evaluator
   does not make legal eligibility determinations or infer citizenship.
7. Across mandatory clauses, a conclusive FILTER takes precedence over confirmation,
   then DEPRIORITIZE, then EVALUATE. All findings remain available for review.

The supplied private career profile and compensation thresholds are deliberately
not embedded in this public repository. The profile must be attributable Workspace
data before live use. Facts described as merely unverified must not be imported as
confirmed absence, and assistant-generated memory summaries do not verify themselves.


## Integrated storage, commands and recovery

Migration [`020_candidate_screening.sql`](../../db/migrations/020_candidate_screening.sql)
adds `candidate_screenings` and `candidate_screening_overrides`; both have immutable
history triggers and Workspace/candidate/version uniqueness. Screening stores exact
input manifest, JD/profile/source snapshots, explicit profile source ID, evaluator
input/result, human-readable reason, provenance, actor and authority reference.
Profile version is the selected confirmed library source's actual record version;
it is not an unvalidated caller-created profile counter.

The [service](../../src/application/candidate-screening-service.ts) reuses assessment
input selection/fingerprints through `CandidateAssessmentService.inputs`, including
confirmed sources. A saved JD and available selected sources are required. All
candidate-evidence statements must be exact quotes from selected CONFIRMED sources,
with their source IDs as references. A missing base resume alone does not block
screening on a confirmed location or preference; letter grading retains its own
base-resume completeness rule. Input/snapshot bodies are each bounded at 600,000
characters, with at most 100 selected sources. Substring validation establishes
attribution, not whether an interpreted number/category is semantically correct.

| Entry | Contract |
| --- | --- |
| Existing `workspace_get_job_candidate` | `includeAssessmentContext` and `sourceIds` provide fresh source/body/manifest reads; default response now also carries a lightweight screening summary. |
| `workspace_record_candidate_screening` | Interactive MCP-only, explicit user authority, current candidate/screening versions, exact input manifest and confirmed profile source/version. Server derives the decision; caller-supplied decisions/grades are rejected. |
| `workspace_get_candidate_screening` | Current summary/report plus ten-item screening and override histories. Exact `version` returns immutable source snapshots; `beforeVersion` and `overrideBeforeVersion` independently page history. |
| `workspace_override_candidate_screening` | Explicit KEEP or AUTOMATIC withdrawal, fresh candidate/screening/override versions, idempotency and actual user authority. A new screening never resets KEEP. |
| `POST /api/v1/job-search/library/candidates/:id/screening-override` | Existing mapped session, same-origin and CSRF enforcement. Strict button intent/versions; server provides the authority reference. Remains available with general Web writes off, like scoped candidate decisions. No Web screening-generation endpoint is added. |

Writes are transactional with operation-scoped, principal-bound idempotency.
Changed payloads under one key or stale versions produce zero writes. Exact replay
returns the historical write result; callers read again for current validity.

`JobSearchQueryService` receives the screening projection from Workspace service
wiring. Web and MCP lists apply it before pagination and total counts. The
`screening` query is VISIBLE (default), FILTERED or ALL, independently combined with
decision, linkage, search and sorting. Current FILTER results are hidden only if
there is no KEEP override and the candidate is not SAVED. Explicit saved interest
also preserves visibility. KEEP does not undo a separate DISMISSED decision; its
decision filter remains meaningful.

Candidate identity, JD, base resume, selected sources, curated library or rule-version
changes make the prior screening STALE and visible again. The original report and
override history remain intact. Queries/overrides do not mutate candidate decisions,
application state, Tasks, submissions or letter-grade assessments. The shared query
streams matching candidates and computes exact totals; it is not constant-cost
pagination, and large-inventory performance is not claimed as accepted.

Jobs now offers “已筛除（可恢复）”, current/stale/unscreened labels, quoted reasons,
paginated history, a persistent keep button and explicit withdrawal. The original
candidate remains accessible by exact ID regardless of visibility. These controls
change list eligibility only; they never delete a job or submit an application.


## Admission contract

`workspace_record_screening_profile` accepts the exact user-confirmed `content`,
`expectedProfileVersion`, `userConfirmed`, `authorityReference` and `idempotencyKey`.
It writes only the dedicated `screening:confirmed-profile` library source with a
server-controlled title, null source URL and CONFIRMED status. It cannot select or
confirm an arbitrary imported source, and Web-channel calls are rejected.

First read candidate assessment context. `sourceDirectory.items` now includes
`sourceKey`, identifying the dedicated profile; page the directory when necessary.
Use version 0 for initial creation and the observed version for updates. Read the
existing profile before presenting a replacement to the user. UNKNOWN experience
and explicit exclusion preferences must remain distinct; neither memory nor a JD
grants confirmation. This endpoint records user attestation, not independent proof
of career facts or semantic verification of what was said in a conversation.

The response returns `sourceId`, `recordVersion`, a manifest-compatible `hash`,
CONFIRMED status, the exact source snapshot and confirmation actor/reference/time.
The existing durable idempotency receipt stores that snapshot atomically with the
source write. A retry returns the original receipt even after later edits; changed
payloads conflict. A stale expected version fails before modifying the library.
The existing library Web editor retains its versioned editing contract; confirmation
receipts preserve the original snapshot, not an assertion that the current source
has never changed. No schema migration is needed.

After any save/replay, reread `workspace_get_job_candidate` with assessment context
and the returned source ID. The new confirmed source is discoverable and selected;
its change invalidates earlier library/input manifests and assessments. Never submit
the pre-save manifest. Existing screening snapshots preserve their historical inputs.
Source confirmation does not itself screen a candidate, change a KEEP override,
alter candidate decisions, or create applications/Tasks.


## Command and consistency contract

`workspace_record_candidate_job_description` accepts candidateId,
expectedCandidateVersion, expectedJdHash, text, sourceUrl, fullTextProvided,
provenanceReference, userConfirmed, authorityReference and idempotencyKey.
Read `workspace_get_job_candidate(includeAssessmentContext=true)` first. Echo the
candidate's recordVersion and inputManifest.jdHash; null means no saved nonempty
JD. There is no independent JD recordVersion. The existing content/source-URL hash
is the concurrency token, so changes by the existing Web/discovery writers are
also detected. Returning to identical content/URL is treated as the same input.

Only mapped interactive MCP identity and explicit user authority are admitted.
Full text is bounded at 50,000 characters; an HTTP(S) source URL and provenance
reference identify acquisition and association with the candidate. Completeness
is an explicit caller assertion, not server proof of page authenticity, correct
role association or full extraction. JD text remains untrusted source evidence.
The command makes no network request and cannot confirm a profile or create a job.

The atomic durable receipt preserves the exact saved JD, manifest-compatible jdHash,
candidateVersion and principal/channel/authority/provenance/time attribution.
Conflicting keys or stale candidate/JD inputs make zero writes. Exact retries return
their historical snapshot even after replacement: always reread current context
after saving/replaying before screening. Candidate version/decision, profile,
overrides, applications and Tasks remain unchanged. Changed JD text or source URL
invalidates old screening and match-assessment inputs; existing screening snapshots
and explicit KEEP survive. Legacy JD writer contracts are unchanged.

