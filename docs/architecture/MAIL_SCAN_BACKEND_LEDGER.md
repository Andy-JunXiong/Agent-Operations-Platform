# Backend-managed mail scan receipts

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Tool contract and compatibility

| Operation | Backend-mode contract |
| --- | --- |
| `workspace_start_mail_scan` | Existing authorized write; add `receiptMode: "BACKEND"`. Keep a stable UUID `runId` for retries. Stores original authority/origin, both configured account bindings, fixed cutoff and bounded scope before fetching Gmail. Does not itself fetch mail. |
| `workspace_next_mail_batch` | Same bounded acquisition inputs. Stores run-to-batch acquisition, page cursor, IDs, body completeness and source identity. Existing recent/backfill lanes and seven-day policy remain. |
| Seven existing business tools | Optional `scanContext: {runId, batchId, messageId, actionKey}` attaches each attempted action to a completely read, pending source. The original command still checks business authority, evidence, expected versions, privacy and idempotency. |
| `workspace_ack_mail_batch` | Backend items require `verified: true`, `requiredActionKeys: []` or the actual required keys, and `projectId` for relevant mail. Failed/pending attempts and absent required actions block acknowledgement. Conflicting application associations also block it. |
| Automatic settlement | After next/ack, both completely processed mailbox ranges cause backend receipt/checkpoint settlement. GPT supplies no totals or final coverage claim. |
| `workspace_close_mail_scan` | New explicit write for early closure, with existing user confirmation/authority plus a reason. Backend derives each mailbox's actual completeness; pending source work survives. Repeated closure reads the immutable result. |
| `workspace_get_mail_scans` / website | Read-only receipt and progress, including mode, fixed scope, heartbeat and expired-lease/unresolved-action diagnostics. Reads do not fetch Gmail or reap runs. |

The seven business tools are create/update application, record observation,
propose/admit transition, and create/update task. `actionKey` identifies one
source obligation. Successful keys cannot change operation or payload. Failed
attempts may be corrected under the same key/operation; attempt hashes and
statuses remain. Changed business commands need appropriate idempotency keys.
Duplicate warnings and rejected proposals retain their original command results
and remain unresolved ledger actions.

Relevant acknowledgements query persisted account-qualified Gmail evidence for
the selected application. `RECORDED` requires an actual new scoped evidence
insert; a previously stored observation uses `EXISTING`. Excluded advertising
uses `IRRELEVANT`, explicit confirmation and no business actions. Classification,
matching and the assertion that all necessary actions/readbacks are included
remain GPT responsibilities; the backend cannot independently prove semantic
correctness or detect a necessary action that was never declared or attempted.

Omitting `receiptMode` preserves `LEGACY`; its existing start/finish/next/ack
contracts remain. Manual finish cannot override a backend run. The workspace
serializes scans while a backend run is active; finish an existing legacy run
before opting in. Unresolved backend source actions cannot be skipped by a
later legacy acknowledgement. Ordinary business writes without `scanContext`
are not attributed to a backend run just because their timestamps overlap it.
Saved task prompts are unchanged: opt in only after deployment and refreshed
tool discovery, with actual authorization in the target environment.

All ledger-affecting tools retain explicit write metadata. The existing hosted
`workspace_start_mail_scan` refusal is unresolved. This functional redesign is
not a renamed retry or proof of platform recovery; a refused write must stop.


## Persistence and recovery

Migration 012 adds six ledger tables and four scoped capture triggers; it
does not rewrite historical runs, queues or business rows. The write scope
exists only inside a synchronous SQLite transaction. Actual application,
Gmail evidence and task inserts, and admissions excluding the initial `NONE`
transition, are linked to the action/run/source in that same transaction.
Replays and ordinary concurrent writes do not produce new counts. Minimal
result IDs and request hashes are saved, not mail bodies or command payloads.

An action intent is durable before the business transaction. Exceptions roll
back business rows, idempotency rows and captured effects together, leaving a
failed attempt. Source obligations follow mailbox/message identity across runs
and clipped replacement batches. Completed receipts retain their original
write ownership; new runs do not reclaim previous inserts.

The inactivity lease is 30 minutes, refreshed by authorized processing. It is
not evidence that a worker is currently alive. Reads expose `EXPIRED` without
writing. A new authorized backend start closes expired runs as PARTIAL, with
no timeout-derived checkpoints, before resuming retained work under a new UUID.
Late source responses are rechecked against the running lease before persistence.
No background timer or task configuration was added.

