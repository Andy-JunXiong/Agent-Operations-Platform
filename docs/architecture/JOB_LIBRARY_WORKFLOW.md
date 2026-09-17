# Proactive job discovery and interview library

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Evidence and scoring

- Model output must cite exact JD and source substrings. Unsupported citations,
  duplicate requirement labels and unsupported resume passages are rejected.
- Required requirements weigh 3; preferred requirements weigh 1. MATCH earns the
  full weight, PARTIAL half, UNKNOWN zero. Coverage counts requirements with usable
  evidence. These are advisory evidence-based metrics, never hiring probabilities.
- Open conflicts suppress the score. Explicit confirmed corrections supersede only
  their specific historical fact. Positioning headlines are not employment titles.
- All nonexcluded sources are considered within a 600,000-character request bound.
  Whitespace-equivalent source duplicates are suppressed for analysis; originals
  remain stored. Oversized inputs fail explicitly, without silent truncation.
- Library changes invalidate previous fit scores/downloads. Automatic alert refresh
  does not overwrite existing drafts. Explicit reanalysis checks both library and
  draft versions after the provider returns.
- The first generated draft is an evidence selection, not a finished designed PDF.
  Users review factual context and edit before applying. Provider semantic judgement
  still requires review; exact-quote validation alone cannot prove a skill match.


## Integration and authority

Gmail queries are bounded to seven days, LinkedIn/SEEK sender domains and job-alert
subject keywords, with at most ten messages per provider in each mailbox. Sender metadata is checked
before reading targeted bodies for posting URLs. Other mail is not read by this
flow. Listing/body limits and mailbox failures are reported, not treated as full coverage.
HTTP 204 empty list responses are reported separately as unverified coverage;
they neither prove no matching mail nor imply authorization failure.
At most ten postings are handled per run. Only when external matching is authorized
and enabled can three previously unassessed jobs with usable JDs be automatically
compared, with further jobs compared individually. Current runs only save sources.
New links are prioritized on subsequent imports. Known application posting URLs
are excluded, including closed applications. No alert enters application timelines.

Job-labelled SEEK email tracking links may be resolved through two exact official
tracking hosts, at most twenty links per run. Unsubscribe/preferences links are
excluded. Redirects outside those hosts and canonical posting paths are rejected.
When an official job-labelled tracking link cannot resolve, its title, company and
original alert URL are still saved as an unverified candidate with no posting ID.
This preserves a useful reference without inventing a destination or JD. Exact alert
URLs deduplicate; different unresolved URLs are not assumed to represent the same
posting merely because titles match.
For JD fetches, only canonical HTTPS LinkedIn/SEEK posting paths are allowed; redirects must
retain the same provider and posting identity. Responses are bounded and require
one substantive JSON-LD JobPosting. Login walls, unavailable structured data and
blocked pages produce missing JD, not fabricated matches. Website access is not
guaranteed. Existing daily application-mail automation is unchanged; this discovery
button is not a newly scheduled background subscription.

All browser writes require the mapped Workspace session, same origin and CSRF token.
Routes under `/api/v1/job-search/library` expose only source preparation, candidate
decisions, fit/draft preparation and alert discovery. General web writes stay off.
No email is sent and no application is submitted by this feature.

Migration 015 adds four empty tables and an active-run uniqueness index. The CLI
`import-job-library` imports a separately transferred private JSON artifact with
optimistic versions, one transaction and source-by-source readback. Source documents
and user-specific corrections must never be committed to this public repository.

