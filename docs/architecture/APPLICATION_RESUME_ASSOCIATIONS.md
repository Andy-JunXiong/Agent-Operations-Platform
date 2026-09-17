# Application resume associations

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## Operator procedure

1. Read the exact existing Workspace application. For new automatic application
   registration, first follow the submission-confirmation rule in
   [the core workflow](CORE_JOB_WORKFLOW.md). A CV filename or recruiter request
   is not confirmation that the user applied.
2. Read `workspace_get_project.resumeAssociations` first. It returns the current
   record for each file/revision even if it is outside the latest ten Resources.
   Reuse prior explicit confirmation; do not repeatedly ask the user or search
   all of Drive for a known file. Respect dismissed candidates.
3. For missing materials, search the user's observed Resume folder by company
   and role in the filename, using metadata before file contents. Prefer precise
   company+role matches. A distinctive role-only match is a candidate with the
   missing company evidence stated. Generic role matches, cover letters and files
   for companies without an application must not be silently associated.
4. Fetch/list Drive revisions for the selected file ID. Preserve the actual ID,
   filename, MIME, observed modification time, revision ID and revision time.
   Unknown fields stay null. A timestamp is not a revision ID. A PDF and DOCX are
   separate files; same basename does not prove equal content or submitted format.
5. Persist a `CANDIDATE` when the filename supplies the association. Current Drive
   contents and timestamps do not prove what was submitted earlier. If the current
   revision postdates the application, say so and retain version uncertainty.
6. If The user says "this is the resume I submitted for this company/role", save the
   attributable statement and the identified file as `CONFIRMED_FILE`. Use
   `CONFIRMED_VERSION` only when that statement or a submission record identifies
   the exact revision. Merely reading today's revision does not identify the
   historical submitted version. Resolve only the remaining ambiguity.
7. Read back the saved association. For changes, read current state and append a
   new observation superseding its Resource ID. Preserve prior observations.
   A newer revision is a new candidate; it does not replace an older confirmed
   submitted version. Dismiss mistaken associations with a reason.
8. For interview work, retrieve the confirmed revision explicitly. The ordinary
   Drive browser link opens current content. If a saved revision is unavailable,
   report this and do not substitute the current file as if it were historical.

The folder identity is private operational data retained with the live source
links; do not publish personal file IDs or resume content in repository examples.


## Existing-tool contract

No migration or extra MCP tool is required. Use `workspace_record_observation`:

- `resourceType`: `DOCUMENT`; `provider`: `google-drive-resume`.
- `externalId`: a unique observation/event ID, **not just the Drive file ID**.
  Reuse the same event ID and idempotency key when retrying that exact write.
  A later confirmation/correction needs a new event ID and idempotency key.
  The r3 follow-up below rejects reuse of an event ID with different content
  as `IDEMPOTENCY_CONFLICT`, even with a fresh idempotency key. An identical
  event with a fresh key still returns the saved historical Resource; it does
  not undo a subsequent correction. Read `resumeAssociations` for current state.
- `externalUri`: observed HTTPS Drive file or Docs document URL matching `fileId`.
- `observedAt`: the actual observation time; not the application date.
- `observedFacts` follows the strict schema below; extra fields are rejected.

```json
{
  "contractVersion": "job-application-resume-v0.1",
  "supersedesResourceId": null,
  "sourceFacts": {
    "fileId": "observed-file-id",
    "fileName": "Company Role Resume.pdf",
    "mimeType": "application/pdf",
    "modifiedTime": "2026-09-01T00:00:00Z",
    "revisionId": "observed-drive-revision-id",
    "revisionModifiedTime": "2026-09-01T00:00:00Z"
  },
  "interpretation": {
    "status": "CANDIDATE",
    "reason": "Filename matches company and role; actual submission is unconfirmed."
  },
  "confirmation": null
}
```

Status is `CANDIDATE`, `CONFIRMED_FILE`, `CONFIRMED_VERSION` or `DISMISSED`.
For either confirmation status, `confirmation` must contain `kind`
(`USER_STATEMENT` or `SUBMISSION_RECORD`), `reference` and `statement`, all
attributable to actually observed evidence. Schema validation requires these
fields; it cannot independently prove that an agent's statement is true. GPT
must ground them in the actual user instruction or submission record.
Candidate/dismissal confirmation is null. A confirmed version needs a non-null
revision ID. A correction must provide the current same-file/revision Resource
ID in `supersedesResourceId`; stale writes fail. Discovery cannot downgrade a
confirmed record to a candidate. Dismissal/correction history remains readable.

Original `job-application-profile-v0.1` records are retained and rendered as
legacy resume notes with unspecified confirmation provenance. JD/skill-match
profiles and resume associations do not overwrite one another.

