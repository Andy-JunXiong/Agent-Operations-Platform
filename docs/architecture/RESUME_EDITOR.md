# Nine-region resume editor

Public technical excerpt. Personal operations and deployment ledgers are excluded.
These contracts describe the code; they do not assert hosted-client or production acceptance.

## User interface

Route: `/workspace/job-search/resume`; navigation label: Resume.

| Region | Fields |
| --- | --- |
| 1 | Fixed name, enforced by the service |
| 2 | Editable headline |
| 3 | Fixed contact; original contact links retained in exports |
| 4 | Summary heading and text |
| 5 | Skills heading and six combined text areas (`Group name: content`); name automatically bold in preview/export, blank groups omitted |
| 6 | Section heading; three default projects, expandable to five; separate name, GitHub URL, Demo URL, link label and bullets |
| 7 | Experience heading; title/company, location, dates, overview and bullets per position |
| 8 | Certification heading and bullet list |
| 9 | Education heading; school, location, degree, dates and detail per entry |

Save is explicit. Unsaved input survives returning to the tab and request failures;
leaving with changes triggers the browser's native warning. Export is disabled until
changes are saved and checks the expected saved version. The sixth skill is blank
because the supplied template contains five groups. No factual skills are invented.


## Storage, authorization and initialization

Migration `016_resume_editor.sql` adds only `resume_documents`, keyed by workspace:
private DOCX BLOB, SHA-256, source URL, structured content, version, updating principal
and timestamp. Existing business tables are not rewritten; normal DB backups include
the resume. Synthetic fixtures contain no private resume content.

`GET /api/v1/job-search/resume` requires current session membership. Scoped POSTs to
`/resume` and `/resume/export` require same origin and session CSRF even with general
writes OFF. Export revalidates identity and saved version after conversion. One
export runs per web app process, with timeouts and temporary-file cleanup. Project
HTTP(S) URLs become hyperlinks; export never fetches those URLs.

Initialize once using the existing configured identity and private source file:

```sh
node dist/scripts/import-resume-template.js /private/reference.docx https://docs.google.com/document/d/FILE_ID/edit
```

The importer refuses to overwrite an initialized resume. It validates the reviewed
template's section markers and structure; arbitrary Word templates are unsupported.


## Export and rendering

The source controls A4 geometry, Arial fonts, margins, lists, rules, headers/footers
and page numbers. Only edited body slots and added project hyperlink relationships
change; all other package parts remain byte-identical. Default exports also apply
the approved leading-spacing correction below. Added projects clone source roles. Edited position/education
columns use right tabs at the original text width; project headings stay with their
first bullet. Content grows across pages without shortening or font shrinking.

Production PDF uses Python 3 and LibreOffice Writer with Liberation font fallback
and a per-export profile under a 128 MiB `/tmp` tmpfs. Font substitution can affect
line breaks. PDF conversion materializes collapsed margins between contiguous
imported list items and uses explicit right tabs for education columns, avoiding
overflow from the original runs of spaces. DOCX retains the approved Word layout.
See the [official PDF CLI filter documentation](https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html).
Optional Windows QA uses installed Word with `PAW_RESUME_WORD_PDF=true`.
`PAW_RESUME_PYTHON` and `PAW_RESUME_SOFFICE` select trusted operator executables,
never request-supplied commands.


## Behavior and compatibility

- Optional `sectionOrder` is a permutation of the nine canonical region keys.
  Missing order preserves the established template order. Existing entry arrays
  carry their own order; no SQLite migration is needed.
- Buttons move whole regions or entries. Navigation and numbering follow their
  positions. First/last movement is disabled; unsaved changes retain the existing
  preview/save/export behavior. Certification entries now have separate controls.
- Stable field indices preserve every entry's text and links through repeated
  moves and saves. Skills preserve their original name/content split when untouched.
  An older open editor omitting `sectionOrder` cannot erase an already saved order.
- Export moves complete XML regions after content replacement and retains the
  template's non-document parts, links, page properties and reference spacing.
  Reordering can naturally change pagination.
- Downgrade boundary: the preceding image's strict JSON reader cannot read a
  resume after its first custom section-order save. The cutover rollback target
  is valid for the unchanged pre-save database. After custom-order writes, use a
  forward correction retaining the new reader/exporter; do not restore an old
  database or blindly switch to the preceding image. Backups remain recovery
  evidence, not permission to discard subsequent user edits.

