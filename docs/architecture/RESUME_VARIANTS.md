# Named per-job resume versions

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Persistence and HTTP contract

Migration `018_resume_variants.sql` adds only `resume_variants` and its index. It
stores workspace, target ID, company/role snapshot, base source version, structured
content, own record version, creator/updater and timestamps. The existing private
base template is reused; initialization is already immutable. No private template
or generated file is committed to Git.

All routes use the existing authenticated workspace membership. Scoped mutations,
preview and export require the existing session, same-origin and CSRF authorization;
general Web writes remain disabled. UUID validation and workspace filtering apply
to every variant/target lookup. Conversion rechecks authorization and the selected
version after the asynchronous renderer returns.

| Route suffix under `/api/v1/job-search/resume` | Behavior |
| --- | --- |
| `/variants` GET | List this workspace's named versions |
| `/variants` POST | Create with name, targetType (`CANDIDATE`/`APPLICATION`), targetId, expectedBaseVersion and intentKey |
| `/variants/:id` GET / POST | Read / save selected copy; save uses existing content + expectedVersion contract |
| `/variants/:id/preview` POST | Render selected unsaved content without saving |
| `/variants/:id/export` POST | Export selected saved version as DOCX/PDF |

Creation and its idempotency receipt commit atomically. Exact intent/payload replay
returns the original result, including after subsequent edits. Changed payload
with the same key is rejected. Stale base creation and stale saves/exports fail
without changing content. Existing base routes retain their behavior.

Web routes are `/workspace/job-search/resume` and
`/workspace/job-search/resume/variants/:id`; base-page `candidateId` or `projectId`
query parameters preselect the create target. Authentication preserves variant
paths; target preselection may need to be repeated after a fresh login.