Complete mailbox ranges and a receipt commit atomically. Early closure can
preserve one proven mailbox checkpoint while the other remains partial.
Exclusions older than seven days remain visible and never count as scanning.
Exact acknowledgement retries, including after automatic completion, are
read-only replays. A closed run cannot accept new business actions.


## Body-part contract

- The server remains at 30 tools. workspace_next_mail_batch adds optional
  bodyContinuation={batchId,messageId,bodyVersion,offset}; the same tool, run,
  mailbox, lane and authorization continue one source. No arbitrary new source
  can be read through this parameter. The caller must use the returned object.
- Every read returns at most 24,000 UTF-16 characters, preserving surrogate pairs.
  bodyPage includes version, offset, end, totalCharacters, nextOffset and
  sourceComplete. The SHA-256 version binds the extraction revision, full text
  and extraction issue set. Input and traversal limits remain in force.
- BODY_TOO_LONG describes bounded delivery, while bodyPage.sourceComplete
  distinguishes a fully extracted long source from missing/unsupported content.
  Only a fully extracted long source receives a batch bodyContinuation.
- Migration 013 adds mail_body_read_progress with owned batch/source references,
  run ID, version, total length and contiguous next offset. No body is persisted.
  Partial reads keep mail_scan_batch_items.body_complete=0, preserving existing
  business-write and acknowledgement guards, including when rolling back to r3.
- A continuation cannot skip past saved progress, change source/batch/mailbox/lane,
  reuse another run's reads, or access processed/expired sources. Earlier parts
  can replay without moving the frontier backwards. Changed or failed source
  reads invalidate the pending proof and require an ordinary first-part reread.
- On complete contiguous delivery, the batch response sets bodyReadProgress.complete,
  bodyComplete and processable true and removes only BODY_TOO_LONG from aggregate
  diagnostics. Its text still contains only that response's part. The caller must
  review all parts in that execution before any business write or ack. The backend
  never performs classification or automatic source acknowledgement.
- workspace_read_mail_message adds optional bodyOffset/bodyVersion for read-only
  diagnostics. A standalone tail remains bodyComplete=false and cannot satisfy
  batch proof. A new run or lost caller context requires a first-part reread.


## Delivered behavior

- Start with BACKEND and searchMode=JOB_METADATA. The server snapshots companies
  from owned applications (including closed ones), exact senders linked by verified
  relevant acknowledgements, query text and per-mailbox time bounds. Subject
  keywords include job/jobs, interview/interviews, application/applied/applying,
  assessment, offer, recruiter/recruitment and Chinese job terms. They remain in
  every run so new applications can be discovered.
- Gmail performs the subject/sender query first. For returned IDs, the server reads
  Subject/From metadata and checks literal subjects or exact sender addresses.
  Query operators cannot be injected through application company metadata.
  Only matches get a full-body request. Nonmatches are recorded as scope exclusions,
  never IRRELEVANT acknowledgements or proof of full-body review.
- Metadata stores only mailbox-qualified source ID, thread, subject, exact sender,
  timestamp and an optional verified application association; no body is retained.
  The association is learned on successful relevant ack with projectId. Existing
  evidence that retained only sender domains is not falsely treated as an exact
  sender address; company/keyword matches can establish future associations.
- Normal scope starts 24 hours before cutoff. If an earlier stream frontier is
  unfinished, it extends only as far as cutoff minus 72 hours. A new run snapshots
  a fresh query/window and supersedes active older batches as EXPIRED; source,
  acknowledgement and receipt rows remain intact. Previously acknowledged IDs
  are skipped. Unacknowledged matching sources are acquired again within the new
  scope. Excluded older time ranges never become successful coverage.
- RECENT handles each mailbox's complete fixed search window; BACKFILL is a completed
  compatibility lane. Completion derives from both RECENT scopes and action/ack
  checks and is labelled MATCHING_JOB_MAIL_ONLY in the receipt and reporting UI.
  Once a workspace starts this mode, new whole-mailbox runs are rejected.
- Migration 014 adds only job_mail_search_runs, job_mail_metadata and
  job_mail_screening. Historic tables and records are not rewritten by migration.
  Mode activation changes query progress only through an authorized start tool.
- The public contract remains 30 tools. Start adds searchMode; ping exposes
  mailSearchContract job-mail-search-v1, migration 014, normalHours=24,
  maxLookbackHours=72 and metadataFirst=true. Refreshed actual tool discovery remains
  required. Both maintained prompts now use the new mode and preserve business
  sections 2-4; saved scheduler settings have not been changed.

