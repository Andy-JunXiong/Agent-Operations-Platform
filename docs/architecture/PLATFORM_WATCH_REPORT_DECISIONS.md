# Platform Watch report-to-decision contract

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Responsibility boundary

## Reading and concrete choices — September 10 follow-up

The user requests a plain-language narrative and decisions comparing named PAW
functions/architecture choices, including the short- and long-term effects of
change and no change. The editorial example (historical operational reference omitted)
is retained as presentation history. The later
source-based revision (historical operational reference omitted) and
Watch writing reference require freshly checked official publications, release
dates and adjacent source links before deriving PAW choices. Existing `body`,
`recommendation` and `nextStep` fields carry prose and small comparison tables;
the persistence schema and decision transitions are unchanged.

The website renders an inert Markdown subset (paragraphs, headings, emphasis,
lists, code, bounded tables and HTTP(S)/fragment links), escaping raw HTML and
omitting image/embed behavior. Provenance is folded under source details. Finding
buttons refer to the stated recommendation; rejecting it does not authorize its
alternative. Edited advice is imported as a new snapshot referencing the original,
without rewriting or silently deciding the original findings. A revised repository
Skill alone does not update a weekly task pinned to an older version.

ChatGPT and its scheduled task remain responsible for running the Watch and
delivering the report. PAW stores only an explicitly imported snapshot and the
user's later dispositions. The website is the initial interaction surface; the
underlying Workspace database remains authoritative for the imported record.

The ownership check is:

1. Report scheduling and model execution are generic platform capabilities.
2. The existing ChatGPT task already provides them for this scenario.
3. PAW is still needed for the domain-specific link between immutable findings,
   explicit user authority, optimistic versions and later readback.
4. Revisit this storage if the target platform provides durable, exportable,
   per-finding decisions with equivalent provenance, isolation and recovery.

This contract does not establish a generic governance engine. It supports one
named Watch workflow and does not add a second scheduler or agent runtime.


## Ingestion contract

`POST /api/v1/job-search/platform-watch` is available only through a verified,
authenticated Web request with CSRF protection. The JSON body contains:

- stable `externalId`, title, generation time and original report URL;
- optional evidence cutoff and exact 40-character repository SHA;
- one directional judgment: `NO_DRIFT`, `NARROW`, `EXPAND` or `REPOSITION`;
- immutable summary/body text;
- one to twenty uniquely keyed findings, each with direction, verification,
  recommendation, next step and bounded HTTP(S) evidence links;
- a UUID `intentKey` for safe retry.

The server validates and normalizes the payload. A repeated intent with identical
content replays its original result. The same external ID with changed content is
rejected. Identical canonical content under another ID resolves to the existing
report. There is no report update or delete endpoint in P0.

Reports and findings are Workspace-scoped. Imported text is escaped on render;
source and evidence links are restricted to HTTP(S). The import request has a
256 KiB transport limit, while individual fields and finding counts have tighter
schema bounds.


## Decision contract

`POST /api/v1/job-search/platform-watch/:reportId/findings/:findingKey/decision`
requires:

- `ACCEPT`, `REJECT`, `DEFER` or `REOPEN`;
- the finding's expected positive `recordVersion`;
- a non-empty rationale;
- a UUID `intentKey`.

A pending finding can be accepted, rejected or deferred. A decided finding must
be reopened before another disposition. Every valid change increments the finding
version and appends an immutable audit row containing prior/new state, rationale,
Web channel, principal, explicit-user authority reference and timestamp. Replayed
intents return the original result; stale versions fail without a partial write.

The report list, report detail and decision history are readable from authenticated
Web/API routes. Today shows pending Watch findings after daily application updates.
The alert is attention only: it does not create a Task, accept a direction or run
the proposed next step.


## Storage and migration

Migration 017 adds:

- `platform_watch_reports`: immutable source identity and canonical hash;
- `platform_watch_findings`: independently versioned current disposition;
- `platform_watch_decisions`: append-only human decision history.

All foreign keys point into the existing Workspace/principal model. Existing MCP
tools and their contracts are unchanged; the inventory remains 30 tools.

