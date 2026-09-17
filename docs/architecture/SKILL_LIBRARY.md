# Skill and project evidence library

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Data and admission

- Reuse `job_library_sources` and `idempotency_records`; no migration.
  `skills:catalog` stores validated `skill-library-v1` JSON, at most 50,000
  characters, 100 skills/facts and 30 projects. Stable IDs, aliases, usage summaries,
  project links and SUPPORTED/UNKNOWN/CONFLICT statuses are explicit.
- Supported skills and all projects cite exact quotes, source IDs, versions and
  hashes. Summaries/contributions remain GPT interpretations, not independent proof
  of authorship or human confirmation. The catalog stays SOURCE. Confirmed screening
  facts/preferences remain in their existing separate source.
- `reviewedSources` declares review of the current effective directory (maximum
  100). Admission verifies coverage/versions, not that GPT actually read every word.
  Duplicate canonical names/IDs and broken project links are rejected; semantic
  synonym merging remains GPT's responsibility.
- Adding, excluding or changing a source makes coverage stale. Changed supporting
  evidence identifies affected skills. Identical GitHub snapshots do not change
  library versions. Historical reports keep original sources.
- Generic source writers cannot overwrite managed `skills:` or `github:` keys.
  Uploaded/Drive text imports use stable `import:` keys and stay SOURCE. Text
  acquisition is caller-attributed; no fabricated extraction or automatic confirmation.
- Writes require explicit authority, CAS and principal-bound idempotency. Exact
  retries return historical receipts; reread current state after replay. Source
  updates and receipts commit atomically. Reads/references remain workspace-scoped.


## GitHub refresh

`workspace_refresh_github_project` registers/refreshes a public repository and 1–8
selected text paths. Each new request checks default-branch HEAD. Unchanged commit
and paths reuse evidence; new commits read all selected files at that SHA. Changed
path selection also requires capture. The UI exposes commits, capture/check times,
paths and failures. This is selected-file evidence, not a full-repository audit.
Technology does not establish personal contribution, proficiency or SWE tenure.

The reader uses fixed `https://api.github.com`, rejects redirects/unsafe paths,
and bounds the total deadline to 30 seconds, responses to 200 KB, files to 30 KB,
and total text to 38,000 characters. Binary, missing, oversized, private or
inaccessible files produce FAILED receipts while retaining prior sources. There is
no execution, checkout or credential access. Underlying operations follow the
[GitHub commit API](https://docs.github.com/en/rest/commits/commits) and
[contents API](https://docs.github.com/en/rest/repos/contents).

Refresh occurs on user/GPT command, not read-only page GET. The JD prompt requires
refresh before each analysis; the server does not independently prove that every
model run invoked it. No scheduled execution acceptance is claimed. Retries replay
the original check; a new check needs a new key. A failed check must be reported,
not described as latest evidence.


## Tools and matching

Four additions bring MCP inventory to **40**:

| Tool | Purpose |
| --- | --- |
| `workspace_get_skill_library` | Catalog/stale state, paged directory, selected full sources and GitHub receipts |
| `workspace_record_skill_source` | Attributable uploaded/Drive text import; no external document write |
| `workspace_record_skill_library` | Save synthesis with current coverage and exact evidence |
| `workspace_refresh_github_project` | Check/register a repo and save commit-pinned selected files |

Candidate context includes the catalog and supporting sources in the existing
manifest and immutable snapshot. With a catalog present, new match evidence must
use `kind=SKILL`, `skillId`, catalog `sourceId` and exact skill summary. Unsupported,
conflicting or stale skills cannot substantiate MATCH/PARTIAL. Unknown requirements
retain UNKNOWN with no invented evidence. Education/experience facts have distinct
categories; screening still uses the separately confirmed profile.

A catalog supports matching without a base resume. The legacy base-resume context
and hash remain for old contracts; old reports keep their original display.
Raw-source matching remains available when no catalog exists, while the new prompt
requires constructing the catalog first. Updated catalog/source versions invalidate
previous report inputs.

The library separates skills/projects, GitHub sources and raw documents, with a
copyable synthesis prompt and CSRF-protected GitHub form. The JD prompt sequences
refresh → synthesis → fresh context → screening → skill matching → saved readback.
Reports show skills/projects first, original evidence in a disclosure. Candidate,
KEEP, application and Task state is preserved.


## Current contract (supersedes baseline per-JD refresh instructions)

- Website order: **GitHub projects and updates → My skills and projects → raw
  documents**. Per-repo checks stay with their source. Check-all runs existing
  scoped single-project writes sequentially, continues after failures, shows counts
  and individual outcomes, and retains failed sources. Buttons save source evidence;
  the adjacent GPT instruction performs semantic skill updates.
- Existing catalogs use `workspace_record_skill_library(updateMode=MERGE)`.
  `catalog` contains only changed skill/project upserts, actually reviewed changed
  source references and added limitations. The server retains all unaffected
  entries/coverage/limitations, drops coverage for sources no longer effective,
  then validates the complete merged result. Exact stale evidence must be repaired,
  not silently assigned a new hash. `changes` identifies added/updated/removed
  sources without requiring every old resume body again.
- REPLACE remains for initialization/complete deliberate correction, but cannot
  silently omit existing IDs. Removals require explicit `removeSkillIds`/
  `removeProjectIds` and `removalReason`; automated GitHub prompts prohibit these.
  Empty catalogs are rejected. Identical content retains source version/hash while
  saving an attributable command receipt. Preceding-release idempotency hashes
  remain compatible when new controls are omitted.
- `workspace_get_job_candidate(contextView=SKILLS, includeAssessmentContext=true)`
  returns JD, catalog, confirmed sources and exact manifest without duplicate raw
  resume bodies. `contextView=MANIFEST` returns compact current write inputs after
  evidence review; FULL retains old behavior. All views share admission inputs;
  projections change neither evidence snapshots nor hash checks. This mitigates
  oversized responses; it is not proof of the prior client's exact failure cause.
- JD prompts reuse CURRENT and stop for independent maintenance when stale or
  missing. They do not refresh GitHub or rewrite the skill library. Recent check
  times/failures are disclosed; absent daily checks do not establish missing ability.
- Daily GPT prompt checks registered repos, saves receipts, merges only affected
  GitHub evidence, and does no catalog write when there is no source difference.
  Missing/invalid catalog or unrelated document changes are reported for manual
  maintenance. No catalog initialization, removals, screening or match-report writes.
  CURRENT means source consistency, not personal confirmation or whole-repo audit.

